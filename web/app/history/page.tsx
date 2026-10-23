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
        setError(data.error || "Failed to load telemetry for this registration key.");
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
    <div className="min-h-screen bg-black text-[#f5f5f7] font-sans antialiased selection:bg-[#0a84ff]/30 selection:text-white">
      {/* Apple Specular Top Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#0a84ff]/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 ios-page-enter">
        {/* Apple macOS Chrome Header */}
        <header className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-8">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0c] border border-white/[0.12] flex items-center justify-center shadow-lg shadow-black/40">
              <span className="material-symbols-outlined text-[#0a84ff] text-[22px]">monitoring</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold tracking-tight text-white">TITAN AI</h1>
                <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
                  Token Telemetry
                </span>
              </div>
              <p className="text-xs text-[#86868b]">Circular 10-Item Rolling Request Buffer</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href="/admin"
              className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-[#86868b]">admin_panel_settings</span>
              <span>Admin Console</span>
            </Link>
          </div>
        </header>

        {/* Apple Search Field Card */}
        <div className="apple-glass rounded-2xl p-5 sm:p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#86868b]">
                <span className="material-symbols-outlined text-[18px]">key</span>
              </div>
              <input
                type="text"
                placeholder="Enter 8-digit Registration Key (e.g. 12402879)"
                maxLength={8}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl font-mono text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
                value={regKey}
                onChange={(e) => setRegKey(e.target.value.replace(/\D/g, ""))}
              />
              {regKey && (
                <button
                  type="button"
                  onClick={() => setRegKey("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#86868b] hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || regKey.length !== 8}
              className="apple-btn-primary px-6 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Querying…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">search</span>
                  <span>Inspect Key</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-[#ff453a]/10 border border-[#ff453a]/25 text-[#ff453a] text-xs flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Bento Grid Metrics */}
        {history && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="apple-glass rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#0a84ff]/10 rounded-full blur-2xl group-hover:bg-[#0a84ff]/20 transition-all" />
                <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Total Tokens</p>
                <p className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                  {history.total_tokens.toLocaleString()}
                </p>
                <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-[#0a84ff]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] animate-pulse" />
                  <span>Combined compute</span>
                </div>
              </div>

              <div className="apple-glass rounded-2xl p-4 sm:p-5">
                <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Prompt Tokens</p>
                <p className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                  {history.total_prompt_tokens.toLocaleString()}
                </p>
                <div className="mt-3 text-[11px] text-[#86868b]">Input screen context</div>
              </div>

              <div className="apple-glass rounded-2xl p-4 sm:p-5">
                <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Output Tokens</p>
                <p className="text-2xl sm:text-3xl font-light text-[#30d158] tracking-tight">
                  {history.total_completion_tokens.toLocaleString()}
                </p>
                <div className="mt-3 text-[11px] text-[#30d158]">Generated solutions</div>
              </div>

              <div className="apple-glass rounded-2xl p-4 sm:p-5">
                <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Retained Queries</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl sm:text-3xl font-light text-white tracking-tight">{history.requests_stored}</span>
                  <span className="text-sm text-[#86868b]">/ 10 max</span>
                </div>
                <div className="mt-3 flex items-center space-x-1 text-[11px] text-[#ff9f0a]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />
                  <span>Circular rotation active</span>
                </div>
              </div>
            </div>

            {/* Recent Queries List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Recent Request History ({history.requests.length})
                </h2>
                <span className="text-xs text-[#86868b]">
                  Showing last {history.requests.length} interactions
                </span>
              </div>

              {history.requests.length === 0 ? (
                <div className="apple-glass rounded-2xl p-12 text-center text-[#86868b]">
                  <span className="material-symbols-outlined text-4xl mb-2 text-[#636366]">history_toggle_off</span>
                  <p className="text-sm">No queries logged yet for this registration key.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.requests.map((item, idx) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="apple-glass-card rounded-2xl overflow-hidden"
                      >
                        {/* Row Header */}
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-[#86868b] flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                                  item.mode === "mcq"
                                    ? "bg-[#bf5af2]/15 text-[#bf5af2] border-[#bf5af2]/30"
                                    : "bg-[#0a84ff]/15 text-[#0a84ff] border-[#0a84ff]/30"
                                }`}>
                                  {item.mode}
                                </span>
                                <span className="text-xs text-white font-medium truncate">
                                  {item.model || "gemini-2.5-flash"}
                                </span>
                                <span className="text-[11px] text-[#86868b]">
                                  via {item.provider || "gemini"}
                                </span>
                              </div>
                              <p className="text-xs text-[#86868b] mt-0.5">
                                {formatTime(item.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="text-right">
                              <p className="text-xs font-semibold text-white">
                                {item.tokens_total.toLocaleString()} tokens
                              </p>
                              <p className="text-[10px] text-[#86868b]">
                                {item.tokens_prompt} in / {item.tokens_completion} out · {item.latency_ms}ms
                              </p>
                            </div>

                            <div className={`w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#86868b] transition-transform duration-200 ${
                              isExpanded ? "rotate-90 text-white" : ""
                            }`}>
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Drawers */}
                        {isExpanded && (
                          <div className="px-4 pb-5 sm:px-5 space-y-4 border-t border-white/[0.06] pt-4 bg-black/20">
                            {/* Prompt Drawer */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-[#86868b] flex items-center space-x-1">
                                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                                  <span>Prompt Sent to AI</span>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(item.prompt, `prompt-${item.id}`);
                                  }}
                                  className="apple-btn-secondary px-2.5 py-1 text-[11px] flex items-center space-x-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {copiedId === `prompt-${item.id}` ? "check" : "content_copy"}
                                  </span>
                                  <span>{copiedId === `prompt-${item.id}` ? "Copied" : "Copy"}</span>
                                </button>
                              </div>
                              <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-xs text-[#f5f5f7] whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                                {item.prompt}
                              </div>
                            </div>

                            {/* Response Drawer */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-[#30d158] flex items-center space-x-1">
                                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                                  <span>AI Generated Output / Answer</span>
                                </span>
                                {item.response && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(item.response || "", `resp-${item.id}`);
                                    }}
                                    className="apple-btn-secondary px-2.5 py-1 text-[11px] flex items-center space-x-1"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">
                                      {copiedId === `resp-${item.id}` ? "check" : "content_copy"}
                                    </span>
                                    <span>{copiedId === `resp-${item.id}` ? "Copied" : "Copy Code"}</span>
                                  </button>
                                )}
                              </div>
                              <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-xs text-[#30d158] whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                                {item.response || "(No response captured)"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!history && !loading && !error && (
          <div className="apple-glass rounded-2xl p-16 text-center text-[#86868b] animate-fade-in">
            <span className="material-symbols-outlined text-5xl mb-3 text-[#636366]">query_stats</span>
            <h3 className="text-base font-semibold text-white mb-1">Enter a Registration Key</h3>
            <p className="text-xs max-w-sm mx-auto text-[#86868b]">
              Inspect token consumption, screen prompts, and AI answers logged for any active machine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
