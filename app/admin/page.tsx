"use client";

import { useState, useCallback } from "react";

interface LogEntry {
  id: string;
  time: string;
  action: string;
  status: "pending" | "ok" | "error";
  detail?: string;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() - 86_400_000);
    return d.toISOString().slice(0, 10);
  });

  const [arxivId, setArxivId] = useState("");
  const [paperDate, setPaperDate] = useState(() => {
    const d = new Date(Date.now() - 86_400_000);
    return d.toISOString().slice(0, 10);
  });

  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (action: string, status: LogEntry["status"], detail?: string) => {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString(),
        action,
        status,
        detail,
      };
      setLog((prev) => [entry, ...prev]);
      return entry.id;
    },
    [],
  );

  const updateLog = useCallback(
    (id: string, status: LogEntry["status"], detail?: string) => {
      setLog((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status, detail } : e)),
      );
    },
    [],
  );

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!token.trim()) return;
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        setAuthError("Invalid token");
      }
    } catch {
      setAuthError("Connection failed");
    }
  };

  const rerunDate = async () => {
    const id = addLog(`Rerun date: ${date}`, "pending");
    try {
      const res = await fetch("/api/admin/rerun-date", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) {
        updateLog(id, "error", data.error);
        return;
      }
      updateLog(id, "ok", `Run ID: ${data.runId}`);
    } catch (err) {
      updateLog(id, "error", String(err));
    }
  };

  const runPaper = async () => {
    const cleanId = arxivId.trim().replace(/^https?:\/\/arxiv\.org\/abs\//, "");
    if (!cleanId) return;
    const id = addLog(`Run paper: ${cleanId}`, "pending");
    try {
      const res = await fetch("/api/admin/run-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ arxivId: cleanId, date: paperDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        updateLog(id, "error", data.error);
        return;
      }
      updateLog(id, "ok", `Run ID: ${data.runId}`);
    } catch (err) {
      updateLog(id, "error", String(err));
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="CRON_SECRET"
            className="w-full px-4 py-3 rounded-md border border-[rgba(20,20,20,0.08)] bg-neutral-50 text-base focus:outline-none focus:border-[rgba(20,20,20,0.16)]"
            autoFocus
          />
          {authError && (
            <p className="text-sm text-red-600">{authError}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 rounded-md bg-neutral-900 text-white font-medium text-sm"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-[768px] mx-auto space-y-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Rerun Date</h2>
        <p className="text-sm text-neutral-600">
          Trigger the full daily papers workflow for a specific date.
        </p>
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-4 py-3 rounded-md border border-[rgba(20,20,20,0.08)] bg-neutral-50 text-base focus:outline-none focus:border-[rgba(20,20,20,0.16)]"
          />
          <button
            onClick={rerunDate}
            className="px-6 py-3 rounded-md bg-neutral-900 text-white font-medium text-sm shrink-0"
          >
            Run
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Single Paper</h2>
        <p className="text-sm text-neutral-600">
          Process one paper by arXiv ID. Accepts bare ID or full URL.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={arxivId}
            onChange={(e) => setArxivId(e.target.value)}
            placeholder="2405.12345 or https://arxiv.org/abs/2405.12345"
            className="w-full px-4 py-3 rounded-md border border-[rgba(20,20,20,0.08)] bg-neutral-50 text-base focus:outline-none focus:border-[rgba(20,20,20,0.16)]"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={paperDate}
              onChange={(e) => setPaperDate(e.target.value)}
              className="flex-1 px-4 py-3 rounded-md border border-[rgba(20,20,20,0.08)] bg-neutral-50 text-base focus:outline-none focus:border-[rgba(20,20,20,0.16)]"
            />
            <button
              onClick={runPaper}
              className="px-6 py-3 rounded-md bg-neutral-900 text-white font-medium text-sm shrink-0"
            >
              Run
            </button>
          </div>
        </div>
      </section>

      {log.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Log</h2>
          <div className="space-y-2">
            {log.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 rounded-md border border-[rgba(20,20,20,0.04)] bg-neutral-50 text-sm"
              >
                <span className="shrink-0">
                  {entry.status === "pending" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  {entry.status === "ok" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
                  )}
                  {entry.status === "error" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900">{entry.action}</p>
                  {entry.detail && (
                    <p className="text-neutral-500 truncate">{entry.detail}</p>
                  )}
                </div>
                <span className="text-neutral-400 shrink-0 font-mono text-sm">
                  {entry.time}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
