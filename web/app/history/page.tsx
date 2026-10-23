"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface RequestLogEntry {
  id: string;
  reg_key: string;
  mode: string;
  prompt: string;
  response: string | null;
  provider: string | null;
  model: string | null;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  latency_ms: number;
  status: string;
  created_at: string;
}

interface UserHistorySummary {
  reg_key: string;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  requests_stored: number;
  requests: RequestLogEntry[];
}

export default function HistoryPage() {
  const [regKey, setRegKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<UserHistorySummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async (keyToFetch: string) => {
    const key = keyToFetch.trim();
    if (!key) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/history?reg_key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load history for this key.");
        setHistory(null);
      } else {
        setHistory(data.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("titan_last_reg_key", key);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Network error: ${msg}`);
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check URL params (?key=...) or localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get("key") || params.get("reg_key");
      const storedKey = localStorage.getItem("titan_last_reg_key");
      const initialKey = urlKey || storedKey || "";
      if (initialKey) {
        setRegKey(initialKey);
        fetchHistory(initialKey);
      }
    }
  }, [fetchHistory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(regKey);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " • " + d.toLocaleDateString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#e2e8f0] font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient light */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between pb-8 border-b border-slate-800/80 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0d1117] rounded-xl flex items-center justify-center font-mono font-bold text-cyan-400 text-lg">
                T
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-mono text-xl font-bold tracking-tight text-white">TITAN AI</h1>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Token Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-400">Request Inspection & Rolling 10-Item History</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
            >
              Admin Panel
            </Link>
          </div>
        </header>

        {/* License Key Search Form */}
        <div className="bg-[#0f141c]/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 mb-8 shadow-2xl">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={regKey}
                onChange={(e) => setRegKey(e.target.value)}
                placeholder="Enter 8-digit Registration Key (e.g. 12402879)"
                maxLength={8}
                className="w-full px-4 py-3 bg-[#090b10] border border-slate-700/80 rounded-xl font-mono text-sm text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
              {regKey && (
                <button
                  type="button"
                  onClick={() => setRegKey("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-mono"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !regKey.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-semibold text-sm hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Querying...</span>
                </>
              ) : (
                <span>Inspect Key</span>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center space-x-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Dashboard Content */}
        {history && (
          <div className="space-y-8 animate-fadeIn">
            {/* Aggregate Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0f141c]/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Tokens</span>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {history.total_tokens.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Recent 10 queries</div>
              </div>

              <div className="bg-[#0f141c]/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Prompt Tokens</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {history.total_prompt_tokens.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Sent input characters</div>
              </div>

              <div className="bg-[#0f141c]/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Output Tokens</span>
                <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                  {history.total_completion_tokens.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Generated code & answers</div>
              </div>

              <div className="bg-[#0f141c]/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Stored History</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {history.requests_stored} / 10
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Auto-rotated buffer</div>
              </div>
            </div>

            {/* Rotation Policy Notice */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Rotation Policy: Strict circular limit of 10 requests per user.</span>
              </div>
              <span className="text-slate-500 text-[11px]">Oldest auto-deleted on 11th request</span>
            </div>

            {/* List of Requests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Recent Request Log ({history.requests.length})
                </h2>
                <button
                  onClick={() => fetchHistory(history.reg_key)}
                  className="text-xs font-mono text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>↻ Refresh</span>
                </button>
              </div>

              {history.requests.length === 0 ? (
                <div className="text-center py-16 bg-[#0f141c]/40 border border-dashed border-slate-800 rounded-2xl text-slate-500 font-mono text-sm">
                  No requests recorded yet for key {history.reg_key}.
                </div>
              ) : (
                history.requests.map((req, idx) => {
                  const isExpanded = expandedId === req.id;
                  const isCode = req.mode === "code";
                  const isMcq = req.mode === "mcq";

                  return (
                    <div
                      key={req.id}
                      className="bg-[#0f141c]/90 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-700/80 shadow-lg"
                    >
                      {/* Summary Header */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/20 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                            #{history.requests.length - idx}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider border ${
                              isCode
                                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                                : isMcq
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                            }`}
                          >
                            {req.mode}
                          </span>

                          <span className="text-xs font-mono text-slate-300 truncate max-w-xs sm:max-w-md">
                            {req.prompt.split("\n")[0].slice(0, 60)}...
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 text-cyan-400 text-[11px]">
                            {req.tokens_total.toLocaleString()} tokens
                          </span>

                          <span className="text-slate-500 text-[11px] hidden sm:inline">
                            {req.latency_ms}ms
                          </span>

                          <span className="text-slate-500 text-[11px] hidden md:inline">
                            {formatTime(req.created_at)}
                          </span>

                          <span className="text-slate-500 text-xs">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Prompt & Response Content */}
                      {isExpanded && (
                        <div className="p-5 pt-0 border-t border-slate-800/80 space-y-4 bg-[#090b10]/60">
                          {/* Metadata row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 text-[11px] font-mono text-slate-400">
                            <div>Provider: <span className="text-slate-200">{req.provider}</span></div>
                            <div>Model: <span className="text-slate-200">{req.model}</span></div>
                            <div>Prompt Tokens: <span className="text-emerald-400">{req.tokens_prompt}</span></div>
                            <div>Output Tokens: <span className="text-indigo-400">{req.tokens_completion}</span></div>
                          </div>

                          {/* Prompt Section */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                                📤 What Was Sent (Prompt)
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(req.prompt, `${req.id}-prompt`);
                                }}
                                className="text-[10px] font-mono text-cyan-400 hover:underline"
                              >
                                {copiedId === `${req.id}-prompt` ? "✓ Copied" : "Copy Prompt"}
                              </button>
                            </div>
                            <pre className="p-3 rounded-xl bg-[#0d1117] border border-slate-800/80 text-slate-300 font-mono text-xs whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                              {req.prompt}
                            </pre>
                          </div>

                          {/* Response Section */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                                📥 What Was Received (AI Output)
                              </span>
                              {req.response && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(req.response || "", `${req.id}-response`);
                                  }}
                                  className="text-[10px] font-mono text-emerald-400 hover:underline"
                                >
                                  {copiedId === `${req.id}-response` ? "✓ Copied" : "Copy Output"}
                                </button>
                              )}
                            </div>
                            <pre className="p-3 rounded-xl bg-[#0d1117] border border-slate-800/80 text-emerald-300 font-mono text-xs whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                              {req.response || "(No response captured)"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
