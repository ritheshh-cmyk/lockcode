"use client";

import { useState, useEffect, useCallback } from "react";
import {
  verifyAdminPassword,
  fetchAllLicenses,
  createLicense,
  revokeLicense,
  resetLicense,
  deleteLicense,
  rotateApiKey,
  rotateGeminiKey,
  updateLanguage,
  type License,
} from "./actions";

// ════════════════════════════════════════════════════════════
// Admin Dashboard — Premium License Management
// ════════════════════════════════════════════════════════════

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#0a0a12] flex items-center justify-center p-4">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/8 rounded-full blur-[120px]" />

        <div className="relative bg-[#111118]/80 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-black/40">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">LockApp Admin</h1>
            <p className="text-sm text-white/30 mt-1">License Management Console</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthLoading(true);
              const ok = await verifyAdminPassword(password);
              if (ok) { setAuthenticated(true); setAuthError(""); }
              else { setAuthError("Invalid password"); }
              setAuthLoading(false);
            }}
          >
            <div className="relative mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all text-sm"
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-red-400/80 text-xs mb-3 text-center">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {authLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

// ── Main Dashboard ────────────────────────────────────────

function Dashboard() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<License | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllLicenses();
      setLicenses(data);
    } catch {
      showToast("Failed to load licenses", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadLicenses(); }, [loadLicenses]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRevoke(id: string) {
    setActionLoading(id);
    try { await revokeLicense(id); showToast("License revoked", "success"); await loadLicenses(); }
    catch { showToast("Failed to revoke", "error"); }
    setActionLoading(null);
  }

  async function handleReset(id: string) {
    setActionLoading(id);
    try { await resetLicense(id); showToast("Machine reset — re-activate allowed", "success"); await loadLicenses(); }
    catch { showToast("Failed to reset", "error"); }
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this license?")) return;
    setActionLoading(id);
    try { await deleteLicense(id); showToast("License deleted", "success"); await loadLicenses(); }
    catch { showToast("Failed to delete", "error"); }
    setActionLoading(null);
  }

  function getStatus(lic: License) {
    if (!lic.is_active) return { label: "Revoked", dot: "bg-red-400", text: "text-red-400", bg: "bg-red-400/8 border-red-400/15" };
    if (new Date(lic.expires_at) < new Date()) return { label: "Expired", dot: "bg-amber-400", text: "text-amber-400", bg: "bg-amber-400/8 border-amber-400/15" };
    return { label: "Active", dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/8 border-emerald-400/15" };
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function timeRemaining(lic: License) {
    const ms = new Date(lic.expires_at).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h`;
  }

  const activeCount = licenses.filter((l) => l.is_active && new Date(l.expires_at) >= new Date()).length;
  const revokedCount = licenses.filter((l) => !l.is_active).length;
  const expiredCount = licenses.filter((l) => l.is_active && new Date(l.expires_at) < new Date()).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0d0d1a] to-[#0a0a12] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-xl transition-all ${
          toast.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/[0.04] bg-white/[0.02] backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm shadow-lg shadow-indigo-500/20">
              🔒
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">LockApp</h1>
              <p className="text-[11px] text-white/30">License Management</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-500/15"
          >
            + Add Key
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Active Licenses" count={activeCount} color="emerald" icon="✓" />
          <StatCard label="Revoked" count={revokedCount} color="red" icon="✗" />
          <StatCard label="Expired" count={expiredCount} color="amber" icon="⏱" />
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] text-white/30 text-left text-xs uppercase tracking-wider">
                  <th className="px-5 py-4 font-medium">Key</th>
                  <th className="px-5 py-4 font-medium">Label</th>
                  <th className="px-5 py-4 font-medium">Groq Key</th>
                  <th className="px-5 py-4 font-medium">Gemini Key</th>
                  <th className="px-5 py-4 font-medium">Lang</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Time</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-white/20">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td></tr>
                ) : licenses.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-white/20">
                    No licenses yet. Click &quot;+ Add Key&quot; to create one.
                  </td></tr>
                ) : (
                  licenses.map((lic) => {
                    const status = getStatus(lic);
                    const isLoading = actionLoading === lic.id;
                    return (
                      <tr key={lic.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <code className="text-indigo-400 bg-indigo-400/8 px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider">
                            {lic.reg_key}
                          </code>
                        </td>
                        <td className="px-5 py-4 text-white/60 text-sm">
                          {lic.label || <span className="text-white/15 italic">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {lic.api_key ? (
                            <code className="text-amber-400/80 bg-amber-400/8 px-2 py-1 rounded-lg text-[10px] font-mono">
                              {lic.api_key.length > 16 ? lic.api_key.slice(0, 16) + "…" : lic.api_key}
                            </code>
                          ) : <span className="text-white/15 text-xs italic">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {lic.gemini_key ? (
                            <code className="text-cyan-400/80 bg-cyan-400/8 px-2 py-1 rounded-lg text-[10px] font-mono">
                              {lic.gemini_key.length > 16 ? lic.gemini_key.slice(0, 16) + "…" : lic.gemini_key}
                            </code>
                          ) : <span className="text-white/15 text-xs italic">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={lic.language || "Java"}
                            onChange={async (e) => { await updateLanguage(lic.id, e.target.value); loadLicenses(); }}
                            className="bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500/40 cursor-pointer"
                          >
                            {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l => <option key={l} value={l} className="bg-[#111]">{l}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${status.bg} ${status.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-white/40 text-xs font-mono">{timeRemaining(lic)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1.5 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                            <ActionBtn label="🔑" title="Rotate Keys" color="amber" loading={isLoading} onClick={() => setRotateTarget(lic)} />
                            {lic.is_active && <ActionBtn label="⛔" title="Revoke" color="red" loading={isLoading} onClick={() => handleRevoke(lic.id)} />}
                            {lic.machine_id && <ActionBtn label="🔄" title="Reset" color="blue" loading={isLoading} onClick={() => handleReset(lic.id)} />}
                            <ActionBtn label="🗑" title="Delete" color="gray" loading={isLoading} onClick={() => handleDelete(lic.id)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-white/15 text-xs">
          {licenses.length} total license{licenses.length !== 1 ? "s" : ""} • LockApp Admin v2.0
        </div>
      </main>

      {/* Modals */}
      {showModal && (
        <AddKeyModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); showToast("License key created!", "success"); loadLicenses(); }}
        />
      )}
      {rotateTarget && (
        <RotateKeyModal
          license={rotateTarget}
          onClose={() => setRotateTarget(null)}
          onSaved={() => { setRotateTarget(null); showToast("API key updated!", "success"); loadLicenses(); }}
        />
      )}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────

function StatCard({ label, count, color, icon }: { label: string; count: number; color: "emerald" | "red" | "amber"; icon: string }) {
  const colors = {
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/10 text-emerald-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/10 text-red-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/10 text-amber-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl px-5 py-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-xs font-medium mb-1">{label}</p>
          <p className={`text-3xl font-bold ${colors[color].split(" ").pop()}`}>{count}</p>
        </div>
        <span className="text-xl opacity-40">{icon}</span>
      </div>
    </div>
  );
}

// ── Action Button ──────────────────────────────────────────

function ActionBtn({ label, title, color, loading, onClick }: {
  label: string; title: string; color: "red" | "amber" | "blue" | "gray"; loading: boolean; onClick: () => void;
}) {
  const styles: Record<string, string> = {
    red: "hover:bg-red-400/10",
    amber: "hover:bg-amber-400/10",
    blue: "hover:bg-blue-400/10",
    gray: "hover:bg-white/5",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-30 ${styles[color]}`}
    >
      {loading ? "…" : label}
    </button>
  );
}

// ── Add Key Modal ──────────────────────────────────────────

function AddKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [regKey, setRegKey] = useState("");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [language, setLanguage] = useState("Java");
  const [trialDays, setTrialDays] = useState(0);
  const [trialHours, setTrialHours] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState("");
  const [error, setError] = useState("");

  function handleKeyInput(val: string) {
    setRegKey(val.replace(/\D/g, "").slice(0, 8));
  }

  async function handleCreate() {
    if (regKey.length !== 8) { setError("Key must be exactly 8 digits"); return; }
    if (trialDays <= 0 && trialHours <= 0) { setError("Set at least 1 day or 1 hour"); return; }
    setCreating(true); setError("");
    try {
      const result = await createLicense(regKey, label, trialDays, trialHours, apiKey, geminiKey, language);
      setCreatedKey(result.reg_key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create license");
    }
    setCreating(false);
  }

  const inputCls = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
        {!createdKey ? (
          <>
            <h2 className="text-lg font-bold mb-1 text-white">Add License Key</h2>
            <p className="text-white/25 text-sm mb-5">Create a new hardware-locked license</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/35 mb-1.5 font-medium">Registration Key</label>
                <input
                  type="text" value={regKey} onChange={(e) => handleKeyInput(e.target.value)}
                  placeholder="8-digit key" maxLength={8}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-indigo-400 font-mono text-lg tracking-[0.3em] placeholder-white/15 focus:outline-none focus:border-indigo-500/40 transition-all text-center"
                  autoFocus
                />
                <p className="text-xs text-white/20 mt-1 text-center">{regKey.length}/8</p>
              </div>
              <div>
                <label className="block text-xs text-white/35 mb-1.5 font-medium">Customer Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. John Doe" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-white/35 mb-1.5 font-medium">Groq API Key</label>
                <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="gsk_..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-amber-400 font-mono text-sm placeholder-white/15 focus:outline-none focus:border-amber-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-white/35 mb-1.5 font-medium">Gemini API Key</label>
                <input type="text" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-cyan-400 font-mono text-sm placeholder-white/15 focus:outline-none focus:border-cyan-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-white/35 mb-1.5 font-medium">Coding Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/40 cursor-pointer">
                  {["Java","Python","C++","C","JavaScript","C#","Go","Rust","Kotlin","Swift"].map(l => <option key={l} value={l} className="bg-[#111]">{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/35 mb-1.5 font-medium">Duration</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} min={0} className={inputCls} />
                    <p className="text-xs text-white/20 mt-1 text-center">Days</p>
                  </div>
                  <div className="flex-1">
                    <input type="number" value={trialHours} onChange={(e) => setTrialHours(Number(e.target.value))} min={0} max={23} className={inputCls} />
                    <p className="text-xs text-white/20 mt-1 text-center">Hours</p>
                  </div>
                </div>
              </div>
              {error && <p className="text-red-400/80 text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-sm text-white/40 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating || regKey.length !== 8}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-40 shadow-lg shadow-indigo-500/15">
                {creating ? "Creating..." : "Add Key"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-2">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <span className="text-emerald-400 text-xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Key Created</h2>
              <p className="text-white/30 text-sm mb-5">Share this key with the customer</p>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <code className="flex-1 text-indigo-400 font-mono text-lg tracking-[0.3em] text-center">{createdKey}</code>
              <button onClick={() => navigator.clipboard.writeText(createdKey)}
                className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                Copy
              </button>
            </div>
            <button onClick={onCreated}
              className="w-full mt-5 py-3 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-sm text-white/40 transition-colors cursor-pointer">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Rotate Keys Modal ──────────────────────────────────────

function RotateKeyModal({ license, onClose, onSaved }: { license: License; onClose: () => void; onSaved: () => void }) {
  const [newGroq, setNewGroq] = useState(license.api_key || "");
  const [newGemini, setNewGemini] = useState(license.gemini_key || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    try {
      await rotateApiKey(license.id, newGroq);
      await rotateGeminiKey(license.id, newGemini);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to update"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1 text-white">🔑 Rotate API Keys</h2>
        <p className="text-white/30 text-sm mb-5">
          <code className="text-indigo-400 font-mono">{license.reg_key}</code>
          {license.label && <span className="text-white/25"> — {license.label}</span>}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Groq API Key</label>
            <input type="text" value={newGroq} onChange={(e) => setNewGroq(e.target.value)} placeholder="gsk_..."
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-amber-400 font-mono text-sm placeholder-white/15 focus:outline-none focus:border-amber-500/40 transition-all"
              autoFocus />
          </div>
          <div>
            <label className="block text-xs text-white/35 mb-1.5 font-medium">Gemini API Key</label>
            <input type="text" value={newGemini} onChange={(e) => setNewGemini(e.target.value)} placeholder="AIza..."
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-cyan-400 font-mono text-sm placeholder-white/15 focus:outline-none focus:border-cyan-500/40 transition-all" />
          </div>
          {error && <p className="text-red-400/80 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-sm text-white/40 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl text-sm font-semibold text-black transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/15">
            {saving ? "Saving..." : "Save Keys"}
          </button>
        </div>
      </div>
    </div>
  );
}
