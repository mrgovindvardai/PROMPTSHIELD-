const loginPage = document.querySelector("#login-page");
const loginForm = document.querySelector("#login-form");
const appShell = document.querySelector("#app-shell");
const logoutButton = document.querySelector("#logout-button");
const refreshLogsButton = document.querySelector("#refresh-logs");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginDescription = loginPage.querySelector(".auth-card-copy");
const loginTitle = loginPage.querySelector(".auth-card h2");
const loginSubmitButton = loginForm.querySelector('button[type="submit"]');
const pages = document.querySelectorAll("#app-shell .page");
const tabs = document.querySelectorAll("#app-shell [data-page]");

const sensitivity = document.querySelector("#sensitivity");
const sensitivityValue = document.querySelector("#sensitivity-value");
const protectedSensitivityUsed = document.querySelector("#protected-sensitivity-used");
const promptForm = document.querySelector("#prompt-form");
const promptInput = document.querySelector("#prompt-input");
const promptCount = document.querySelector("#prompt-count");
const clearPromptButton = document.querySelector("#clear-prompt");
const protectedStatus = document.querySelector("#protected-status");
const protectedScore = document.querySelector("#protected-score");
const protectedMeter = document.querySelector("#protected-meter");
const protectedReason = document.querySelector("#protected-reason");
const protectedOutput = document.querySelector("#protected-output");
const unprotectedOutput = document.querySelector("#unprotected-output");

const logsTable = document.querySelector("#logs-table");
const logsNote = document.querySelector("#logs-note");
const logsSearch = document.querySelector("#logs-search");
const logsFilter = document.querySelector("#logs-filter");
const benchmarkFile = document.querySelector("#prompt-file");
const benchmarkFileName = document.querySelector("#prompt-file-name");
const runBenchmarkButton = document.querySelector("#run-benchmark");
const benchmarkProgress = document.querySelector("#benchmark-progress");
const benchmarkSummary = document.querySelector("#benchmark-summary");
const benchmarkTable = document.querySelector("#benchmark-table");
const totalPrompts = document.querySelector("#total-prompts");
const blockedPrompts = document.querySelector("#blocked-prompts");
const flaggedPrompts = document.querySelector("#flagged-prompts");
const benchmarkAccuracy = document.querySelector("#benchmark-accuracy");
const dashboardNote = document.querySelector("#dashboard-note");
const protectedDonut = document.querySelector("#protected-donut");
const protectedDonutTotal = document.querySelector("#protected-donut-total");
const protectedLegend = document.querySelector("#protected-legend");

let authMode = "login";
let promptSet = [];
let recentLogs = [];

passwordInput.minLength = 12;
passwordInput.maxLength = 128;
passwordInput.autocomplete = "current-password";

const authModeButton = document.createElement("button");
authModeButton.type = "button";
authModeButton.className = "text-button auth-mode-button";
authModeButton.textContent = "Create an account";
const authMessage = document.createElement("p");
authMessage.id = "auth-message";
authMessage.setAttribute("aria-live", "polite");
loginForm.append(authModeButton, authMessage);

function setAuthMode(mode) {
    authMode = mode;
    authMessage.textContent = "";
    if (mode === "login") {
        loginTitle.textContent = "Sign in";
        loginDescription.textContent = "Continue to your PromptShield workspace.";
        loginSubmitButton.textContent = "Sign in";
        authModeButton.textContent = "Create an account";
        passwordInput.autocomplete = "current-password";
    } else {
        loginTitle.textContent = "Create your account";
        loginDescription.textContent = "Choose a password with at least 12 characters.";
        loginSubmitButton.textContent = "Create account";
        authModeButton.textContent = "Already have an account? Sign in";
        passwordInput.autocomplete = "new-password";
    }
}

function showLogin(message) {
    appShell.hidden = true;
    loginPage.hidden = false;
    authMessage.textContent = message || "";
}

function showWorkspace() {
    loginPage.hidden = true;
    appShell.hidden = false;
    showPage("playground-page");
}

function showPage(pageId) {
    pages.forEach((page) => { page.hidden = page.id !== pageId; });
    tabs.forEach((tab) => {
        const active = tab.dataset.page === pageId;
        tab.classList.toggle("active", active);
        if (active) tab.setAttribute("aria-current", "page");
        else tab.removeAttribute("aria-current");
    });
    if (pageId === "logs-page") loadLogs();
}

