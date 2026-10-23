"use client";

import React, { useState } from "react";

export function PlaygroundTab() {
  const [prompt, setPrompt] = useState(
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input would have exactly one solution."
  );
  const [mode, setMode] = useState<"code" | "mcq" | "explain">("code");
  const [language, setLanguage] = useState("Java");
  const [regKey, setRegKey] = useState("12413429");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"text" | "json">("text");

  const samples = [
    {
      label: "Two Sum (Code)",
      mode: "code" as const,
      lang: "Java",
      prompt:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    },
    {
      label: "Binary Search (Code)",
      mode: "code" as const,
      lang: "Python",
      prompt:
        "Implement binary search on a sorted list of numbers. Return index or -1 if not found.",
    },
    {
      label: "Operating Systems (MCQ)",
      mode: "mcq" as const,
      lang: "Java",
      prompt:
        "Which page replacement algorithm suffers from Belady's Anomaly?\nA) LRU\nB) FIFO\nC) Optimal\nD) LFU",
    },
  ];

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/bridge/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-secret": "lockapp-secret-2026",
          "x-reg-key": regKey.trim(),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode,
          language,
          regKey: regKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || `HTTP ${res.status}: Failed to generate answer`);
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Network error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="pb-2 border-b border-white/[0.08]">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-purple-400 text-[22px]">bolt</span>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            TITAN ↔ Brain Live Simulator
          </h2>
        </div>
        <p className="text-xs text-[#86868b] mt-0.5">
          Simulate exact query payloads sent by the TITAN desktop client.
          Watch Vercel dynamically select the best upstream provider, measure latency, and verify that the exact TITAN response payload is returned.
        </p>
      </div>

      {/* ── Main Two-Column Console ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Payload */}
        <div className="apple-glass-card rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center space-x-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#0a84ff]">input</span>
              <span>Client Question Payload</span>
            </span>
            <div className="flex items-center space-x-1.5">
              {samples.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrompt(s.prompt);
                    setMode(s.mode);
                    setLanguage(s.lang);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-[#86868b] hover:text-white transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode & Language Selectors */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "code" | "mcq" | "explain")}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
              >
                <option value="code" className="bg-[#1c1c1e]">Code</option>
                <option value="mcq" className="bg-[#1c1c1e]">MCQ Solver</option>
                <option value="explain" className="bg-[#1c1c1e]">Explain</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
              >
                <option value="Java" className="bg-[#1c1c1e]">Java</option>
                <option value="Python" className="bg-[#1c1c1e]">Python</option>
                <option value="C++" className="bg-[#1c1c1e]">C++</option>
                <option value="C#" className="bg-[#1c1c1e]">C#</option>
                <option value="JavaScript" className="bg-[#1c1c1e]">JavaScript</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Simulated Key</label>
              <input
                type="text"
                value={regKey}
                onChange={(e) => setRegKey(e.target.value)}
                placeholder="12413429"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
          </div>

          {/* Prompt Textarea */}
          <div>
            <label className="block text-[11px] font-medium text-[#86868b] mb-1">
              Problem Prompt / Question Text
            </label>
            <textarea
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste exam question or programming prompt..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#f5f5f7] placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]/30 resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !prompt.trim()}
            className="w-full apple-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#0a84ff]/25 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>Dispatching via Vercel Brain...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Dispatch to Brain</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Execution Telemetry & Response */}
        <div className="apple-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <span className="text-xs font-semibold text-white tracking-tight flex items-center space-x-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">output</span>
                <span>Brain Response (Received by TITAN)</span>
              </span>

              {result && (
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                  <button
                    onClick={() => setViewMode("text")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                      viewMode === "text" ? "bg-white/[0.15] text-white" : "text-[#86868b]"
                    }`}
                  >
                    Clean Code
                  </button>
                  <button
                    onClick={() => setViewMode("json")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                      viewMode === "json" ? "bg-white/[0.15] text-white" : "text-[#86868b]"
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>Execution Failed</span>
                </div>
                <p className="text-[11px] font-mono">{error}</p>
              </div>
            )}

            {!result && !error && !loading && (
              <div className="py-20 text-center text-[#86868b]">
                <span className="material-symbols-outlined text-[32px] opacity-40 mb-2">
                  terminal
                </span>
                <p className="text-xs">Dispatch a prompt from the left to inspect real-time execution.</p>
              </div>
            )}

            {loading && (
              <div className="py-20 text-center text-[#86868b] space-y-3">
                <span className="material-symbols-outlined text-[36px] text-[#0a84ff] animate-spin">
                  neurology
                </span>
                <p className="text-xs font-medium text-white/80">
                  Selecting optimal AI provider and executing query...
                </p>
                <p className="text-[11px] text-[#86868b]">
                  TITAN desktop client will receive the formatted payload in milliseconds.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Telemetry Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    <span>Provider: <strong className="uppercase">{String(result.provider)}</strong></span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/80 text-[11px] font-mono">
                    Model: {String(result.model)}
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-mono">
                    ⚡ {String(result.latency_ms)}ms
                  </div>

                  {result.tokens && typeof result.tokens === "object" && (
                    <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-mono">
                      {(result.tokens as { total?: number }).total || 0} tokens
                    </div>
                  )}
                </div>

                {/* Display Output */}
                <div className="relative rounded-xl bg-black/60 border border-white/[0.08] p-4 font-mono text-xs text-[#f5f5f7] overflow-x-auto max-h-[380px] no-scrollbar">
                  {viewMode === "text" ? (
                    <pre className="whitespace-pre-wrap">{String(result.text || "")}</pre>
                  ) : (
                    <pre className="whitespace-pre-wrap text-[11px] text-cyan-300">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-[#86868b]">
                Standardized contract satisfied (text, candidates, choices)
              </span>
              <button
                onClick={() => handleCopy(viewMode === "text" ? String(result.text || "") : JSON.stringify(result, null, 2))}
                className="apple-btn-secondary px-3 py-1.5 text-xs font-medium flex items-center space-x-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copied ? "check" : "content_copy"}
                </span>
                <span>{copied ? "Copied!" : "Copy Output"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
