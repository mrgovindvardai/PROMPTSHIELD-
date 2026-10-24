# PromptShield

PromptShield screens text prompts for potential prompt injection. It combines a DeBERTa classifier and rule checks, compares protected and baseline Ollama replies, and provides benchmark, dashboard, and security-log pages.

## Project layout

- `backend24/` — FastAPI application, authentication, and classifier adapter.
- `prompt-injection-guard/frontend/` — static HTML, CSS, and JavaScript interface.
- `prompt-injection-guard/benchmark_prompts.txt` — example prompt set.
- `prompt-injection-guard/benchmark*.py` — local benchmark and latency utilities.
- `requirements.txt` — Python dependencies for the complete app.

## Run locally on Windows

Use Python 3.11. From the repository root in PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu --use-feature=truststore
.\.venv\Scripts\python.exe -m pip install -r .\requirements.txt
```

Install and start [Ollama](https://ollama.com/download/windows), then download the configured model once:

```powershell
ollama pull qwen3:1.7b
```

Set a fresh local signing key in the PowerShell window that will run the server. Keep this key private and do not commit it:

```powershell
$env:PROMPTSHIELD_SECRET_KEY = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Start the backend from the repository root:

```powershell
Set-Location .\backend24
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Open [http://127.0.0.1:8001/](http://127.0.0.1:8001/) in a browser. The first classifier use downloads its Hugging Face model and can take longer. Keep Ollama and the FastAPI server running while using the app.

Current temporary public demo:(https://breakdown-routes-requested-effort.trycloudflare.com/)](https://breakdown-routes-requested-effort.trycloudflare.com/). This link works only while the laptop, app server, internet connection, and Cloudflare tunnel are running. Restarting the tunnel may produce a different URL; if this one stops working, get the current URL from the running tunnel and update any form or message where you shared it. Anyone with the URL may reach the app, so use demo data only.

### Temporary public demo link

For a short demo, the local app can be shared through a Cloudflare Quick Tunnel. The public `trycloudflare.com` URL is temporary: it works only while the laptop, PromptShield server, internet connection, and tunnel are running. Restarting the tunnel can generate a different URL, so check the current URL and update any form or message where the previous URL was submitted. Do not treat this as a permanent deployment. See [Cloudflare Quick Tunnel instructions](CLOUDFLARE_QUICK_TUNNEL.md). Use demo data only; anyone with the URL can reach the app.

## Benchmark files

In **Benchmark Tests**, select a `.txt` prompt list or a `.csv` containing a `Prompt`, `Text`, or `Input` column. A CSV may also include an `Expected` or `Label` column to calculate accuracy. Running the set sends prompts to protected screening and adds each check to the current in-memory security logs.

## Security and usage limits

- Keep `PROMPTSHIELD_SECRET_KEY`, local environment files, and `backend24/promptshield_users.db` private. `.gitignore` excludes local databases and virtual environments.
- The default server command binds to `127.0.0.1`, for local use. Do not expose this development server publicly as-is.
- The classifier and rules can miss attacks. Benchmark scores describe the selected test prompts only and do not predict performance on all inputs.
- Security logs are in memory and reset when the server restarts. Account data is stored in a local SQLite database.
- Model artifacts are downloaded into the local Hugging Face cache; they are not part of this repository.

## Hosting notes

The checked-in configuration is for local use. Before hosting, configure `PROMPTSHIELD_SECRET_KEY` with a new private value and set `PROMPTSHIELD_COOKIE_SECURE=true` when HTTPS is enabled. The Ollama server and model can be selected with `PROMPTSHIELD_OLLAMA_URL` and `PROMPTSHIELD_OLLAMA_MODEL`; the account database location can be selected with `PROMPTSHIELD_DATABASE_PATH`.

The current full application needs memory for PyTorch and the DeBERTa classifier, plus a reachable Ollama server running `qwen3:1.7b` by default. It stores accounts in SQLite and security logs in process memory. A free hosting service with a small memory limit and ephemeral filesystem is not a reliable host for this full setup. Do not deploy it publicly until the model endpoint and durable account storage are configured for the selected host. The hackathon submission notice requires a Google Drive PPT view link and GitHub repository link; it says a live project URL is optional and does not require a database.
