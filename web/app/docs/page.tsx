"use client";
import { useEffect } from "react";

const diagrams = [
  {
    title: "1 · Full Ecosystem Overview",
    code: `graph TB
    subgraph CLOUD["☁️ Cloud Layer"]
        SB[(Supabase DB)]
        VR[Vercel Next.js]
        GEMINI[Google Gemini API]
        NIM[NVIDIA NIM API]
    end
    subgraph CLIENT["💻 Client — Windows"]
        LA[Launcher launcher.py]
        TI[TITAN ctfmon.exe]
        HUD[HUD Overlay]
    end
    Admin -->|Manage licenses| VR
    VR <-->|CRUD| SB
    User -->|Enter reg key| LA
    LA -->|POST /api/validate| VR
    VR -->|gemini_key + model| LA
    LA -->|stdin pipe| TI
    TI -->|model=gemini| GEMINI
    TI -->|model=llama-3.3-70b| NIM
    GEMINI --> HUD
    NIM --> HUD
    User -->|reads answer| HUD`,
  },
  {
    title: "2 · Model Routing Logic",
    code: `flowchart TD
    BOOT([ctfmon.exe boots]) --> PIPE{stdin pipe?}
    PIPE -->|Yes| PARSE[Parse JSON\ngemini_key · language · model]
    PIPE -->|No| ENV[Read env vars]
    PARSE --> RAM[RAM globals\n_RUNTIME_MODEL\n_RUNTIME_API_KEYS]
    ENV --> RAM
    RAM --> KEY{Hotkey pressed}
    KEY -->|F5| CODE[Coding pipeline]
    KEY -->|Alt+Y| MCQ[MCQ pipeline]
    CODE --> ROUTE{model?}
    MCQ --> ROUTE
    ROUTE -->|gemini| G[Google Gemini\nAIza... key]
    ROUTE -->|llama-3.3-70b| N[NVIDIA NIM\nnvapi-... key]
    G --> HUD[HUD Overlay]
    N --> HUD`,
  },
  {
    title: "3 · All Hotkeys & Magic Sequences",
    code: `flowchart LR
    subgraph HOTKEYS["⌨️ Hotkeys"]
        F5[F5 Code capture]
        ALT[Alt+Y MCQ capture]
        F6[F6 Type next line]
        F9[F9 Paste ALL instantly]
        F7[F7 Ghost mode ON]
        F8[F8 Ghost mode OFF]
        F2[F2 Hide/Show HUD]
        F3[F3 Stealth cycle]
        ALTT[Alt+T Emergency exit]
    end
    subgraph MAGIC["✨ Magic Sequences"]
        DC[..c Code capture]
        DM[..m MCQ capture]
        DG[..g Ghost ON]
        DS[..s Ghost stop]
        DH[..h Toggle HUD]
        DT[..t Stealth]
        DL[..l Line by line]
        DP[..p Paste ALL]
        DQ[..q Quit]
    end
    F9 -->|clipboard + Ctrl+V| PASTE[Ultra-fast paste\n2s countdown]
    DP -->|same as F9| PASTE`,
  },
  {
    title: "4 · F9 Paste Flow",
    code: `sequenceDiagram
    actor User
    participant HUD
    participant CB as Win32 Clipboard
    participant IDE as Target IDE

    User->>HUD: Press F9 or type ..p
    HUD->>HUD: Extract code from output
    alt No code ready
        HUD-->>User: Press F5 first
    else Code ready
        HUD-->>User: Pasting in 2s — click target
        HUD-->>User: Pasting in 1s — click target
        HUD->>CB: SetClipboardText full code
        HUD->>IDE: Simulate Ctrl+V
        IDE-->>User: Full code pasted instantly
        HUD-->>User: Pasted N chars done
    end`,
  },
  {
    title: "5 · License Activation Flow",
    code: `sequenceDiagram
    actor Admin
    actor User
    participant Panel as Admin Panel
    participant API as /api/validate
    participant DB as Supabase

    Admin->>Panel: Create license
    Panel->>DB: INSERT reg_key + gemini_key + model
    DB-->>Admin: Created OK

    User->>API: POST reg_key + machine_id
    API->>DB: SELECT license
    alt First activation
        API->>DB: UPDATE machine_id
        API-->>User: valid + gemini_key + model
    else Returning user
        API-->>User: valid welcome back
    else Wrong machine or expired
        API-->>User: valid false
    end
    User->>User: Fernet cache then spawn ctfmon.exe`,
  },
  {
    title: "6 · Security Model",
    code: `flowchart TD
    subgraph NEVER["❌ NEVER happens"]
        N1[Key written to disk]
        N2[Key in CLI args]
        N3[Key in env vars]
        N4[Key visible in process list]
    end
    subgraph ALWAYS["✅ ALWAYS happens"]
        A1[Key via stdin pipe only]
        A2[RAM only _RUNTIME_API_KEYS]
        A3[Alt+T wipes RAM then os exit]
        A4[HUD excluded from screen capture]
        A5[MAC address hardware lock]
        A6[Admin SHA-256 in Supabase]
    end`,
  },
];

