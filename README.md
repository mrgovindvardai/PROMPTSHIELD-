# PromptShield

PromptShield is a local demonstration of prompt-injection screening. It combines a DeBERTa classifier and rule checks, compares protected and baseline Ollama replies, and provides benchmark, dashboard, and security-log pages.

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

Install and start [Ollama](https://ollama.com/download/windows), then download the demo model once:

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
Also you can access the deployed website on this link  which's server is operational on limited period.

## Benchmark files

In **Benchmark Tests**, select a `.txt` prompt list or a `.csv` containing a `Prompt`, `Text`, or `Input` column. A CSV may also include an `Expected` or `Label` column to calculate accuracy. Running the set sends prompts to protected screening and adds each check to the current in-memory security logs.

## Security and prototype limits

- Keep `PROMPTSHIELD_SECRET_KEY`, local environment files, and `backend24/promptshield_users.db` private. `.gitignore` excludes local databases and virtual environments.
- The default server command binds to `127.0.0.1`, for local use. Do not expose this development server publicly as-is.
- The classifier and rules are demonstration safeguards, not a guarantee of detecting every attack. Benchmark scores describe the selected test prompts only.
- Security logs are in memory and reset when the server restarts. Account data is stored in a local SQLite database.
- Model artifacts are downloaded into the local Hugging Face cache; they are not part of this repository.
