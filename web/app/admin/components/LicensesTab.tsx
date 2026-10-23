"use client";

import React, { useState, useEffect } from "react";
import {
  License,
  createLicense,
  revokeLicense,
  resetLicense,
  deleteLicense,
  updateLicense,
  getActiveClientPresence,
} from "../actions";
import { BulkLicenseModal } from "./BulkLicenseModal";

interface LicensesTabProps {
  licenses: License[];
  onRefresh: () => void;
}

export function LicensesTab({ licenses, onRefresh }: LicensesTabProps) {
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "revoked">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Form State
  const [customKey, setCustomKey] = useState("");
  const [durationDays, setDurationDays] = useState(1);
  const [language, setLanguage] = useState("Java");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live client presence state
  const [presence, setPresence] = useState<{ activeNow: string[]; activeToday: string[]; totalSeen: number }>({
    activeNow: [],
    activeToday: [],
    totalSeen: 0,
  });

  useEffect(() => {
    let mounted = true;
    const fetchPresence = async () => {
      try {
        const p = await getActiveClientPresence();
        if (mounted) setPresence(p);
      } catch {
        // silent
      }
    };
    fetchPresence();
    const iv = setInterval(fetchPresence, 10_000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  const now = new Date();

  // Categorize licenses
  const activeLicenses = licenses.filter(
    (l) => l.is_active && new Date(l.expires_at) > now
  );
  const expiredLicenses = licenses.filter(
    (l) => l.is_active && new Date(l.expires_at) <= now
  );
  const revokedLicenses = licenses.filter((l) => !l.is_active);

  const filteredLicenses = licenses.filter((l) => {
    const isExpired = new Date(l.expires_at) <= now;
    if (filter === "active" && (!l.is_active || isExpired)) return false;
    if (filter === "expired" && (!l.is_active || !isExpired)) return false;
    if (filter === "revoked" && l.is_active) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchKey = l.reg_key.includes(q);
      const matchLabel = (l.label || "").toLowerCase().includes(q);
      const matchLang = (l.language || "").toLowerCase().includes(q);
      if (!matchKey && !matchLabel && !matchLang) return false;
    }
    return true;
  });

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleGenerateRandomKey = () => {
    const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
    setCustomKey(random8);
  };

  const handleOpenAddModal = () => {
    handleGenerateRandomKey();
    setDurationDays(1);
    setLanguage("Java");
    setLabel("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const res = await createLicense({
      custom_key: customKey.trim() || undefined,
      days: Number(durationDays) || 1,
      label: label.trim() || undefined,
      language: language.trim() || "Java",
      model: "gemini",
    });

    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      onRefresh();
    } else {
      setErrorMsg(res.error || "Failed to create license.");
    }
  };

  const handleRevoke = async (regKey: string) => {
    if (confirm(`Revoke license key ${regKey}?`)) {
      await revokeLicense(regKey);
      onRefresh();
    }
  };

  const handleResetMachine = async (regKey: string) => {
    if (confirm(`Reset hardware lock for ${regKey}? Client can activate on a new machine.`)) {
      await resetLicense(regKey);
      onRefresh();
    }
  };

  const handleDelete = async (regKey: string) => {
    if (confirm(`Permanently delete license ${regKey}? This action cannot be undone.`)) {
      await deleteLicense(regKey);
      onRefresh();
    }
  };

  const handleExtend = async (l: License, hours: number) => {
    const currentExpiry = new Date(l.expires_at);
    const base = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base.getTime() + hours * 3600 * 1000).toISOString();
    await updateLicense(l.reg_key, { expires_at: newExpiry });
    onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* ── 1. Bento Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="apple-glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-[#86868b]">Total Registered</div>
          <div className="text-2xl font-bold tracking-tight text-white font-mono mt-1">
            {licenses.length}
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-emerald-400">Valid Licenses</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono mt-1">
            {activeLicenses.length}
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5 border border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Presence (5m)</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono mt-1">
            {presence.activeNow.length} <span className="text-xs text-white/50 font-normal">online</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-amber-400">Expired</div>
          <div className="text-2xl font-bold tracking-tight text-amber-400 font-mono mt-1">
            {expiredLicenses.length}
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-[11px] font-medium text-red-400">Revoked</div>
          <div className="text-2xl font-bold tracking-tight text-red-400 font-mono mt-1">
            {revokedLicenses.length}
          </div>
        </div>
      </div>

      {/* ── 2. Filter & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#86868b]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search key, user label, language..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Cupertino Segmented Filter */}
          <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center space-x-1 text-xs">
            {(["all", "active", "expired", "revoked"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                  filter === tab
                    ? "bg-white/[0.15] text-white shadow-sm"
                    : "text-[#86868b] hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="apple-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">layers</span>
            <span>Bulk Mint</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="apple-btn-primary px-4 py-2 text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap shadow-lg shadow-[#0a84ff]/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New License</span>
          </button>
        </div>
      </div>

      {/* ── 3. Licenses Table / Liquid Glass Cards ── */}
      {filteredLicenses.length === 0 ? (
        <div className="apple-glass-card rounded-2xl p-12 text-center text-[#86868b]">
          <span className="material-symbols-outlined text-[28px] opacity-40 mb-2">vpn_key_off</span>
          <p className="text-xs">No licenses match the current filter or search criteria.</p>
        </div>
      ) : (
        <div className="apple-glass-card rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/[0.08] text-[#86868b] font-medium">
                <tr>
                  <th className="py-3 px-4">Registration Key</th>
                  <th className="py-3 px-4">Label / Customer</th>
                  <th className="py-3 px-4">Hardware Binding</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Expiry Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLicenses.map((l) => {
                  const expiryDate = new Date(l.expires_at);
                  const isExpired = expiryDate <= now;
                  const isOnline = presence.activeNow.includes(l.reg_key);
                  const msRemaining = expiryDate.getTime() - now.getTime();
                  const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 3600)));
                  const daysRemaining = Math.floor(hoursRemaining / 24);

                  let statusPill = (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      {daysRemaining > 0 ? `${daysRemaining}d ${hoursRemaining % 24}h` : `${hoursRemaining}h remaining`}
                    </span>
                  );

                  if (!l.is_active) {
                    statusPill = (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                        Revoked
                      </span>
                    );
                  } else if (isExpired) {
                    statusPill = (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                        Expired
                      </span>
                    );
                  }

                  return (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Key */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-bold tracking-wider text-white px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08]">
                            {l.reg_key}
                          </span>
                          {isOnline && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30 animate-pulse"
                              title="Active in the last 5 minutes"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              LIVE
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(l.reg_key)}
                            className="p-1 rounded-lg text-[#86868b] hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="Copy Key"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {copiedKey === l.reg_key ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Label */}
                      <td className="py-3.5 px-4 font-medium text-white/90">
                        {l.label || <span className="text-[#86868b] italic">No note</span>}
                      </td>

                      {/* Machine ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#86868b]">
                        {l.machine_id ? (
                          <div className="flex items-center space-x-1.5" title={l.machine_id}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="truncate max-w-[120px]">{l.machine_id.slice(0, 12)}...</span>
                          </div>
                        ) : (
                          <span className="text-white/40 italic">Unlocked</span>
                        )}
                      </td>

                      {/* Language */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] text-white/80">
                          {l.language || "Java"}
                        </span>
                      </td>

                      {/* Expiry Status */}
                      <td className="py-3.5 px-4">
                        {statusPill}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {l.machine_id && (
                            <button
                              onClick={() => handleResetMachine(l.reg_key)}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-[#86868b] hover:text-white transition-colors"
                              title="Reset machine binding"
                            >
                              Reset HWID
                            </button>
                          )}

                          <button
                            onClick={() => handleExtend(l, 24)}
                            className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-[#86868b] hover:text-white transition-colors"
                            title="Extend 24 hours"
                          >
                            +24h
                          </button>

                          {l.is_active && (
                            <button
                              onClick={() => handleRevoke(l.reg_key)}
                              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-[11px] text-[#86868b] hover:text-red-400 transition-colors"
                              title="Revoke license"
                            >
                              Revoke
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(l.reg_key)}
                            className="p-1 rounded-lg text-[#86868b] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete permanently"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Add License Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#1c1c1e]/90 border border-white/[0.12] shadow-2xl p-6 sm:p-8 backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Create Client License
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[#86868b] hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Key Input with Randomize */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#86868b]">
                    8-Digit Registration Key
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomKey}
                    className="text-[11px] text-[#0a84ff] hover:underline"
                  >
                    Regenerate Key
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={8}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value.replace(/\D/g, ""))}
                  placeholder="8-digit number"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-mono font-bold tracking-widest text-white focus:outline-none focus:border-[#0a84ff]"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Validity Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "24 Hours", days: 1 },
                    { label: "7 Days", days: 7 },
                    { label: "30 Days", days: 30 },
                  ].map((d) => (
                    <button
                      key={d.days}
                      type="button"
                      onClick={() => setDurationDays(d.days)}
                      className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                        durationDays === d.days
                          ? "bg-white/[0.15] border-white/30 text-white shadow-sm"
                          : "bg-white/[0.04] border-white/[0.06] text-[#86868b]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Default Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
                >
                  <option value="Java" className="bg-[#1c1c1e]">Java</option>
                  <option value="Python" className="bg-[#1c1c1e]">Python</option>
                  <option value="C++" className="bg-[#1c1c1e]">C++</option>
                  <option value="C#" className="bg-[#1c1c1e]">C#</option>
                  <option value="JavaScript" className="bg-[#1c1c1e]">JavaScript</option>
                </select>
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  User Note / Customer Name <span className="text-white/40">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. John Doe / Room 402"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="apple-btn-secondary px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="apple-btn-primary px-5 py-2 text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>Create License</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Bulk Mint Modal */}
      {bulkModalOpen && (
        <BulkLicenseModal
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => {
            setBulkModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