const benchmarks = [
  ["Gemini 2.5 Flash", "~1-2s", "~2-4s", "AIza...", "✅ Production", "#4ade80"],
  ["Llama 3.3 70B (NIM)", "~2.2s", "~3.2s", "nvapi-...", "✅ Production", "#4ade80"],
  ["Minimax m2.7", "120s timeout", "120s", "nvapi-...", "❌ Removed", "#f87171"],
  ["GLM 4.7", "120s timeout", "120s", "nvapi-...", "❌ Removed", "#f87171"],
  ["DeepSeek V4 Flash", "~128s", "~128s", "nvapi-...", "❌ Removed", "#f87171"],
];

export default function DocsPage() {
  useEffect(() => {
    const load = () => {
      (window as any).mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          background: "#1a1d27",
          primaryColor: "#252836",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#3a3d4e",
          lineColor: "#a8b4ff",
          secondaryColor: "#1e2130",
          tertiaryColor: "#252836",
          edgeLabelBackground: "#1a1d27",
          clusterBkg: "#1e2130",
          titleColor: "#a8b4ff",
          nodeBorder: "#3a3d4e",
          mainBkg: "#252836",
        },
        flowchart: { curve: "basis", useMaxWidth: true },
        sequence: { actorMargin: 50, useMaxWidth: true },
      });
      // Small delay ensures all DOM nodes are painted
      setTimeout(() => {
        (window as any).mermaid.run();
      }, 100);
    };

    if ((window as any).mermaid) {
      load();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.onload = load;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div style={{ background: "#0f1117", minHeight: "100vh", padding: "40px 20px", fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#e2e8f0" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(168,180,255,0.08)", border: "1px solid rgba(168,180,255,0.2)", borderRadius: 999, padding: "6px 18px", marginBottom: 16 }}>
            <span>⚡</span>
            <span style={{ color: "#a8b4ff", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>TITAN v2.0 · Multi-Model AI</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", color: "#e2e8f0" }}>Ecosystem Visual Workflow</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>Hardware-Locked Licensing · Full Flow Diagrams · All Hotkeys</p>
        </div>

        {/* Diagrams */}
        {diagrams.map((d, i) => (
          <div key={i} style={{ background: "#1a1d27", border: "1px solid #2a2d3e", borderRadius: 16, padding: "24px 28px", marginBottom: 24 }}>
            <h2 style={{ color: "#a8b4ff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1px solid #2a2d3e" }}>
              {d.title}
            </h2>
            <div
              className="mermaid"
              style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}
              dangerouslySetInnerHTML={{ __html: d.code }}
            />
          </div>
        ))}

        {/* Benchmarks table */}
        <div style={{ background: "#1a1d27", border: "1px solid #2a2d3e", borderRadius: 16, padding: "24px 28px", marginBottom: 24 }}>
          <h2 style={{ color: "#a8b4ff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1px solid #2a2d3e" }}>
            7 · Performance Benchmarks (Tested 2026-05-12)
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#252836" }}>
                  {["Model", "MCQ", "Code", "Key Format", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benchmarks.map(([model, mcq, code, key, status, color], ri) => (
                  <tr key={ri} style={{ borderTop: "1px solid #2a2d3e" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>{model}</td>
                    <td style={{ padding: "10px 14px" }}>{mcq}</td>
                    <td style={{ padding: "10px 14px" }}>{code}</td>
                    <td style={{ padding: "10px 14px", color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>{key}</td>
                    <td style={{ padding: "10px 14px", color: color as string, fontWeight: 600 }}>{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#374151", fontSize: 11, marginTop: 24 }}>
          TITAN Ecosystem Docs · v2.0 · 2026-05-12
        </p>
      </div>
    </div>
  );
}
