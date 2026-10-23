"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  verifyAdminPassword,
  fetchAllLicenses,
  createLicense,
  revokeLicense,
  resetLicense,
  deleteLicense,
  terminateLicense,
  updateLicense,
  updateLanguage,
  fetchPoolKeys,
  fetchFreePoolKeys,
  addPoolKeys,
  markPoolKeysUsed,
  setPoolKeyUsed,
  removePoolKey,
  clearPoolKeys,
  testAllPoolKeys,
  testPoolKeys,
  testSinglePoolKey,
  updatePoolKeyLabel,
  type License,
  type PoolKey,
} from "./actions";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("titan_auth") === "1") {
      setAuthenticated(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const ok = await verifyAdminPassword(password);
      if (ok) {
        sessionStorage.setItem("titan_auth", "1");
        setAuthenticated(true);
      } else {
        setAuthError("Invalid master passcode.");
      }
    } catch {
      setAuthError("Authentication service unavailable.");
    } finally {
      setAuthLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans antialiased text-[#f5f5f7]">
        {/* Apple Specular Ambient Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-[#0a84ff]/12 rounded-full blur-[140px]" />
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#5e5ce6]/10 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm apple-glass rounded-3xl p-8 sm:p-9 shadow-2xl border border-white/[0.1] animate-entrance">
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0c] border border-white/[0.12] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-black/50">
              <span className="material-symbols-outlined text-[#0a84ff] text-[32px]">lock</span>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">TITAN Vault</h1>
            <p className="text-xs text-[#86868b] mt-1">Operator Master Key Required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError("");
                }}
                placeholder="Enter Passcode"
                className="w-full px-4 py-3 bg-black/40 border border-white/[0.1] rounded-2xl text-center text-sm font-mono text-white placeholder-[#636366] focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all tracking-wider"
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              )}
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-[#ff453a]/12 border border-[#ff453a]/25 text-[#ff453a] text-xs text-center flex items-center justify-center space-x-1.5 animate-fade-in">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full apple-btn-primary py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {authLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <span>Unlock Vault</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-[10px] text-[#636366] uppercase tracking-widest font-mono">
              Hardware Lock · Vercel Edge Bridge
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard onLogout={() => { sessionStorage.removeItem("titan_auth"); setAuthenticated(false); }} />;
}

type Page = "overview" | "keyvault" | "history" | "apikeypool" | "audit" | "api" | "support" | "security" | "docs";

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  color,
  icon,
  cls,
}: {
  label: string;
  value: number | string;
  delta: string;
  deltaLabel: string;
  color: "success" | "error" | "warning";
  icon: string;
  cls?: string;
}) {
  const c = {
    success: { t: "text-[#30d158]", b: "bg-[#30d158]/12 border-[#30d158]/20", dot: "bg-[#30d158]" },
    error:   { t: "text-[#ff453a]", b: "bg-[#ff453a]/12 border-[#ff453a]/20", dot: "bg-[#ff453a]" },
    warning: { t: "text-[#ff9f0a]", b: "bg-[#ff9f0a]/12 border-[#ff9f0a]/20", dot: "bg-[#ff9f0a]" },
  }[color];

  return (
    <div className={`apple-glass-card p-5 rounded-2xl relative overflow-hidden group ${cls || ""}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-medium text-[#86868b] mb-1 uppercase tracking-wider">{label}</p>
          <h3 className="text-3xl sm:text-4xl font-light text-white leading-tight tracking-tight">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-2xl ${c.b} border flex items-center justify-center ${c.t} shadow-sm`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.b} ${c.t} border flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {delta}
        </span>
        <span className="text-[#86868b] text-xs">{deltaLabel}</span>
      </div>
    </div>
  );
}

function NavLink({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl transition-all duration-150 text-left cursor-pointer ${
        active
          ? "bg-white/[0.12] text-white font-medium shadow-sm border border-white/[0.08]"
          : "text-[#86868b] hover:bg-white/[0.05] hover:text-[#f5f5f7]"
      }`}
    >
      <span className={`material-symbols-outlined text-[19px] ${active ? "text-[#0a84ff]" : "text-[#86868b]"}`}>{icon}</span>
      <span className="text-xs font-medium tracking-tight flex-1 truncate">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" />}
    </button>
  );
}

function OverviewPage({
  licenses,
  loading,
  loadLicenses,
  onEdit,
  onRevoke,
  onTerminate,
  onReset,
  onDelete,
  actionLoading,
}: {
  licenses: License[];
  loading: boolean;
  loadLicenses: () => Promise<void>;
  onEdit: (l: License) => void;
  onRevoke: (id: string) => void;
  onTerminate: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "revoked">("all");
  const [statFilter, setStatFilter] = useState<"" | "active" | "expired" | "missing">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function getStatus(lic: License) {
    if (!lic.is_active) return { label: "Revoked", cls: "bg-[#ff453a]/12 border-[#ff453a]/25 text-[#ff453a]", dot: "bg-[#ff453a]", key: "revoked" };
    if (new Date(lic.expires_at) < new Date()) return { label: "Expired", cls: "bg-[#ff9f0a]/12 border-[#ff9f0a]/25 text-[#ff9f0a]", dot: "bg-[#ff9f0a]", key: "expired" };
    return { label: "Active", cls: "bg-[#30d158]/12 border-[#30d158]/25 text-[#30d158]", dot: "bg-[#30d158]", key: "active" };
  }

  function timeAgo(d: string | null) {
    if (!d) return "—";
    const ts = new Date(d).getTime();
    if (isNaN(ts)) return "—";
    const h = Math.floor((Date.now() - ts) / 3600000);
    return h < 24 ? h + "h ago" : Math.floor(h / 24) + "d ago";
  }

  const active = licenses.filter((l) => l.is_active && new Date(l.expires_at) >= new Date()).length;
  const expired = licenses.filter((l) => l.is_active && new Date(l.expires_at) < new Date()).length;
  const missing = licenses.filter((l) => !l.gemini_key).length;

  const filtered = licenses.filter((lic) => {
    const s = getStatus(lic);
    if (statFilter === "active" && s.key !== "active") return false;
    if (statFilter === "expired" && s.key !== "expired") return false;
    if (statFilter === "missing" && lic.gemini_key) return false;
    if (statusFilter !== "all" && s.key !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        lic.reg_key.includes(q) ||
        (lic.label || "").toLowerCase().includes(q) ||
        (lic.machine_id || "").toLowerCase().includes(q) ||
        (lic.language || "").toLowerCase().includes(q) ||
        (lic.model || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalFiltered = filtered.length;
  const safePageSize = pageSize === "all" ? Math.max(1, totalFiltered) : (pageSize as number);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / safePageSize));
  const paginated = pageSize === "all" ? filtered : filtered.slice((currentPage - 1) * safePageSize, currentPage * safePageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, statFilter, pageSize]);

  function copyKey(k: string) {
    navigator.clipboard.writeText(k);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function exportCSV() {
    const headers = ["Key", "Label", "API Key", "Machine ID", "Model", "Language", "Status", "Expires", "Created"];
    const rows = filtered.map((lic) => [
      lic.reg_key,
      lic.label || "",
      lic.gemini_key || "",
      lic.machine_id || "",
      lic.model || "gemini",
      lic.language || "Java",
      getStatus(lic).label,
      new Date(lic.expires_at).toLocaleString(),
      lic.created_at ? new Date(lic.created_at).toLocaleString() : "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `licenses_export_${Date.now()}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Bento Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Active Licenses"
          value={active}
          delta={`${active}`}
          deltaLabel="operational"
          color="success"
          icon="check_circle"
        />
        <StatCard
          label="Expired"
          value={expired}
          delta={`+${expired}`}
          deltaLabel="trial concluded"
          color="warning"
          icon="schedule"
        />
        <StatCard
          label="Missing API Key"
          value={missing}
          delta={missing > 0 ? "Attention" : "None"}
          deltaLabel="unassigned"
          color="error"
          icon="key_off"
        />
      </div>

      {/* Main License Console Card */}
      <div className="apple-glass rounded-2xl overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Apple Segmented Control */}
            <div className="bg-black/50 p-1 rounded-xl flex border border-white/[0.08] text-xs font-medium">
              {(["all", "active", "expired", "revoked"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setStatusFilter(tab); setStatFilter(""); }}
                  className={`px-3 py-1 rounded-lg transition-all capitalize ${
                    statusFilter === tab
                      ? "bg-white/[0.14] text-white shadow-sm border border-white/[0.08]"
                      : "text-[#86868b] hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {statFilter && (
              <button
                onClick={() => setStatFilter("")}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-[#0a84ff] flex items-center gap-1"
              >
                <span>Filter: {statFilter}</span>
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}

            <button
              onClick={exportCSV}
              className="apple-btn-secondary px-3 py-1 text-xs font-medium flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b] text-[16px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search key, label, machine…"
                className="w-full bg-black/40 border border-white/[0.1] rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-[#636366] focus:outline-none focus:border-[#0a84ff] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                </button>
              )}
            </div>

            <select
              value={String(pageSize)}
              onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-black/40 border border-white/[0.1] rounded-xl py-1.5 px-2.5 text-xs text-[#86868b] focus:outline-none focus:border-[#0a84ff] cursor-pointer"
            >
              <option value="10" className="bg-[#1c1c1e]">10 / page</option>
              <option value="25" className="bg-[#1c1c1e]">25 / page</option>
              <option value="50" className="bg-[#1c1c1e]">50 / page</option>
              <option value="all" className="bg-[#1c1c1e]">All</option>
            </select>
          </div>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden divide-y divide-white/[0.06]">
          {loading ? (
            <div className="py-12 text-center text-[#86868b] flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin" />
              <span>Loading licenses…</span>
            </div>
          ) : paginated.length === 0 ? (
            <p className="py-12 text-center text-[#86868b] text-xs">No licenses found.</p>
          ) : (
            paginated.map((lic) => {
              const s = getStatus(lic);
              const busy = actionLoading === lic.id;
              return (
                <div key={lic.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.1] text-white">
                      {lic.reg_key}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${s.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#86868b]">Label: </span>
                      <span className="text-white font-medium">{lic.label || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Lang: </span>
                      <span className="text-white font-medium">{lic.language || "Java"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <span className="text-[11px] text-[#86868b]">{timeAgo(lic.created_at || null)}</span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/history?key=${lic.reg_key}`}
                        target="_blank"
                        className="p-1.5 text-[#0a84ff] hover:bg-white/[0.08] rounded-lg"
                        title="Token History"
                      >
                        <span className="material-symbols-outlined text-[17px]">monitoring</span>
                      </Link>
                      <button
                        onClick={() => onEdit(lic)}
                        disabled={busy}
                        className="p-1.5 text-white hover:bg-white/[0.08] rounded-lg"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                      <button
                        onClick={() => onDelete(lic.id)}
                        disabled={busy}
                        className="p-1.5 text-[#ff453a] hover:bg-white/[0.08] rounded-lg"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white/[0.03] border-b border-white/[0.06] text-[#86868b] font-medium uppercase tracking-wider">
              <tr>
                {["Key", "Label", "API Key", "Machine ID", "Language", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-[11px] ${h === "Actions" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-[#86868b]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin" />
                      <span>Loading licenses…</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-[#86868b]">
                    {search || statusFilter !== "all" || statFilter ? "No licenses match your filters." : "No licenses yet."}
                  </td>
                </tr>
              ) : (
                paginated.map((lic) => {
                  const s = getStatus(lic);
                  const busy = actionLoading === lic.id;
                  return (
                    <tr key={lic.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-white bg-white/[0.08] px-2.5 py-1 rounded-lg border border-white/[0.1]">
                            {lic.reg_key}
                          </span>
                          <button
                            onClick={() => copyKey(lic.reg_key)}
                            className="p-1 text-[#86868b] opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
                            title="Copy Key"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedKey === lic.reg_key ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-medium truncate max-w-[120px]">
                        {lic.label || <span className="text-[#636366] italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {lic.gemini_key ? (
                          <span className="font-mono text-[11px] text-[#64d2ff] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#64d2ff]" />
                            {lic.gemini_key.slice(0, 10)}…
                          </span>
                        ) : (
                          <span className="text-[#ff9f0a] font-mono text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            Unset
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#86868b] text-[11px] max-w-[100px] truncate">
                        {lic.machine_id ? lic.machine_id.slice(0, 12) + "…" : <span className="italic text-[#636366]">Unbound</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lic.language || "Java"}
                          onChange={async (e) => {
                            await updateLanguage(lic.id, e.target.value);
                            await loadLicenses();
                          }}
                          className="bg-transparent border-none text-xs text-[#86868b] hover:text-white focus:ring-0 cursor-pointer outline-none"
                        >
                          {["Java", "Python", "C++", "C", "JavaScript", "C#", "Go", "Rust", "Kotlin", "Swift"].map((l) => (
                            <option key={l} value={l} className="bg-[#1c1c1e] text-white">
                              {l}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 w-fit ${s.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#86868b] text-xs">
                        {timeAgo(lic.created_at || null)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/history?key=${lic.reg_key}`}
                            target="_blank"
                            title="Token Telemetry"
                            className="p-1.5 hover:text-[#0a84ff] text-[#86868b] transition-colors rounded-lg hover:bg-white/[0.08]"
                          >
                            <span className="material-symbols-outlined text-[17px]">monitoring</span>
                          </Link>
                          <button
                            disabled={busy}
                            onClick={() => onEdit(lic)}
                            title="Edit License"
                            className="p-1.5 hover:text-white text-[#86868b] transition-colors rounded-lg hover:bg-white/[0.08] disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                          {lic.is_active && (
                            <button
                              disabled={busy}
                              onClick={() => onRevoke(lic.id)}
                              title="Revoke License"
                              className="p-1.5 hover:text-[#ff9f0a] text-[#86868b] transition-colors rounded-lg hover:bg-white/[0.08] disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-[17px]">block</span>
                            </button>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => onTerminate(lic.id)}
                            title="Expire Instantly"
                            className="p-1.5 hover:text-[#ff453a] text-[#86868b] transition-colors rounded-lg hover:bg-white/[0.08] disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[17px]">timer_off</span>
                          </button>
                          {lic.machine_id && (
                            <button
                              disabled={busy}
                              onClick={() => onReset(lic.id)}
                              title="Reset Machine Binding"
                              className="p-1.5 hover:text-[#64d2ff] text-[#86868b] transition-colors rounded-lg hover:bg-white/[0.08] disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-[17px]">restart_alt</span>
                            </button>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => onDelete(lic.id)}
                            title="Delete Permanently"
                            className="p-1.5 hover:text-[#ff453a] text-[#86868b] transition-colors rounded-lg hover:bg-white/[0.08] disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Apple Pagination Bar */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#86868b] bg-white/[0.01]">
          <p>
            {pageSize === "all"
              ? `All ${totalFiltered} entries`
              : `${Math.min((currentPage - 1) * safePageSize + 1, totalFiltered)}–${Math.min(currentPage * safePageSize, totalFiltered)} of ${totalFiltered} licenses`}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || pageSize === "all"}
              className="p-1.5 rounded-lg border border-white/[0.1] hover:bg-white/[0.08] disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="px-2 font-mono text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || pageSize === "all"}
              className="p-1.5 rounded-lg border border-white/[0.1] hover:bg-white/[0.08] disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Integrated Token History Tab ---
function AdminTokenHistoryTab({ licenses }: { licenses: License[] }) {
  const [selectedKey, setSelectedKey] = useState(licenses[0]?.reg_key || "");
  const [customKey, setCustomKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    reg_key: string;
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    requests_stored: number;
    requests: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeyHistory = async (k: string) => {
    if (!k || k.length !== 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?reg_key=${encodeURIComponent(k)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "No data available for this key.");
        setData(null);
      } else {
        setData(json.data);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedKey) fetchKeyHistory(selectedKey);
  }, [selectedKey]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">Token Consumption & Request Telemetry</h2>
          <p className="text-xs text-[#86868b] mt-0.5">Live prompt inspection and circular 10-query retention per machine license</p>
        </div>
        <Link
          href={`/history${selectedKey ? `?key=${selectedKey}` : ""}`}
          target="_blank"
          className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          <span>Open Standalone Portal</span>
        </Link>
      </div>

      {/* Key Selector Bar */}
      <div className="apple-glass rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">Select Active License</label>
          <select
            value={selectedKey}
            onChange={(e) => {
              setSelectedKey(e.target.value);
              setCustomKey("");
            }}
            className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a84ff]"
          >
            {licenses.map((lic) => (
              <option key={lic.id} value={lic.reg_key} className="bg-[#1c1c1e] text-white">
                {lic.reg_key} {lic.label ? `— ${lic.label}` : ""} ({lic.language || "Java"})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-64">
          <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">Or Enter Any 8-Digit Key</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="12345678"
              maxLength={8}
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value.replace(/\D/g, ""))}
              className="flex-1 bg-black/40 border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-[#636366] focus:outline-none focus:border-[#0a84ff]"
            />
            <button
              onClick={() => {
                if (customKey.length === 8) {
                  setSelectedKey(customKey);
                  fetchKeyHistory(customKey);
                }
              }}
              disabled={customKey.length !== 8 || loading}
              className="apple-btn-primary px-3.5 py-2 text-xs font-medium disabled:opacity-40"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-[#86868b] flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin" />
          <span>Fetching token metrics…</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-[#ff453a]/10 border border-[#ff453a]/25 text-[#ff453a] text-xs">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="apple-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Total Tokens</p>
              <p className="text-2xl font-light text-white tracking-tight">{data.total_tokens.toLocaleString()}</p>
            </div>
            <div className="apple-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Prompt Tokens</p>
              <p className="text-2xl font-light text-white tracking-tight">{data.total_prompt_tokens.toLocaleString()}</p>
            </div>
            <div className="apple-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Output Tokens</p>
              <p className="text-2xl font-light text-[#30d158] tracking-tight">{data.total_completion_tokens.toLocaleString()}</p>
            </div>
            <div className="apple-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Stored Buffer</p>
              <p className="text-2xl font-light text-white tracking-tight">{data.requests_stored} / 10</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.requests.map((item, idx) => {
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} className="apple-glass-card rounded-2xl overflow-hidden">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-[#86868b] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                            item.mode === "mcq" ? "bg-[#bf5af2]/15 text-[#bf5af2] border-[#bf5af2]/30" : "bg-[#0a84ff]/15 text-[#0a84ff] border-[#0a84ff]/30"
                          }`}>
                            {item.mode}
                          </span>
                          <span className="text-xs text-white font-medium truncate">{item.model}</span>
                        </div>
                        <p className="text-[11px] text-[#86868b] mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-white">{item.tokens_total} tokens</p>
                        <p className="text-[10px] text-[#86868b]">{item.latency_ms}ms</p>
                      </div>
                      <span className={`material-symbols-outlined text-[16px] text-[#86868b] transition-transform ${isExpanded ? "rotate-90 text-white" : ""}`}>
                        chevron_right
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3 bg-black/30">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-[#86868b]">Prompt Sent</span>
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(item.prompt, `p-${item.id}`); }} className="apple-btn-secondary px-2 py-0.5 text-[10px]">
                            {copiedId === `p-${item.id}` ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-[#f5f5f7] whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {item.prompt}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-[#30d158]">Response Received</span>
                          {item.response && (
                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(item.response, `r-${item.id}`); }} className="apple-btn-secondary px-2 py-0.5 text-[10px]">
                              {copiedId === `r-${item.id}` ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                        <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-[#30d158] whitespace-pre-wrap max-h-60 overflow-y-auto">
                          {item.response || "(No response captured)"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Key Vault Page ---
function KeyVaultPage({
  licenses,
  loading,
  onEdit,
  onRevoke,
  onTerminate,
  onReset,
  onDelete,
  actionLoading,
}: {
  licenses: License[];
  loading: boolean;
  onEdit: (l: License) => void;
  onRevoke: (id: string) => void;
  onTerminate: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Key Vault</h2>
        <p className="text-xs text-[#86868b] mt-0.5">High-security overview of all hardware-locked machine credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {licenses.map((lic) => {
          const isActive = lic.is_active && new Date(lic.expires_at) >= new Date();
          return (
            <div key={lic.id} className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-semibold text-white bg-white/[0.08] px-2.5 py-1 rounded-lg border border-white/[0.1]">
                    {lic.reg_key}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isActive ? "bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30" : "bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30"
                  }`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">{lic.label || "Unlabeled License"}</h3>
                <p className="text-xs text-[#86868b] font-mono mb-3">
                  Machine: {lic.machine_id ? lic.machine_id.slice(0, 16) + "…" : "Unbound"}
                </p>
                <div className="space-y-1 text-xs text-[#86868b]">
                  <p>Language: <span className="text-white">{lic.language || "Java"}</span></p>
                  <p>Expires: <span className="text-white">{new Date(lic.expires_at).toLocaleDateString()}</span></p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <Link
                  href={`/history?key=${lic.reg_key}`}
                  target="_blank"
                  className="apple-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">monitoring</span>
                  <span>Telemetry</span>
                </Link>
                <button
                  onClick={() => onEdit(lic)}
                  className="apple-btn-secondary px-2.5 py-1 text-xs"
                >
                  Manage
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Audit Logs Page ---
function AuditLogsPage({ licenses, loading }: { licenses: License[]; loading: boolean }) {
  const events = licenses.flatMap((l) => [
    { time: l.created_at || "", action: "Key Created", key: l.reg_key, detail: l.label || "No label", icon: "add_circle", color: "text-[#30d158]" },
    ...(l.machine_id ? [{ time: l.created_at || "", action: "Machine Bound", key: l.reg_key, detail: `Hardware MAC: ${l.machine_id.slice(0, 12)}…`, icon: "lock", color: "text-[#0a84ff]" }] : []),
    ...(!l.is_active ? [{ time: l.expires_at, action: "License Revoked", key: l.reg_key, detail: "Revoked by operator", icon: "block", color: "text-[#ff453a]" }] : []),
  ]).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Audit & Security Ledger</h2>
        <p className="text-xs text-[#86868b] mt-0.5">Chronological record of activation, rotation, and enforcement events</p>
      </div>

      <div className="apple-glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        {events.map((e, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center space-x-3.5">
              <span className={`material-symbols-outlined text-[20px] ${e.color}`}>{e.icon}</span>
              <div>
                <p className="text-xs font-semibold text-white">{e.action} — <span className="font-mono text-[#0a84ff]">{e.key}</span></p>
                <p className="text-[11px] text-[#86868b]">{e.detail}</p>
              </div>
            </div>
            <span className="text-[11px] text-[#86868b] font-mono">
              {e.time ? new Date(e.time).toLocaleString() : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- API Access Page ---
function APIAccessPage() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">API Access & Edge Endpoints</h2>
        <p className="text-xs text-[#86868b] mt-0.5">Specifications for cloud routing, telemetry, and license validation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="apple-glass-card rounded-2xl p-5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0a84ff]/15 text-[#0a84ff] border border-[#0a84ff]/30 uppercase tracking-wider">
            POST /api/validate
          </span>
          <h3 className="text-sm font-semibold text-white mt-2 mb-1">License & Quota Verification</h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Machine lock verification, returns valid status and encrypted credentials.
          </p>
        </div>

        <div className="apple-glass-card rounded-2xl p-5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 uppercase tracking-wider">
            POST /api/bridge/generate
          </span>
          <h3 className="text-sm font-semibold text-white mt-2 mb-1">Edge Code Generation</h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Multi-tier failover bridge routing through Gemini Flash and Groq Llama-3.3-70B.
          </p>
        </div>

        <div className="apple-glass-card rounded-2xl p-5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#bf5af2]/15 text-[#bf5af2] border border-[#bf5af2]/30 uppercase tracking-wider">
            POST /api/bridge/mcq
          </span>
          <h3 className="text-sm font-semibold text-white mt-2 mb-1">MCQ Answer Inference</h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Extracts question context and returns optimal multiple-choice selection.
          </p>
        </div>

        <div className="apple-glass-card rounded-2xl p-5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30 uppercase tracking-wider">
            GET /api/history
          </span>
          <h3 className="text-sm font-semibold text-white mt-2 mb-1">Token Telemetry & Storage</h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Queries cumulative token metrics and circular 10-item prompt/response log.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Support Page ---
function SupportPage() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Support & Diagnostics</h2>
        <p className="text-xs text-[#86868b] mt-0.5">Deployment troubleshooting and network diagnostic protocols</p>
      </div>

      <div className="apple-glass rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Campus Wi-Fi Diagnostics</h3>
        <p className="text-xs text-[#86868b] leading-relaxed">
          If students encounter connection issues, verify that outbound HTTPS to <code className="text-[#0a84ff] font-mono">web-phi-taupe-97.vercel.app</code> is unblocked.
          Because traffic is routed through standard Vercel Edge endpoints, campus firewalls inspect it as generic web traffic.
        </p>
      </div>
    </div>
  );
}

// --- Security Page ---
function SecurityPage() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Security & Hardening Protocols</h2>
        <p className="text-xs text-[#86868b] mt-0.5">Client protection, screen exclusion, and anti-forensic safeguards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="apple-glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">WDA_EXCLUDEFROMCAPTURE</h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Floating HUD windows use Windows Display Affinity to stay completely invisible during screen shares and recordings.
          </p>
        </div>
        <div className="apple-glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Anonymous Stdin Injection</h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Credentials exist exclusively in protected volatile RAM; zero keys are ever committed to disk or visible in process lists.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard Container ---
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const [page, setPage] = useState<Page>("overview");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<License | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllLicenses();
      setLicenses(data);
    } catch {
      showToast("Failed to load licenses", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  async function handleRevoke(id: string) {
    setActionLoading(id);
    try {
      await revokeLicense(id);
      showToast("License revoked", "success");
      await loadLicenses();
    } catch {
      showToast("Failed to revoke", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTerminate(id: string) {
    setActionLoading(id);
    try {
      await terminateLicense(id);
      showToast("License expired instantly", "success");
      await loadLicenses();
    } catch {
      showToast("Failed to terminate", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReset(id: string) {
    setActionLoading(id);
    try {
      await resetLicense(id);
      showToast("Machine binding cleared", "success");
      await loadLicenses();
    } catch {
      showToast("Failed to reset", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this license?")) return;
    setActionLoading(id);
    try {
      await deleteLicense(id);
      showToast("License deleted", "success");
      await loadLicenses();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const nav: { id: Page; icon: string; label: string }[] = [
    { id: "overview", icon: "dashboard", label: "Overview" },
    { id: "keyvault", icon: "vpn_key", label: "Key Vault" },
    { id: "history", icon: "monitoring", label: "Token History" },
    { id: "apikeypool", icon: "dataset", label: "API Key Pool" },
    { id: "audit", icon: "history", label: "Audit Logs" },
    { id: "api", icon: "api", label: "API Access" },
    { id: "support", icon: "help_outline", label: "Support" },
    { id: "docs", icon: "schema", label: "Ecosystem Docs" },
  ];

  function navigate(p: Page) {
    if (p === "docs") {
      router.push("/docs");
      return;
    }
    setPage(p);
  }

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] font-sans antialiased">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-2xl text-xs font-medium shadow-2xl border backdrop-blur-xl animate-fade-in flex items-center space-x-2 ${
            toast.type === "success"
              ? "bg-[#30d158]/15 border-[#30d158]/30 text-[#30d158]"
              : "bg-[#ff453a]/15 border-[#ff453a]/30 text-[#ff453a]"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* macOS Chrome Sticky Header */}
      <header className="apple-glass sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden p-1.5 rounded-lg text-[#86868b] hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileNavOpen ? "close" : "menu"}
            </span>
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0c] border border-white/[0.12] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[#0a84ff] text-[18px]">lock</span>
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white">TITAN</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
                Console v4.3
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/history"
            target="_blank"
            className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5"
            title="Open Token Telemetry Portal"
          >
            <span className="material-symbols-outlined text-[16px] text-[#0a84ff]">monitoring</span>
            <span className="hidden sm:inline">Token Telemetry</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="apple-btn-primary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Key</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="w-64 bg-[#161618] border-r border-white/[0.1] h-full p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <div className="mb-4 pb-3 border-b border-white/[0.08]">
                <p className="text-xs font-semibold text-white">Navigation</p>
              </div>
              {nav.map((n) => (
                <NavLink
                  key={n.id}
                  icon={n.icon}
                  label={n.label}
                  active={page === n.id}
                  onClick={() => {
                    navigate(n.id);
                    setMobileNavOpen(false);
                  }}
                />
              ))}
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-2 p-2.5 rounded-xl text-xs font-medium text-[#ff453a] hover:bg-[#ff453a]/10"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Lock Console</span>
            </button>
          </aside>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 min-h-[calc(100vh-53px)] apple-glass border-r border-white/[0.08] flex-col justify-between p-3.5">
          <div className="space-y-1">
            {nav.map((n) => (
              <NavLink
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={page === n.id}
                onClick={() => navigate(n.id)}
              />
            ))}
          </div>

          <div className="pt-3 border-t border-white/[0.06] space-y-1">
            <NavLink
              icon="shield"
              label="Security Policy"
              active={page === "security"}
              onClick={() => navigate("security")}
            />
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-2.5 py-2 px-3 rounded-xl text-xs font-medium text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Lock Console</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {page === "overview" && (
            <OverviewPage
              licenses={licenses}
              loading={loading}
              loadLicenses={loadLicenses}
              onEdit={setRotateTarget}
              onRevoke={handleRevoke}
              onTerminate={handleTerminate}
              onReset={handleReset}
              onDelete={handleDelete}
              actionLoading={actionLoading}
            />
          )}
          {page === "keyvault" && (
            <KeyVaultPage
              licenses={licenses}
              loading={loading}
              onEdit={setRotateTarget}
              onRevoke={handleRevoke}
              onTerminate={handleTerminate}
              onReset={handleReset}
              onDelete={handleDelete}
              actionLoading={actionLoading}
            />
          )}
          {page === "history" && <AdminTokenHistoryTab licenses={licenses} />}
          {page === "apikeypool" && <APIKeyPoolPage />}
          {page === "audit" && <AuditLogsPage licenses={licenses} loading={loading} />}
          {page === "api" && <APIAccessPage />}
          {page === "support" && <SupportPage />}
          {page === "security" && <SecurityPage />}
        </main>
      </div>

      {showModal && (
        <AddKeyModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            showToast("License key created successfully", "success");
            loadLicenses();
          }}
        />
      )}
      {rotateTarget && (
        <EditKeyModal
          license={rotateTarget}
          onClose={() => setRotateTarget(null)}
          onSaved={() => {
            setRotateTarget(null);
            showToast("License updated successfully", "success");
            loadLicenses();
          }}
        />
      )}
    </div>
  );
}

// --- Add Key Modal ---
function AddKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [regKey, setRegKey] = useState("");
  const [label, setLabel] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [language, setLanguage] = useState("Java");
  const [model, setModel] = useState("gemini");
  const [trialDays, setTrialDays] = useState(0);
  const [trialHours, setTrialHours] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [autoAssigned, setAutoAssigned] = useState<PoolKey[]>([]);

  useEffect(() => {
    fetchFreePoolKeys(3)
      .then((freeKeys) => {
        if (freeKeys.length > 0) {
          setAutoAssigned(freeKeys);
          setGeminiKey(freeKeys.map((k) => k.key).join(","));
        }
      })
      .catch(() => {});
  }, []);

  async function handleCreate() {
    if (regKey.length !== 8) {
      setError("Registration key must be exactly 8 digits.");
      return;
    }
    if (trialDays <= 0 && trialHours <= 0) {
      setError("Specify at least 1 day or 1 hour duration.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const { data: r, error: createErr } = await createLicense(
        regKey,
        label,
        trialDays,
        trialHours,
        geminiKey,
        language,
        model
      );
      if (createErr || !r) {
        setError(createErr ?? "Failed to create license");
        setCreating(false);
        return;
      }
      onCreated();
    } catch (e: any) {
      setError(e.message || "Failed to create license");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="apple-glass rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl animate-entrance" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">Create Machine License</h2>
            <p className="text-xs text-[#86868b] mt-0.5">Generates an 8-digit hardware-locked key</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#86868b] hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
              8-Digit Registration Key
            </label>
            <input
              type="text"
              maxLength={8}
              value={regKey}
              onChange={(e) => setRegKey(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 12402879"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-white/[0.1] rounded-xl font-mono text-center text-lg tracking-[0.2em] text-[#0a84ff] focus:outline-none focus:border-[#0a84ff]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
              Customer / Lab Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Lab 4 — Computer Networks"
              className="w-full px-3.5 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#0a84ff]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                min={0}
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                Duration (Hours)
              </label>
              <input
                type="number"
                min={0}
                value={trialHours}
                onChange={(e) => setTrialHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
              Default Programming Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0a84ff]"
            >
              {["Java", "Python", "C++", "C", "JavaScript", "C#", "Go", "Rust", "Kotlin", "Swift"].map((l) => (
                <option key={l} value={l} className="bg-[#1c1c1e]">
                  {l}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="p-2.5 rounded-lg bg-[#ff453a]/12 border border-[#ff453a]/25 text-[#ff453a] text-xs">
              {error}
            </p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button onClick={onClose} className="apple-btn-secondary px-4 py-2">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={creating} className="apple-btn-primary px-5 py-2">
              {creating ? "Creating…" : "Confirm License"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Edit Key Modal ---
function EditKeyModal({
  license,
  onClose,
  onSaved,
}: {
  license: License;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(license.label || "");
  const [geminiKey, setGeminiKey] = useState(license.gemini_key || "");
  const [language, setLanguage] = useState(license.language || "Java");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await updateLicense(license.id, label, geminiKey, language, license.model || "gemini");
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to update license");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="apple-glass rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl animate-entrance" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">Edit License #{license.reg_key}</h2>
            <p className="text-xs text-[#86868b] mt-0.5">Modify parameters or update assigned keys</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#86868b] hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
              Customer Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#0a84ff]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
              Programming Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0a84ff]"
            >
              {["Java", "Python", "C++", "C", "JavaScript", "C#", "Go", "Rust", "Kotlin", "Swift"].map((l) => (
                <option key={l} value={l} className="bg-[#1c1c1e]">
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
              Assigned API Keys (comma-separated)
            </label>
            <input
              type="text"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-[#0a84ff]"
            />
          </div>

          {error && (
            <p className="p-2.5 rounded-lg bg-[#ff453a]/12 border border-[#ff453a]/25 text-[#ff453a] text-xs">
              {error}
            </p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button onClick={onClose} className="apple-btn-secondary px-4 py-2">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="apple-btn-primary px-5 py-2">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- API Key Pool Page ---
function APIKeyPoolPage() {
  const [keys, setKeys] = useState<PoolKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [msg, setMsg] = useState("");

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPoolKeys();
      setKeys(data);
    } catch {
      setMsg("Failed to load pool keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleAddKeys() {
    if (!bulkInput.trim()) return;
    setAdding(true);
    try {
      const rawList = bulkInput
        .split(/[\n,;]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 10);
      await addPoolKeys(rawList, "Imported Key");
      setBulkInput("");
      setMsg(`Added ${rawList.length} keys to pool.`);
      await loadKeys();
    } catch {
      setMsg("Failed to add keys.");
    } finally {
      setAdding(false);
    }
  }

  async function handleTestAll() {
    setTestingAll(true);
    try {
      await testAllPoolKeys();
      setMsg("All keys tested successfully.");
      await loadKeys();
    } catch {
      setMsg("Testing encountered errors.");
    } finally {
      setTestingAll(false);
    }
  }

  const activeCount = keys.filter((k) => k.status === "active").length;
  const freeCount = keys.filter((k) => !k.used).length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">API Key Pool Management</h2>
          <p className="text-xs text-[#86868b] mt-0.5">Master quota pool with automatic health probing and rotation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestAll}
            disabled={testingAll || keys.length === 0}
            className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">health_and_safety</span>
            <span>{testingAll ? "Probing…" : "Test All Keys"}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white">
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="apple-glass-card rounded-2xl p-4">
          <p className="text-[11px] font-medium text-[#86868b] uppercase">Total Pool Keys</p>
          <p className="text-2xl font-light text-white">{keys.length}</p>
        </div>
        <div className="apple-glass-card rounded-2xl p-4">
          <p className="text-[11px] font-medium text-[#86868b] uppercase">Healthy Active</p>
          <p className="text-2xl font-light text-[#30d158]">{activeCount}</p>
        </div>
        <div className="apple-glass-card rounded-2xl p-4">
          <p className="text-[11px] font-medium text-[#86868b] uppercase">Free Unassigned</p>
          <p className="text-2xl font-light text-[#0a84ff]">{freeCount}</p>
        </div>
        <div className="apple-glass-card rounded-2xl p-4">
          <p className="text-[11px] font-medium text-[#86868b] uppercase">Assigned</p>
          <p className="text-2xl font-light text-white">{keys.length - freeCount}</p>
        </div>
      </div>

      {/* Bulk Import */}
      <div className="apple-glass rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">Add Gemini / Provider Keys</h3>
        <textarea
          rows={3}
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder="Paste API keys (one per line, or comma-separated: AIzaSyA..., AIzaSyB...)"
          className="w-full bg-black/50 border border-white/[0.1] rounded-xl p-3 font-mono text-xs text-white placeholder-[#636366] focus:outline-none focus:border-[#0a84ff]"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAddKeys}
            disabled={adding || !bulkInput.trim()}
            className="apple-btn-primary px-5 py-2 text-xs font-medium"
          >
            {adding ? "Importing…" : "Import Keys"}
          </button>
        </div>
      </div>

      {/* Keys List */}
      <div className="apple-glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        {loading ? (
          <div className="py-12 text-center text-[#86868b] flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin" />
            <span>Loading key pool…</span>
          </div>
        ) : keys.length === 0 ? (
          <p className="py-12 text-center text-[#86868b] text-xs">No keys in pool.</p>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-white truncate max-w-xs">{k.key.slice(0, 24)}…</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                    k.status === "active" ? "bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30" : "bg-white/[0.06] text-[#86868b] border-white/[0.08]"
                  }`}>
                    {k.status || "Unchecked"}
                  </span>
                  <span className="text-[10px] text-[#86868b] px-2 py-0.5 rounded bg-white/[0.04]">
                    {k.used ? "Assigned" : "Free"}
                  </span>
                </div>
                <p className="text-[11px] text-[#86868b] mt-0.5">{k.label || "No label"}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    await removePoolKey(k.id);
                    await loadKeys();
                  }}
                  className="p-1.5 text-[#ff453a] hover:bg-white/[0.08] rounded-lg"
                  title="Remove Key"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