async function requestJson(path, options) {
    options = options || {};
    const response = await fetch(path, {
        credentials: "same-origin",
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(result.detail || "Request failed (" + response.status + ")");
        error.status = response.status;
        throw error;
    }
    return result;
}

function showExpiredSession(error) {
    if (error && error.status === 401) showLogin("Your session expired. Please sign in again.");
}

authModeButton.addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage.textContent = "";
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (authMode === "register" && password.length < 12) {
        authMessage.textContent = "Choose a password with at least 12 characters.";
        return;
    }
    loginSubmitButton.disabled = true;
    loginSubmitButton.textContent = authMode === "login" ? "Signing in…" : "Creating account…";
    try {
        await requestJson("/api/auth/" + authMode, {
            method: "POST", body: JSON.stringify({ email, password }),
        });
        loginForm.reset();
        setAuthMode("login");
        showWorkspace();
    } catch (error) {
        authMessage.textContent = error.message;
    } finally {
        loginSubmitButton.disabled = false;
        loginSubmitButton.textContent = authMode === "login" ? "Sign in" : "Create account";
    }
});

logoutButton.addEventListener("click", async () => {
    try { await requestJson("/api/auth/logout", { method: "POST" }); } catch (error) { /* session may have expired */ }
    loginForm.reset();
    setAuthMode("login");
    showLogin("You have signed out.");
});
tabs.forEach((tab) => tab.addEventListener("click", () => showPage(tab.dataset.page)));

sensitivity.addEventListener("input", () => {
    sensitivityValue.value = sensitivity.value + "%";
    sensitivityValue.textContent = sensitivity.value + "%";
});
promptInput.addEventListener("input", () => { promptCount.textContent = promptInput.value.length + " / 5000"; });
clearPromptButton.addEventListener("click", () => {
    promptInput.value = "";
    promptCount.textContent = "0 / 5000";
    promptInput.focus();
});
document.querySelectorAll(".example-chip").forEach((button) => button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt || "";
    promptCount.textContent = promptInput.value.length + " / 5000";
    promptInput.focus();
}));
promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        promptForm.requestSubmit();
    }
});

async function postPrompt(path, prompt, extraData) {
    const query = path === "/check-prompt" ? "?include_protected_reply=true" : "";
    return requestJson(path + query, {
        method: "POST", body: JSON.stringify({ prompt, ...(extraData || {}) }),
    });
}

function setProtectedStatus(status) {
    const normalized = String(status || "").toUpperCase();
    protectedStatus.className = "status-pill";
    if (normalized === "SAFE") protectedStatus.classList.add("status-safe");
    else if (normalized === "FLAGGED") protectedStatus.classList.add("status-flagged");
    else if (normalized === "BLOCKED") protectedStatus.classList.add("status-blocked");
    else protectedStatus.classList.add("status-neutral");
    protectedStatus.textContent = normalized || "Ready";
}

promptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    const sendButton = document.querySelector("#send-prompt-button");
    const sensitivityUsed = Number(sensitivity.value);
    sendButton.disabled = true;
    sendButton.setAttribute("aria-busy", "true");
    sendButton.textContent = "Checking prompt…";
    protectedSensitivityUsed.textContent = sensitivityUsed + "%";
    setProtectedStatus("Checking");
    protectedScore.textContent = "Calculating…";
    protectedMeter.style.width = "0%";
    protectedReason.textContent = "The protected model is reviewing this prompt.";
    protectedOutput.textContent = "Waiting for the safety decision…";
    unprotectedOutput.textContent = "Generating a baseline reply…";

    try {
        const results = await Promise.allSettled([
            postPrompt("/check-prompt", prompt, { sensitivity: sensitivityUsed }),
            postPrompt("/unprotected-chat", prompt),
        ]);
        const protectedResult = results[0];
        if (protectedResult.status === "fulfilled") {
            const result = protectedResult.value;
            const score = Number(result.injection_score);
            setProtectedStatus(result.status);
            protectedScore.textContent = Number.isFinite(score) ? score.toFixed(6) : "Unavailable";
            protectedMeter.style.width = Number.isFinite(score) ? Math.max(0, Math.min(100, score * 100)) + "%" : "0%";
            protectedReason.textContent = result.reason || "No additional reason was provided.";
            protectedOutput.textContent = result.protected_response || "No reply was generated because this prompt was flagged or blocked.";
        } else {
            const error = protectedResult.reason;
            setProtectedStatus("Unavailable");
            protectedScore.textContent = "—";
            protectedReason.textContent = "The safety check could not be completed.";
            protectedOutput.textContent = "Protected check failed: " + error.message;
            showExpiredSession(error);
        }
        const baselineResult = results[1];
        if (baselineResult.status === "fulfilled") {
            unprotectedOutput.textContent = baselineResult.value.response || "The model returned an empty reply.";
        } else {
            unprotectedOutput.textContent = "Could not get an unprotected reply: " + baselineResult.reason.message;
            showExpiredSession(baselineResult.reason);
        }
        await loadLogs();
    } catch (error) {
        protectedOutput.textContent = "Could not complete the request: " + error.message;
    } finally {
        sendButton.disabled = false;
        sendButton.removeAttribute("aria-busy");
        sendButton.innerHTML = '<span>Send prompt</span><span aria-hidden="true">↗</span>';
        promptInput.value = "";
        promptCount.textContent = "0 / 5000";
    }
});

