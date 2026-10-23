"use client";

import { useEffect } from "react";
import Link from "next/link";

const diagrams = [
  {
    title: "1 · Centralized Multi-Provider Brain & Client Decoupling",
    description: "Universal payload routing, per-user provider allotment, and zero client key leakage.",
    code: `graph TB
    subgraph CLOUD["☁️ Vercel Edge AI Brain & Upstream Providers"]
        VR["Vercel Centralized Brain (/api/bridge/generate)"]
        DISPATCHER{"Brain Dynamic Cascade & Load Balancer"}
        P_GROQ["Groq Cloud Llama-3.3-70B (~300 tok/s)"]
        P_GEMINI["Google Gemini 2.5 Flash Pool"]
        P_DEEPSEEK["DeepSeek / OpenAI / Anthropic / Custom"]
        SB[("Supabase Vault: ai_providers, licenses, 10-cap history")]
    end
    subgraph CLIENT["💻 Client Node (Windows Lockdown Environment)"]
        LA["Launcher (titan.exe)"]
        TI["Stealth Engine (ctfmon.exe)"]
        MSAA["Pure Native MSAA Accessibility Extractor"]
    end
    User -->|Enters 8-digit Key| LA
    LA -->|Validates License| VR
    VR <-->|Quota & Per-User Allotment| SB
    LA -->|Pipes Key via stdin| TI
    TI -->|F5 / Alt+Y Capture| MSAA
    MSAA -->|Clean DOM Text| TI
    TI -->|POST /api/bridge/generate| VR
    VR -->|Inspects User Allotment & Priorities| DISPATCHER
    DISPATCHER -->|Priority 1| P_GROQ
    DISPATCHER -.->|Failover on 429| P_GEMINI
    DISPATCHER -.->|Fallback| P_DEEPSEEK
    VR -->|Rotates 10-Request Circular Buffer| SB
    VR -->|Universal Format: text, candidates, choices| TI
    TI -->|Humanized Keystroke Injection| Target["Target Editor / Browser"]`,
  },
  {
    title: "2 · Multi-Tier Cascade & Session Circuit Breaker",
    description: "Instant failover logic protecting against Campus Wi-Fi DPI and Rate Limits.",
    code: `flowchart TD
    REQ([Request Triggered: F5 or Alt+Y]) --> C1{Circuit Breaker Open?}
    C1 -->|Yes: Campus Blocked| T2["Direct Route: Tier 2 (Vercel Bridge)"]
    C1 -->|No| T1["Tier 1: Direct Gemini (3.5s fail-fast)"]
    T1 -->|HTTP 200 OK| SUCCESS([Deliver Code])
    T1 -->|HTTP 403 / 429 / Timeout| TRIP["Trip Circuit Breaker (campus_blocked=True)"]
    TRIP --> T2
    T2 -->|Vercel Key Pool| G_SERVER["Server-Side Gemini"]
    G_SERVER -->|HTTP 200| SUCCESS
    G_SERVER -->|Server Rate Limit 429| GROQ_SERVER["Server-Side Groq Llama-3.3-70B"]
    GROQ_SERVER -->|300 tok/sec| SUCCESS
    GROQ_SERVER -->|Failed| NV_SERVER["Server-Side NVIDIA Backup"]
    NV_SERVER --> SUCCESS`,
  },
  {
    title: "3 · Hardware Security & RAM-Only Secret Model",
    description: "Protection against memory dumps, process inspection, and disk forensics.",
    code: `flowchart TD
    subgraph DISK["❌ Zero Disk Residue"]
        D1["No Keys in INI Files"]
        D2["No Keys in CLI Arguments"]
        D3["No Keys in Environment Variables"]
    end
    subgraph MEMORY["🛡️ Volatile Protected Memory"]
        M1["Keys Injected via Anonymous Stdin Pipe"]
        M2["Volatile RAM Storage (Cleared on Process Exit)"]
        M3["Hardware Locked (Machine ID + SHA-256)"]
        M4["WDA_EXCLUDEFROMCAPTURE (Hidden from Screen Recording)"]
    end
    DISK --> MEMORY`,
  },
];

const hotkeys = [
  { key: "F5", name: "Capture & Solve Code", desc: "Extracts foreground editor problem text and streams compilable solution.", badge: "Coding" },
  { key: "Alt + Y", name: "MCQ Solver", desc: "Extracts question & choices and outputs the exact correct answer label.", badge: "MCQ" },
  { key: "F6", name: "Type Next Line", desc: "Humanized keystroke simulation line-by-line with dynamic pauses.", badge: "Typing" },
  { key: "F9", name: "Type Full Solution", desc: "Simulates continuous human typing (38ms character delay, 60ms line pause).", badge: "Typing" },
  { key: "F2", name: "Toggle HUD Overlay", desc: "Instantly shows or hides the floating answer window.", badge: "Stealth" },
  { key: "Alt + T", name: "Emergency Memory Wipe", desc: "Immediately wipes credentials from RAM and terminates process.", badge: "Security" },
];

