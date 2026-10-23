"use client";

import React, { useState } from "react";

export function SystemSpecsTab() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const hotkeys = [
    {
      key: "F5",
      title: "Coding Mode",
      desc: "Captures programming question from screen, prompts the Brain, and stores optimal source code.",
      badge: "Pure Accessibility",
    },
    {
      key: "Alt + Y",
      title: "MCQ Solver",
      desc: "Analyzes multiple-choice question and options, identifies correct letter and rationale.",
      badge: "Single Option",
    },
    {
      key: "F6",
      title: "Human Keystroke Typing",
      desc: "Types next line of code with randomized intervals (250ms–1200ms) to evade synthetic event detection.",
      badge: "Stealth Safe",
    },
    {
      key: "F9",
      title: "Instant All Paste",
      desc: "Pastes full solution instantly via virtual clipboard injection.",
      badge: "Rapid",
    },
    {
      key: "F7 / F8",
      title: "Ghost HUD Toggle",
      desc: "F7 activates 100% invisible transparent overlay; F8 restores visible HUD mode.",
      badge: "Display Stealth",
    },
    {
      key: "F2 / F3",
      title: "Overlay Positioning",
      desc: "F2 hides/shows HUD; F3 cycles opacity and stealth presets.",
      badge: "Controls",
    },
  ];

  const endpoints = [
    {
      method: "POST",
      path: "/api/bridge/generate",
      desc: "Universal AI Brain Gateway for code, MCQ, and explanations with automatic failover.",
    },
    {
      method: "POST",
      path: "/api/bridge/stream",
      desc: "Real-time SSE token streaming cascade across all active streaming providers.",
    },
    {
      method: "POST",
      path: "/api/bridge/mcq",
      desc: "Direct Brain MCQ solver with structured option and rationale parsing.",
    },
    {
      method: "GET",
      path: "/api/bridge/health",
      desc: "Operational health status, active provider counts, and circuit breaker metrics.",
    },
    {
      method: "GET",
      path: "/api/admin/health-check",
      desc: "Autonomous concurrent latency audit and circuit breaker health watcher.",
    },
    {
      method: "POST",
      path: "/api/validate",
      desc: "Client registration key validation and hardware ID binding.",
    },
    {
      method: "GET",
      path: "/api/history?global=true",
      desc: "Token consumption telemetry and 10-query circular buffer retrieval.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="pb-2 border-b border-white/[0.08]">
        <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
          <span className="material-symbols-outlined text-cyan-400 text-[22px]">
            developer_guide
          </span>
          <span>TITAN Architecture & Low-Level Specifications</span>
        </h2>
        <p className="text-xs text-[#86868b] mt-0.5">
          Low-level Windows CTF hooks, passive accessibility protocols, and edge gateway endpoints.
        </p>
      </div>

      {/* ── Hotkeys Grid ── */}
      <div>
        <h3 className="text-xs font-semibold text-white tracking-tight uppercase tracking-wider text-[#86868b] mb-4">
          Hardware Keyboard Sequences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hotkeys.map((h, i) => (
            <div key={i} className="apple-glass-card rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.12] font-mono text-xs font-bold text-white shadow-sm">
                    {h.key}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-[#86868b] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    {h.badge}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mt-2">{h.title}</h4>
                <p className="text-[11px] text-[#86868b] mt-1 leading-relaxed">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Endpoints List ── */}
      <div>
        <h3 className="text-xs font-semibold text-white tracking-tight uppercase tracking-wider text-[#86868b] mb-4">
          Edge Bridge Endpoints
        </h3>
        <div className="space-y-3">
          {endpoints.map((ep, i) => (
            <div
              key={i}
              className="apple-glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#0a84ff]/15 text-[#0a84ff] border border-[#0a84ff]/25 font-mono text-[10px] font-bold">
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-white">{ep.path}</span>
                </div>
                <p className="text-[11px] text-[#86868b]">{ep.desc}</p>
              </div>

              <button
                onClick={() => handleCopy(ep.path)}
                className="apple-btn-secondary px-3 py-1.5 text-xs font-medium self-start sm:self-auto flex items-center space-x-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedText === ep.path ? "check" : "content_copy"}
                </span>
                <span>{copiedText === ep.path ? "Copied" : "Copy Path"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