function renderLogs() {
    const query = logsSearch.value.trim().toLowerCase();
    const decisionFilter = logsFilter.value;
    const logs = recentLogs.filter((log) => {
        const matchesText = String(log.prompt || "").toLowerCase().includes(query);
        const matchesDecision = decisionFilter === "all" || String(log.decision).toUpperCase() === decisionFilter;
        return matchesText && matchesDecision;
    });
    logsTable.replaceChildren();
    logs.forEach((log) => {
        const row = document.createElement("tr");
        const timeCell = document.createElement("td");
        const date = new Date(log.time);
        timeCell.textContent = Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
        const promptCell = document.createElement("td");
        promptCell.textContent = log.prompt || "";
        const scoreCell = document.createElement("td");
        const score = Number(log.score);
        scoreCell.textContent = Number.isFinite(score) ? score.toFixed(6) : "—";
        const decisionCell = document.createElement("td");
        const badge = document.createElement("span");
        const decision = String(log.decision || "").toUpperCase();
        badge.className = "status-pill " + (decision === "SAFE" ? "status-safe" : decision === "FLAGGED" ? "status-flagged" : decision === "BLOCKED" ? "status-blocked" : "status-neutral");
        badge.textContent = decision || "—";
        decisionCell.appendChild(badge);
        row.append(timeCell, promptCell, scoreCell, decisionCell);
        logsTable.appendChild(row);
    });
    if (recentLogs.length === 0) logsNote.textContent = "No prompts checked yet. Try Split Chat or run a benchmark.";
    else logsNote.textContent = "Showing " + logs.length + " of " + recentLogs.length + " protected-model checks. Logs clear when the server restarts.";
}

async function loadLogs() {
    try {
        const result = await requestJson("/api/logs");
        recentLogs = result.logs || [];
        renderLogs();
    } catch (error) {
        if (error.status === 401) {
            showLogin("Please sign in to view security logs.");
            return;
        }
        logsNote.textContent = "Could not load logs. Check that the backend is running.";
    }
}
refreshLogsButton.addEventListener("click", loadLogs);
logsSearch.addEventListener("input", renderLogs);
logsFilter.addEventListener("change", renderLogs);

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === '"' && quoted && text[index + 1] === '"') {
            cell += '"'; index += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            row.push(cell); cell = "";
        } else if ((char === "\n" || char === "\r") && !quoted) {
            if (char === "\r" && text[index + 1] === "\n") index += 1;
            row.push(cell); cell = "";
            if (row.some((value) => value.trim())) rows.push(row);
            row = [];
        } else {
            cell += char;
        }
    }
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
    return rows;
}

function normalizeExpected(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (["allow", "safe"].includes(normalized)) return "Allow";
    if (["flag", "flagged"].includes(normalized)) return "Flag";
    if (["block", "blocked"].includes(normalized)) return "Block";
    return "";
}

function parsePromptCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("This CSV has no prompt rows yet.");
    const headers = rows[0].map((cell) => cell.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
    const promptIndex = headers.findIndex((name) => ["prompt", "text", "input"].includes(name));
    const expectedIndex = headers.findIndex((name) => ["expected", "expected_result", "label"].includes(name));
    if (promptIndex < 0) throw new Error("CSV needs a Prompt, Text, or Input column.");
    return rows.slice(1).map((cells) => ({
        prompt: String(cells[promptIndex] || "").trim(),
        expected: expectedIndex >= 0 ? normalizeExpected(cells[expectedIndex]) : "",
    })).filter((item) => item.prompt);
}

function parsePromptText(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    const prompts = [];
    let current = null;
    const flush = () => {
        if (current && current.prompt.trim()) prompts.push({ prompt: current.prompt.trim(), expected: current.expected || "" });
        current = null;
    };
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const promptMatch = line.match(/^(?:\d+[.)]\s*)?(?:prompt\s*:\s*)(.*)$/i);
        const expectedMatch = line.match(/^expected(?:\s+result)?\s*:\s*(.*)$/i);
        if (promptMatch) {
            flush();
            current = { prompt: promptMatch[1], expected: "" };
        } else if (expectedMatch && current) {
            current.expected = normalizeExpected(expectedMatch[1]);
        } else if (current) {
            current.prompt += " " + line;
        } else if (!/^(?:[A-D]\.|section\b|test prompts\b|expected\b)/i.test(line)) {
            prompts.push({ prompt: line.replace(/^\d+[.)]\s*/, ""), expected: "" });
        }
    }
    flush();
    return prompts.filter((item) => item.prompt && item.prompt.length <= 5000);
}

function setDonut(items) {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    protectedDonutTotal.textContent = total ? String(total) : "—";
    const visible = items.filter((item) => item.count > 0);
    if (!total) {
        protectedDonut.style.setProperty("--donut-stops", "#e9efed 0 100%");
        protectedDonut.setAttribute("aria-label", "Protected model decisions not loaded");
    } else {
        let offset = 0;
        const stops = visible.map((item) => {
            const start = offset;
            offset += (item.count / total) * 100;
            return item.color + " " + start.toFixed(2) + "% " + offset.toFixed(2) + "%";
        });
        protectedDonut.style.setProperty("--donut-stops", stops.join(", "));
        protectedDonut.setAttribute("aria-label", "Protected model decisions: " + visible.map((item) => item.label + " " + item.count).join(", "));
    }
    protectedLegend.replaceChildren();
    if (!visible.length) {
        const empty = document.createElement("li");
        empty.className = "legend-empty";
        empty.textContent = "Run a prompt set to view decisions";
        protectedLegend.appendChild(empty);
        return;
    }
    visible.forEach((item) => {
        const entry = document.createElement("li");
        const swatch = document.createElement("span");
        swatch.className = "legend-swatch";
        swatch.style.backgroundColor = item.color;
        swatch.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = item.label;
        const value = document.createElement("span");
        value.className = "legend-value";
        value.textContent = item.count + " prompts";
        entry.append(swatch, label, value);
        protectedLegend.appendChild(entry);
    });
}

function renderBenchmarkResults(rows) {
    benchmarkTable.replaceChildren();
    rows.forEach((row) => {
        const tableRow = document.createElement("tr");
        const signal = row.score >= 0.5 ? "Higher" : "Lower";
        const comparison = row.expected ? (row.decision === row.expected ? "Match" : "Mismatch") : "No expected label";
        [row.prompt, row.expected || "—", row.decision || "Error", Number.isFinite(row.score) ? row.score.toFixed(6) : "—", signal, comparison].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            tableRow.appendChild(cell);
        });
        benchmarkTable.appendChild(tableRow);
    });
    const completed = rows.filter((row) => row.decision);
    const labeled = completed.filter((row) => row.expected);
    const correct = labeled.filter((row) => row.decision === row.expected).length;
    const accuracy = labeled.length ? (correct / labeled.length) * 100 : null;
    const expectedBlocks = rows.filter((row) => row.expected === "Block").length;
    const highSignals = completed.filter((row) => row.score >= 0.5).length;
    totalPrompts.textContent = String(rows.length);
    blockedPrompts.textContent = String(expectedBlocks);
    flaggedPrompts.textContent = String(highSignals);
    benchmarkAccuracy.textContent = accuracy === null ? "—" : correct + "/" + labeled.length + " (" + accuracy.toFixed(1) + "%)";
    dashboardNote.textContent = accuracy === null
        ? "Completed " + completed.length + " protected-model checks. Add expected labels to calculate benchmark accuracy."
        : "Protected decisions matched " + correct + " of " + labeled.length + " expected labels (" + accuracy.toFixed(1) + "%).";
    const counts = [
        { label: "Allow", count: completed.filter((row) => row.decision === "Allow").length, color: "#408567" },
        { label: "Flag", count: completed.filter((row) => row.decision === "Flag").length, color: "#d19a39" },
        { label: "Block", count: completed.filter((row) => row.decision === "Block").length, color: "#c6535c" },
    ];
    setDonut(counts);
    benchmarkSummary.textContent = "Finished " + completed.length + " of " + rows.length + " checks. " +
        (accuracy === null ? "No expected labels were provided, so accuracy is not calculated." : "Expected-label accuracy: " + correct + "/" + labeled.length + " (" + accuracy.toFixed(1) + "%).") +
        " Results and protected checks are now available in Security Logs.";
}

