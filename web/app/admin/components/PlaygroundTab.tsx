"use client";

import React, { useState } from "react";
import { License } from "../actions";

interface PlaygroundTabProps {
  licenses?: License[];
}

export function PlaygroundTab({ licenses = [] }: PlaygroundTabProps) {
  const [prompt, setPrompt] = useState(
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input would have exactly one solution."
  );
  const [mode, setMode] = useState<"code" | "mcq" | "explain">("code");
  const [language, setLanguage] = useState("Java");
  const [keyChoice, setKeyChoice] = useState("anonymous");
  const [customKey, setCustomKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"text" | "json">("text");

  const effectiveKey = keyChoice === "custom" ? customKey.trim() : keyChoice;

  const samples = [
    {
      label: "Two Sum (Code)",
      mode: "code" as const,
      lang: "Java",
      prompt:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Return indices.",
    },
    {
      label: "Binary Search (Code)",
      mode: "code" as const,
      lang: "Python",
      prompt:
        "Implement binary search on a sorted list of numbers. Return index or -1 if not found.",
    },
    {
      label: "Belady's Anomaly (MCQ)",
      mode: "mcq" as const,
      lang: "Java",
      prompt:
        "Which page replacement algorithm suffers from Belady's Anomaly?\nA) LRU\nB) FIFO\nC) Optimal\nD) LFU",
    },
    {
      label: "Deadlock Banker's (Explain)",
      mode: "explain" as const,
      lang: "Java",
      prompt:
        "Explain Banker's Algorithm for deadlock avoidance with state safety criteria, Big-O complexity, and key limitations.",
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
          "x-reg-key": effectiveKey || "anonymous",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode,
          language,
          regKey: effectiveKey || "anonymous",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || `HTTP ${res.status}: Failed to generate answer`);
        if (data.killswitch) {
          setError(`🚨 Remote Killswitch Triggered: ${data.error}`);
        }
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
      {/* Header */}
      <div className="pb-2 border-b border-white/[0.08]">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-purple-400 text-[22px]">bolt</span>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            TITAN ⟷ Brain Live Simulator
          </h2>
        </div>
        <p className="text-xs text-[#86868b] mt-0.5">
          Simulate exact query payloads sent by the TITAN desktop client.
          Watch Vercel dynamically select the best upstream provider, measure latency, and verify that the exact TITAN response payload is returned.
        </p>
      </div>

      {/* Main Two-Column Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Payload */}
        <div className="apple-glass-card rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center space-x-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#0a84ff]">input</span>
              <span>Client Question Payload</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {samples.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrompt(s.prompt);
                    setMode(s.mode);
                    setLanguage(s.lang);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-[#86868b] hover:text-white transition-all ios-press-subtle border border-white/[0.06]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode, Language & License Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Exam Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "code" | "mcq" | "explain")}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
              >
                <option value="code" className="bg-[#1c1c1e]">Code (Optimized)</option>
                <option value="mcq" className="bg-[#1c1c1e]">MCQ Fast-Solver</option>
                <option value="explain" className="bg-[#1c1c1e]">Explain (Big-O)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Target Language</label>
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
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Simulated Client Key</label>
              <select
                value={keyChoice}
                onChange={(e) => setKeyChoice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
              >
                <option value="anonymous" className="bg-[#1c1c1e]">Anonymous (Stealth)</option>
                {licenses
                  .filter((l) => l.is_active)
                  .slice(0, 10)
                  .map((l) => (
                    <option key={l.id} value={l.reg_key} className="bg-[#1c1c1e]">
                      Key {l.reg_key} {l.label ? `(${l.label})` : ""}
                    </option>
                  ))}
                <option value="custom" className="bg-[#1c1c1e]">Custom Key...</option>
              </select>
            </div>
          </div>

          {keyChoice === "custom" && (
            <div>
              <label className="block text-[11px] font-medium text-[#86868b] mb-1">Enter Custom 8-Digit Key</label>
              <input
                type="text"
                maxLength={8}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="e.g. 88371928"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
          )}

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
            className="w-full apple-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#0a84ff]/25 disabled:opacity-50 ios-press"
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
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all duration-200 ios-press ${
                      viewMode === "text"
                        ? "bg-white/[0.2] text-white shadow-sm border border-white/[0.12]"
                        : "text-[#86868b] hover:text-white border border-transparent"
                    }`}
                  >
                    Clean Code
                  </button>
                  <button
                    onClick={() => setViewMode("json")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all duration-200 ios-press ${
                      viewMode === "json"
                        ? "bg-white/[0.2] text-white shadow-sm border border-white/[0.12]"
                        : "text-[#86868b] hover:text-white border border-transparent"
                    }`}
                  >
                    Raw TITAN JSON
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start space-x-2 mb-4">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {result ? (
              <div className="space-y-4">
                {/* Telemetry Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.06] text-white border border-white/[0.08] flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="capitalize">{String(result.provider)}</span>
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] text-[#86868b] border border-white/[0.06]">
                    {String(result.model)}
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ⏱ {String(result.latency_ms)}ms
                  </span>
                  {result.tokens && typeof result.tokens === "object" && (
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/20">
                      {(result.tokens as any).total ?? 0} tokens
                    </span>
                  )}
                </div>

                {/* Response Body */}
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-black/60 border border-white/[0.08] text-xs font-mono text-[#f5f5f7] overflow-x-auto max-h-[360px] whitespace-pre-wrap leading-relaxed">
                    {viewMode === "text"
                      ? String(result.text || "")
                      : JSON.stringify(result, null, 2)}
                  </pre>
                  <button
                    onClick={() =>
                      handleCopy(
                        viewMode === "text"
                          ? String(result.text || "")
                          : JSON.stringify(result, null, 2)
                      )
                    }
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white/[0.1] hover:bg-white/[0.18] text-[10px] font-semibold text-white transition-colors flex items-center space-x-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-[#86868b]">
                <span className="material-symbols-outlined text-[36px] opacity-30 mb-2">
                  psychology
                </span>
                <p className="text-xs font-medium">Ready to dispatch.</p>
                <p className="text-[11px] opacity-70 mt-0.5">
                  Click &ldquo;Dispatch to Brain&rdquo; to simulate a live client execution.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/[0.06] mt-4 flex items-center justify-between text-[11px] text-[#86868b]">
            <span>Contract Version: 3.2.0</span>
            <span className="text-emerald-400 font-medium">100% Client Compatible</span>
          </div>
        </div>
      </div>
    </div>
  );
}
