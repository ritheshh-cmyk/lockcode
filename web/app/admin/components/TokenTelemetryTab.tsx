"use client";

import React, { useState, useEffect, useCallback } from "react";
import { License, getGlobalTelemetry } from "../actions";

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

interface TokenTelemetryTabProps {
  licenses: License[];
}

export function TokenTelemetryTab({ licenses }: TokenTelemetryTabProps) {
  const [viewScope, setViewScope] = useState<"key" | "global">("global");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<UserHistorySummary | null>(null);
  const [globalRequests, setGlobalRequests] = useState<RequestLogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (licenses.length > 0 && !selectedKey) {
      setSelectedKey(licenses[0].reg_key);
    }
  }, [licenses, selectedKey]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (viewScope === "global") {
        const records = await getGlobalTelemetry(50);
        setGlobalRequests(records || []);
        if (records?.length > 0 && !expandedId) {
          setExpandedId(records[0].id);
        }
      } else if (selectedKey) {
        const res = await fetch(`/api/history?reg_key=${encodeURIComponent(selectedKey)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setHistoryData(data.data);
          if (data.data.requests?.length > 0 && !expandedId) {
            setExpandedId(data.data.requests[0].id);
          }
        }
      }
    } catch {
      // Non-blocking catch
    } finally {
      setLoading(false);
    }
  }, [viewScope, selectedKey, expandedId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval (10s)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadData();
    }, 10_000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const currentRequests: RequestLogEntry[] =
    viewScope === "global" ? globalRequests : historyData?.requests || [];

  const totalTokens =
    viewScope === "global"
      ? globalRequests.reduce((acc, r) => acc + (r.tokens_total || 0), 0)
      : historyData?.total_tokens || 0;

  const totalPromptTokens =
    viewScope === "global"
      ? globalRequests.reduce((acc, r) => acc + (r.tokens_prompt || 0), 0)
      : historyData?.total_prompt_tokens || 0;

  const totalCompletionTokens =
    viewScope === "global"
      ? globalRequests.reduce((acc, r) => acc + (r.tokens_completion || 0), 0)
      : historyData?.total_completion_tokens || 0;

  const exportCSV = () => {
    if (currentRequests.length === 0) return;
    const header = "id,reg_key,mode,provider,model,tokens_prompt,tokens_completion,tokens_total,latency_ms,created_at";
    const rows = currentRequests.map(
      (r) =>
        `"${r.id}","${r.reg_key}","${r.mode}","${r.provider || ""}","${r.model || ""}",${r.tokens_prompt},${r.tokens_completion},${r.tokens_total},${r.latency_ms},"${r.created_at}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titan-telemetry-${viewScope}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (currentRequests.length === 0) return;
    const json = JSON.stringify(currentRequests, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titan-telemetry-${viewScope}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
            <span className="material-symbols-outlined text-amber-400 text-[22px]">
              monitoring
            </span>
            <span>Live Token Telemetry & Query Vault</span>
          </h2>
          <p className="text-xs text-[#86868b] mt-0.5">
            Inspect real queries transmitted by TITAN desktop clients, model routing choices, and token counts.
            Rolling 10-query retention cap enforced per user.
          </p>
        </div>

        {/* View Scope & Key Selector */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Segmented View Mode */}
          <div className="p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center text-xs">
            <button
              onClick={() => setViewScope("global")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ios-press ${
                viewScope === "global"
                  ? "bg-white/[0.18] text-white shadow-sm shadow-black/50 border border-white/[0.12]"
                  : "text-[#86868b] hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              System Overview
            </button>
            <button
              onClick={() => setViewScope("key")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ios-press ${
                viewScope === "key"
                  ? "bg-white/[0.18] text-white shadow-sm shadow-black/50 border border-white/[0.12]"
                  : "text-[#86868b] hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              Single Client
            </button>
          </div>

          {/* License Selector (if Single Client) */}
          {viewScope === "key" && (
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#0a84ff]"
            >
              {licenses.map((l) => (
                <option key={l.id} value={l.reg_key} className="bg-[#1c1c1e]">
                  {l.reg_key} {l.label ? `(${l.label})` : ""}
                </option>
              ))}
            </select>
          )}

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1 transition-colors ${
              autoRefresh
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/[0.04] border-white/[0.08] text-[#86868b] hover:text-white"
            }`}
          >
            <span className={`material-symbols-outlined text-[14px] ${autoRefresh ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>{autoRefresh ? "10s Active" : "Auto-Refresh"}</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <button
            onClick={exportCSV}
            disabled={currentRequests.length === 0}
            className="apple-btn-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            title="Download CSV"
          >
            CSV
          </button>
          <button
            onClick={exportJSON}
            disabled={currentRequests.length === 0}
            className="apple-btn-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            title="Download JSON"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Bento Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="apple-glass-card rounded-2xl p-5">
          <div className="text-[11px] font-medium text-[#86868b]">Total Tokens</div>
          <div className="text-2xl font-bold tracking-tight text-white font-mono mt-1">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5">
            {viewScope === "global" ? "Across Recent Activity" : "Selected Client Total"}
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5">
          <div className="text-[11px] font-medium text-[#0a84ff]">Input Tokens</div>
          <div className="text-2xl font-bold tracking-tight text-[#0a84ff] font-mono mt-1">
            {totalPromptTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5">Exam prompts & questions</div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5">
          <div className="text-[11px] font-medium text-emerald-400">Output Tokens</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono mt-1">
            {totalCompletionTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5">Generated code & answers</div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5">
          <div className="text-[11px] font-medium text-amber-400">
            {viewScope === "global" ? "Logged Queries" : "Retained Cap"}
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-400 font-mono mt-1">
            {viewScope === "global" ? `${currentRequests.length} Requests` : `${historyData?.requests_stored || 0} / 10`}
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5">
            {viewScope === "global" ? "Latest System Invocations" : "Rolling per-user cap"}
          </div>
        </div>
      </div>

      {/* Request Timeline & Expandable Drawers */}
      {loading && currentRequests.length === 0 ? (
        <div className="apple-glass-card rounded-2xl p-12 text-center text-[#86868b]">
          <span className="material-symbols-outlined text-[32px] animate-spin text-[#0a84ff] mb-2">
            progress_activity
          </span>
          <p className="text-xs">Loading telemetry records...</p>
        </div>
      ) : currentRequests.length === 0 ? (
        <div className="apple-glass-card rounded-2xl p-12 text-center text-[#86868b]">
          <span className="material-symbols-outlined text-[32px] opacity-40 mb-2">
            history_toggle_off
          </span>
          <h3 className="text-sm font-semibold text-white">No Queries Logged Yet</h3>
          <p className="text-xs text-[#86868b] max-w-sm mx-auto mt-1">
            When clients run TITAN and trigger F5 (Code) or Alt+Y (MCQ), requests will stream here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentRequests.map((req, idx) => {
            const isExpanded = expandedId === req.id;
            const created = new Date(req.created_at);

            return (
              <div
                key={req.id}
                className="apple-glass-card rounded-2xl overflow-hidden border border-white/[0.08] transition-all"
              >
                {/* Header Row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-white/[0.06] text-white/80 flex items-center justify-center font-mono text-[11px] font-bold">
                      #{idx + 1}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        req.mode === "mcq"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-[#0a84ff]/10 text-[#0a84ff] border-[#0a84ff]/20"
                      }`}
                    >
                      {req.mode}
                    </span>

                    {viewScope === "global" && (
                      <span className="font-mono text-[10px] text-white/50 px-2 py-0.5 rounded bg-white/[0.04]">
                        key:{req.reg_key === "anonymous" ? "anon" : req.reg_key.slice(0, 4) + "…"}
                      </span>
                    )}

                    <span className="text-xs font-semibold text-white tracking-tight truncate max-w-[240px] sm:max-w-[380px]">
                      {req.prompt.slice(0, 75)}...
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-[#86868b] self-end sm:self-auto">
                    {req.provider && (
                      <span className="font-mono text-[11px] text-white/70 uppercase">
                        {req.provider}
                      </span>
                    )}

                    <span className="font-mono text-[11px] text-[#ff9f0a]">
                      {req.latency_ms}ms
                    </span>

                    <span className="font-mono text-[11px] text-[#0a84ff]">
                      {req.tokens_total} tok
                    </span>

                    <span className="text-[11px] text-white/40">
                      {created.toLocaleTimeString()}
                    </span>

                    <span
                      className={`material-symbols-outlined text-[18px] text-[#86868b] transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {/* Collapsible Inspection Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-white/[0.06] bg-black/40 space-y-4">
                    {/* Prompt Box */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-[#86868b] flex items-center space-x-1">
                          <span className="material-symbols-outlined text-[14px] text-[#0a84ff]">arrow_upward</span>
                          <span>Inbound Prompt (Transmitted by TITAN)</span>
                        </span>
                        <button
                          onClick={() => handleCopy(`p-${req.id}`, req.prompt)}
                          className="text-[11px] text-[#86868b] hover:text-white flex items-center space-x-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedId === `p-${req.id}` ? "check" : "content_copy"}
                          </span>
                          <span>{copiedId === `p-${req.id}` ? "Copied" : "Copy Prompt"}</span>
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] font-mono text-xs text-white/90 whitespace-pre-wrap max-h-48 overflow-y-auto no-scrollbar">
                        {req.prompt}
                      </div>
                    </div>

                    {/* Response Box */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-[#86868b] flex items-center space-x-1">
                          <span className="material-symbols-outlined text-[14px] text-emerald-400">arrow_downward</span>
                          <span>Brain Answer (Delivered to TITAN Client)</span>
                        </span>
                        <button
                          onClick={() => handleCopy(`r-${req.id}`, req.response || "")}
                          className="text-[11px] text-[#86868b] hover:text-white flex items-center space-x-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedId === `r-${req.id}` ? "check" : "content_copy"}
                          </span>
                          <span>{copiedId === `r-${req.id}` ? "Copied" : "Copy Response"}</span>
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] font-mono text-xs text-emerald-300 whitespace-pre-wrap max-h-64 overflow-y-auto no-scrollbar">
                        {req.response || <span className="text-white/40 italic">No response text recorded</span>}
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
  );
}