benchmarkFile.addEventListener("change", async () => {
    const file = benchmarkFile.files && benchmarkFile.files[0];
    if (!file) return;
    runBenchmarkButton.disabled = true;
    promptSet = [];
    benchmarkTable.replaceChildren();
    benchmarkSummary.textContent = "Reading prompt set…";
    try {
        const text = await file.text();
        promptSet = file.name.toLowerCase().endsWith(".csv") ? parsePromptCsv(text) : parsePromptText(text);
        if (!promptSet.length) throw new Error("No usable prompts were found. Check the file format and try again.");
        if (promptSet.length > 100) throw new Error("This file contains " + promptSet.length + " prompts. Choose a set of 100 or fewer; the backend keeps the latest 100 checks in Security Logs.");
        benchmarkFileName.textContent = file.name + " · " + promptSet.length + " prompts";
        benchmarkProgress.textContent = "Ready to check " + promptSet.length + " prompts with protected screening.";
        benchmarkSummary.textContent = "The selected file contains " + promptSet.length + " prompts. Select Analyze prompts to run them.";
        runBenchmarkButton.disabled = false;
    } catch (error) {
        benchmarkFileName.textContent = file.name;
        benchmarkProgress.textContent = "Choose a valid .txt prompt list or .csv with a Prompt column.";
        benchmarkSummary.textContent = error.message;
    }
});

runBenchmarkButton.addEventListener("click", async () => {
    if (!promptSet.length || runBenchmarkButton.disabled) return;
    runBenchmarkButton.disabled = true;
    runBenchmarkButton.textContent = "Analyzing…";
    const rows = promptSet.map((item) => ({ ...item, decision: "", score: NaN }));
    const sensitivityUsed = Number(sensitivity.value);
    benchmarkTable.replaceChildren();
    try {
        for (let index = 0; index < rows.length; index += 1) {
            benchmarkProgress.textContent = "Checking prompt " + (index + 1) + " of " + rows.length + "…";
            try {
                const result = await requestJson("/check-prompt?include_protected_reply=false", {
                    method: "POST",
                    body: JSON.stringify({ prompt: rows[index].prompt, sensitivity: sensitivityUsed }),
                });
                rows[index].decision = result.status === "SAFE" ? "Allow" : result.status === "FLAGGED" ? "Flag" : result.status === "BLOCKED" ? "Block" : String(result.status || "");
                rows[index].score = Number(result.injection_score);
            } catch (error) {
                rows[index].error = error.message;
                rows[index].decision = "";
                if (error.status === 401) {
                    showExpiredSession(error);
                    throw error;
                }
            }
            renderBenchmarkResults(rows.slice(0, index + 1));
        }
        benchmarkProgress.textContent = "Complete · " + rows.length + " protected-model checks";
        await loadLogs();
    } catch (error) {
        benchmarkProgress.textContent = "Run stopped: " + error.message;
        benchmarkSummary.textContent = "The run stopped early. Completed checks have been saved in Security Logs; refresh the logs to view them.";
        await loadLogs();
    } finally {
        runBenchmarkButton.disabled = false;
        runBenchmarkButton.textContent = "Analyze prompts";
    }
});

async function restoreSession() {
    try {
        await requestJson("/api/auth/me");
        showWorkspace();
    } catch (error) {
        showLogin("");
    }
}

setAuthMode("login");
restoreSession();
