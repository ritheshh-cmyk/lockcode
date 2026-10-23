"use client";

import React, { useState, useEffect } from "react";
import { License } from "../actions";

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
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<UserHistorySummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (licenses.length > 0 && !selectedKey) {
      setSelectedKey(licenses[0].reg_key);
    }
  }, [licenses, selectedKey]);

  useEffect(() => {
    if (!selectedKey) return;

    let active = true;
    setLoading(true);

    fetch(`/api/history?reg_key=${encodeURIComponent(selectedKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && data.data) {
          setHistoryData(data.data);
          if (data.data.requests?.length > 0) {
            setExpandedId(data.data.requests[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedKey]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-8">
      {/* ── Header & Key Selector ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
            <span className="material-symbols-outlined text-amber-400 text-[22px]">
              monitoring
            </span>
            <span>Live Token Telemetry & Query Vault</span>
          </h2>
          <p className="text-xs text-[#86868b] mt-0.5">
            Inspect real queries transmitted by TITAN desktop clients, model routing choices, and token counts.
            Rolling 10-query retention cap enforced automatically per user.
          </p>
        </div>

        {/* License Selector Dropdown */}
        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          <label className="text-xs text-[#86868b] font-medium whitespace-nowrap">
            Client Key:
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#0a84ff]"
          >
            {licenses.map((l) => (
              <option key={l.id} value={l.reg_key} className="bg-[#1c1c1e]">
                {l.reg_key} {l.label ? `(${l.label})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Bento Metrics for Selected License ── */}
      {historyData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="apple-glass-card rounded-2xl p-5">
            <div className="text-[11px] font-medium text-[#86868b]">Total Tokens</div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono mt-1">
              {historyData.total_tokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#86868b] mt-0.5">Combined usage</div>
          </div>

          <div className="apple-glass-card rounded-2xl p-5">
            <div className="text-[11px] font-medium text-[#0a84ff]">Input Tokens</div>
            <div className="text-2xl font-bold tracking-tight text-[#0a84ff] font-mono mt-1">
              {historyData.total_prompt_tokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#86868b] mt-0.5">Exam questions & prompts</div>
          </div>

          <div className="apple-glass-card rounded-2xl p-5">
            <div className="text-[11px] font-medium text-emerald-400">Output Tokens</div>
            <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono mt-1">
              {historyData.total_completion_tokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#86868b] mt-0.5">Synthesized code & answers</div>
          </div>

          <div className="apple-glass-card rounded-2xl p-5">
            <div className="text-[11px] font-medium text-amber-400">Retained History</div>
            <div className="text-2xl font-bold tracking-tight text-amber-400 font-mono mt-1">
              {historyData.requests_stored} / 10
            </div>
            <div className="text-[10px] text-[#86868b] mt-0.5">Rolling circular buffer</div>
          </div>
        </div>
      )}

      {/* ── Request Timeline & Expandable Drawers ── */}
      {loading ? (
        <div className="apple-glass-card rounded-2xl p-12 text-center text-[#86868b]">
          <span className="material-symbols-outlined text-[32px] animate-spin text-[#0a84ff] mb-2">
            progress_activity
          </span>
          <p className="text-xs">Loading telemetry records...</p>
        </div>
      ) : !historyData || historyData.requests.length === 0 ? (
        <div className="apple-glass-card rounded-2xl p-12 text-center text-[#86868b]">
          <span className="material-symbols-outlined text-[32px] opacity-40 mb-2">
            history_toggle_off
          </span>
          <h3 className="text-sm font-semibold text-white">No Queries Logged Yet</h3>
          <p className="text-xs text-[#86868b] max-w-sm mx-auto mt-1">
            When this client runs TITAN and triggers F5 (Code) or Alt+Y (MCQ), requests will stream here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyData.requests.map((req, idx) => {
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

                    <span className="text-xs font-semibold text-white tracking-tight truncate max-w-[280px] sm:max-w-[400px]">
                      {req.prompt.slice(0, 80)}...
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-[#86868b] self-end sm:self-auto">
                    {req.provider && (
                      <span className="font-mono text-[11px] text-white/70 uppercase">
                        {req.provider}
                      </span>
                    )}

                    <span className="font-mono text-[11px] text-amber-400">
                      ⚡ {req.latency_ms}ms
                    </span>

                    <span className="font-mono text-[11px] text-emerald-400">
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
                          <span>{copiedId === `p-${req.id}` ? "Copied" : "Copy"}</span>
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
                          <span>{copiedId === `r-${req.id}` ? "Copied" : "Copy"}</span>
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