const tiers = [
  { provider: "Groq Cloud (Llama-3.3-70B)", role: "Ultra-Fast LPU Engine", latency: "~0.4s", status: "Active", color: "#30d158" },
  { provider: "Google Gemini 2.5 Flash Pool", role: "High-Context Multimodal Pool", latency: "~1.1s", status: "Active", color: "#30d158" },
  { provider: "DeepSeek / OpenAI / Anthropic", role: "Deep Reasoning & Architecture", latency: "~1.8s", status: "Active", color: "#0a84ff" },
  { provider: "Custom / Self-Hosted", role: "Local Ollama / vLLM Fallback", latency: "Variable", status: "Configurable", color: "#bf5af2" },
];

export default function DocsPage() {
  useEffect(() => {
    const loadMermaid = () => {
      if ((window as any).mermaid) {
        (window as any).mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#161618",
            primaryColor: "#1c1c1e",
            primaryTextColor: "#f5f5f7",
            primaryBorderColor: "rgba(255,255,255,0.15)",
            lineColor: "#0a84ff",
            secondaryColor: "#1c1c1e",
            tertiaryColor: "#161618",
            edgeLabelBackground: "#000000",
            clusterBkg: "#0e0e10",
            titleColor: "#0a84ff",
            nodeBorder: "rgba(255,255,255,0.12)",
            mainBkg: "#1c1c1e",
          },
          flowchart: { curve: "basis", useMaxWidth: true },
        });
        setTimeout(() => {
          (window as any).mermaid.run();
        }, 100);
      }
    };

    if ((window as any).mermaid) {
      loadMermaid();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.onload = loadMermaid;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] font-sans antialiased selection:bg-[#0a84ff]/30 selection:text-white">
      {/* Top Ambient Light */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#0a84ff]/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 ios-page-enter">
        {/* Navigation Header */}
        <header className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0c] border border-white/[0.12] flex items-center justify-center shadow-lg shadow-black/40">
              <span className="material-symbols-outlined text-[#0a84ff] text-[22px]">schema</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold tracking-tight text-white">TITAN AI</h1>
                <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
                  Developer Docs
                </span>
              </div>
              <p className="text-xs text-[#86868b]">Architecture, Multi-Tier Routing & Operation Protocols</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href="/admin"
              className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-[#86868b]">arrow_back</span>
              <span>Admin Console</span>
            </Link>
            <Link
              href="/history"
              className="apple-btn-primary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">monitoring</span>
              <span>Token Telemetry</span>
            </Link>
          </div>
        </header>

        {/* Hotkeys Quick Cheatsheet */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px] text-[#0a84ff]">keyboard</span>
              <span>Hotkeys & Magic Sequences</span>
            </h2>
            <span className="text-xs text-[#86868b]">Global Low-Level Windows Hooks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hotkeys.map((h) => (
              <div key={h.key} className="apple-glass-card rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.12] font-mono text-xs font-semibold text-white shadow-sm">
                      {h.key}
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-[#86868b] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                      {h.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{h.name}</h3>
                  <p className="text-xs text-[#86868b] leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Model Cascade Matrix */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px] text-[#30d158]">swap_calls</span>
              <span>AI Provider Cascade & SLA Matrix</span>
            </h2>
            <span className="text-xs text-[#86868b]">Managed from Vercel Vault</span>
          </div>

          <div className="apple-glass rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] border-b border-white/[0.06] text-[#86868b] uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Cascade Tier</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tiers.map((t) => (
                  <tr key={t.provider} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">{t.provider}</td>
                    <td className="py-3.5 px-4 text-[#86868b]">{t.role}</td>
                    <td className="py-3.5 px-4 font-mono text-white">{t.latency}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium" style={{ color: t.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                        <span>{t.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Architecture Flowcharts */}
        <section className="space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px] text-[#bf5af2]">account_tree</span>
              <span>Architecture & Sequence Topologies</span>
            </h2>
            <span className="text-xs text-[#86868b]">Interactive Mermaid Visualizations</span>
          </div>

          {diagrams.map((d) => (
            <div key={d.title} className="apple-glass-card rounded-2xl p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white tracking-tight">{d.title}</h3>
                <p className="text-xs text-[#86868b] mt-0.5">{d.description}</p>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] overflow-x-auto flex justify-center">
                <div className="mermaid">{d.code}</div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
