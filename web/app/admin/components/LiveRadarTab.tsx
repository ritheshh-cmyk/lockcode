"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface LiveEvent {
  id: string;
  type: "query" | "error" | "provider_change" | "license_check" | "connected";
  timestamp: string;
  provider?: string;
  model?: string;
  mode?: string;
  reg_key?: string;
  latency_ms?: number;
  tokens?: { prompt: number; completion: number; total: number };
  success?: boolean;
  error?: string;
  message?: string;
}

const MAX_EVENTS = 60;

const modeColor: Record<string, string> = {
  code: "#30d158",
  mcq: "#0a84ff",
  explain: "#bf5af2",
  format: "#ff9f0a",
  raw: "#98989e",
};

const providerIcon: Record<string, string> = {
  groq: "⚡",
  gemini: "✦",
  openai: "◉",
  anthropic: "△",
  deepseek: "◈",
  cerebras: "◎",
  openrouter: "⊕",
  custom: "◌",
};

export function LiveRadarTab() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0, avgLatency: 0 });
  const esRef = useRef<EventSource | null>(null);
  const latencySumRef = useRef(0);
  const latencyCountRef = useRef(0);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "lockapp-admin-token-2026";
    const es = new EventSource(`/api/admin/stream?token=${token}`);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setReconnecting(false);
    };

    es.onmessage = (e) => {
      try {
        const event: LiveEvent = JSON.parse(e.data);
        if (event.type === "connected") return;

        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));

        if (event.type === "query" || event.type === "error") {
          setStats((prev) => {
            const isOk = event.success !== false;
            const newSuccess = prev.success + (isOk ? 1 : 0);
            const newErrors = prev.errors + (!isOk ? 1 : 0);
            const newTotal = prev.total + 1;
            if (event.latency_ms) {
              latencySumRef.current += event.latency_ms;
              latencyCountRef.current += 1;
            }
            const avgLatency =
              latencyCountRef.current > 0
                ? Math.round(latencySumRef.current / latencyCountRef.current)
                : 0;
            return { total: newTotal, success: newSuccess, errors: newErrors, avgLatency };
          });
        }
      } catch {
        // Ignore unparseable frames
      }
    };

    es.onerror = () => {
      setConnected(false);
      setReconnecting(true);
      es.close();
      // Auto-reconnect after 4s
      setTimeout(() => connect(), 4000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  const clearEvents = () => {
    setEvents([]);
    setStats({ total: 0, success: 0, errors: 0, avgLatency: 0 });
    latencySumRef.current = 0;
    latencyCountRef.current = 0;
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: connected ? "#30d158" : reconnecting ? "#ff9f0a" : "#ff453a",
              boxShadow: connected ? "0 0 10px #30d158" : "none",
            }}
          />
          <span
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
              fontSize: 14,
              color: "#e5e5ea",
              fontWeight: 600,
            }}
          >
            {connected
              ? "Live Radar — Connected (SSE Active)"
              : reconnecting
              ? "Reconnecting to live telemetry stream..."
              : "Disconnected"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={clearEvents}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              color: "#98989e",
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            }}
          >
            Clear Log
          </button>
          {!connected && (
            <button
              onClick={connect}
              style={{
                background: "#0a84ff",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                padding: "6px 14px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
              }}
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Live Requests", value: stats.total, color: "#0a84ff" },
          { label: "Successful", value: stats.success, color: "#30d158" },
          { label: "Faults", value: stats.errors, color: "#ff453a" },
          { label: "Rolling Latency", value: `${stats.avgLatency}ms`, color: "#ff9f0a" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "14px",
              padding: "16px 18px",
              border: "1px solid rgba(255,255,255,0.07)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: s.color,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8e8e93",
                marginTop: 4,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 500,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Event Stream Container */}
      <div
        style={{
          background: "rgba(10,10,12,0.6)",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          maxHeight: "500px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12,
            fontWeight: 600,
            color: "#636366",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Real-Time Activity Stream</span>
          <span>{events.length} events logged</span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {events.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                color: "#636366",
                fontSize: 14,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
              <div style={{ color: "#e5e5ea", fontWeight: 500 }}>Live Radar Standby</div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#636366" }}>
                Queries executed by TITAN will stream here instantly via Server-Sent Events.
              </div>
            </div>
          ) : (
            events.map((event, idx) => (
              <div
                key={event.id || idx}
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  background: idx === 0 ? "rgba(10,132,255,0.06)" : "transparent",
                  transition: "background 0.3s",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {providerIcon[event.provider || ""] || "◌"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#e5e5ea",
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                        textTransform: "capitalize",
                      }}
                    >
                      {event.provider || event.type}
                    </span>
                    {event.mode && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: "5px",
                          background: `${modeColor[event.mode] || "#98989e"}22`,
                          color: modeColor[event.mode] || "#98989e",
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 700,
                        }}
                      >
                        {event.mode}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: "5px",
                        background:
                          event.success !== false
                            ? "rgba(48,209,88,0.15)"
                            : "rgba(255,69,58,0.15)",
                        color: event.success !== false ? "#30d158" : "#ff453a",
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                        fontWeight: 700,
                      }}
                    >
                      {event.success !== false ? "SUCCESS" : "FAULT"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#8e8e93",
                      marginTop: 4,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Mono', 'Monaco', monospace",
                      display: "flex",
                      gap: "14px",
                      flexWrap: "wrap",
                    }}
                  >
                    {event.model && <span>{event.model}</span>}
                    {event.latency_ms !== undefined && (
                      <span style={{ color: "#ff9f0a" }}>{event.latency_ms}ms</span>
                    )}
                    {event.tokens && (
                      <span style={{ color: "#0a84ff" }}>{event.tokens.total} tokens</span>
                    )}
                    {event.reg_key && (
                      <span style={{ color: "#636366" }}>
                        key:{event.reg_key === "anonymous" ? "anon" : `${event.reg_key.slice(0, 4)}…`}
                      </span>
                    )}
                  </div>

                  {event.error && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#ff453a",
                        marginTop: 4,
                        fontFamily: "monospace",
                      }}
                    >
                      {event.error}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#636366",
                    flexShrink: 0,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Mono', 'Monaco', monospace",
                  }}
                >
                  {formatTime(event.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
