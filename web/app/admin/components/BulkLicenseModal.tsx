"use client";

import React, { useState } from "react";
import { createBulkLicenses } from "../actions";

interface BulkLicenseModalProps {
  onClose: () => void;
  onSuccess: (keys: string[]) => void;
}

export function BulkLicenseModal({ onClose, onSuccess }: BulkLicenseModalProps) {
  const [count, setCount] = useState(10);
  const [trialDays, setTrialDays] = useState(30);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ keys: string[]; created: number } | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (count < 1 || count > 500) {
      setError("Count must be between 1 and 500");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await createBulkLicenses(count, trialDays, label);
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ keys: res.keys, created: res.created });
        onSuccess(res.keys);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate licenses";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const csv = ["reg_key,label,trial_days", ...result.keys.map((k) => `${k},"${label || ""}",${trialDays}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titan-licenses-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!result) return;
    const json = JSON.stringify(
      result.keys.map((k) => ({ reg_key: k, label: label || null, trial_days: trialDays })),
      null,
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titan-licenses-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#e5e5ea",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#8e8e93",
    marginBottom: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#1c1c1e",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.14)",
          padding: "28px",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e5e5ea",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              }}
            >
              Bulk License Generator
            </div>
            <div style={{ fontSize: 13, color: "#8e8e93", marginTop: 2 }}>
              Generate batches of 8-digit hardware-bound vouchers
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#98989e",
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        {!result ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={labelStyle}>Number of Keys to Mint</div>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>Validity Duration (Days)</div>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value) || 30)}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>Batch Label (Optional)</div>
                <input
                  type="text"
                  placeholder="e.g. Q1-University-Cohort"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  background: "rgba(255,69,58,0.12)",
                  borderRadius: "10px",
                  color: "#ff453a",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#e5e5ea",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: "11px",
                  borderRadius: "10px",
                  background: loading ? "rgba(10,132,255,0.4)" : "#0a84ff",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                }}
              >
                {loading ? `Minting ${count} Keys...` : `Mint ${count} Keys`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#30d158" }}>
                {result.created} Licenses Created Successfully!
              </div>
              <div style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
                Ready to distribute or export as CSV/JSON
              </div>
            </div>

            <div
              style={{
                background: "rgba(0,0,0,0.35)",
                borderRadius: "10px",
                padding: "12px",
                maxHeight: "160px",
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: 13,
                color: "#30d158",
                border: "1px solid rgba(48,209,88,0.2)",
                marginBottom: 18,
              }}
            >
              {result.keys.slice(0, 20).map((k) => (
                <div key={k}>{k}</div>
              ))}
              {result.keys.length > 20 && (
                <div style={{ color: "#636366" }}>... and {result.keys.length - 20} more</div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={exportCSV}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "rgba(48,209,88,0.15)",
                  border: "1px solid rgba(48,209,88,0.3)",
                  color: "#30d158",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                  fontWeight: 600,
                }}
              >
                Export CSV
              </button>
              <button
                onClick={exportJSON}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "rgba(10,132,255,0.15)",
                  border: "1px solid rgba(10,132,255,0.3)",
                  color: "#0a84ff",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                  fontWeight: 600,
                }}
              >
                Export JSON
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#e5e5ea",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
