import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi import APIRouter, Cookie, HTTPException, Response
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, Field


SECRET_KEY = os.getenv("PROMPTSHIELD_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("PROMPTSHIELD_SECRET_KEY is not set.")

ALGORITHM = "HS256"
SESSION_COOKIE = "promptshield_session"
SESSION_HOURS = 8
DATABASE_PATH = Path(__file__).with_name("promptshield_users.db")
COOKIE_SECURE = os.getenv("PROMPTSHIELD_COOKIE_SECURE", "false").lower() == "true"

router = APIRouter(prefix="/api/auth", tags=["authentication"])
password_hasher = PasswordHash.recommended()


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)


def connect_database():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with connect_database() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


initialize_database()


def find_user(email: str):
    with connect_database() as connection:
        return connection.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()


def create_session(response: Response, user_id: int, email: str):
    expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
    token = jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expires},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        max_age=SESSION_HOURS * 60 * 60,
        path="/",
    )


@router.post("/register", status_code=201)
def register(credentials: Credentials, response: Response):
    email = credentials.email.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    hashed_password = password_hasher.hash(credentials.password)

    try:
        with connect_database() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash, created_at)
                VALUES (?, ?, ?)
                """,
                (email, hashed_password, datetime.now(timezone.utc).isoformat()),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="An account with that email already exists.",
        )

    create_session(response, user_id, email)
    return {"email": email}


@router.post("/login")
def login(credentials: Credentials, response: Response):
    user = find_user(credentials.email)
    if not user or not password_hasher.verify(
        credentials.password, user["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    create_session(response, user["id"], user["email"])
    return {"email": user["email"]}


@router.get("/me")
def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
):
    if not session_token:
        raise HTTPException(status_code=401, detail="Please sign in.")

    try:
        payload = jwt.decode(session_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Session expired. Please sign in.")

    with connect_database() as connection:
        user = connection.execute(
            "SELECT id, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Account not found.")

    return {"email": user["email"]}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        path="/",
    )
    return {"message": "Signed out."}