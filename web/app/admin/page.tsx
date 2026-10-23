"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  verifyAdminPassword,
  fetchAllLicenses,
  getBrainProviders,
  type License,
  type BrainProviderItem,
} from "./actions";
import { ControlCenterHeader } from "./components/ControlCenterHeader";
import { CupertinoTabs, ControlCenterTab } from "./components/CupertinoTabs";
import { BrainProvidersTab } from "./components/BrainProvidersTab";
import { LicensesTab } from "./components/LicensesTab";
import { TokenTelemetryTab } from "./components/TokenTelemetryTab";
import { LiveRadarTab } from "./components/LiveRadarTab";
import { PlaygroundTab } from "./components/PlaygroundTab";
import { SystemSpecsTab } from "./components/SystemSpecsTab";

export default function AdminControlCenter() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Control Center State
  const [activeTab, setActiveTab] = useState<ControlCenterTab>("brain");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [providers, setProviders] = useState<BrainProviderItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Load session from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("titan_auth") === "1") {
      setAuthenticated(true);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [fetchedLicenses, fetchedProviders] = await Promise.all([
        fetchAllLicenses(),
        getBrainProviders(),
      ]);
      setLicenses(fetchedLicenses || []);
      setProviders(fetchedProviders || []);
    } catch {
      // Non-blocking catch
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadAllData();
    }
  }, [authenticated, loadAllData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const ok = await verifyAdminPassword(password);
      if (ok) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("titan_auth", "1");
        }
        setAuthenticated(true);
      } else {
        setAuthError("Incorrect passcode. Access denied.");
      }
    } catch {
      setAuthError("Authentication service unavailable.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("titan_auth");
    }
    setAuthenticated(false);
    setPassword("");
  };

  // ── Authentication Gate (Apple Security Aesthetic) ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-[#f5f5f7] flex items-center justify-center p-4 relative overflow-hidden selection:bg-[#0a84ff]/30">
        {/* Apple Ambient Specular Glow */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#0a84ff]/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[250px] bg-purple-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm apple-glass-card rounded-3xl p-8 border border-white/[0.12] shadow-2xl shadow-black/80 text-center backdrop-blur-3xl animate-fade-in">
          {/* Biometric / TouchID Emblem */}
          <div className="relative mx-auto w-16 h-16 rounded-3xl bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0c] border border-white/[0.15] flex items-center justify-center shadow-xl shadow-black/50 mb-6 group">
            <span className="material-symbols-outlined text-[#0a84ff] text-[32px] group-hover:scale-105 transition-transform duration-300">
              fingerprint
            </span>
            <div className="absolute inset-0 rounded-3xl border border-[#0a84ff]/30 animate-pulse" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white">
            TITAN Control Center
          </h1>
          <p className="text-xs text-[#86868b] mt-1 mb-8">
            Enter master passcode to unlock operator command surface.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passcode"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.12] text-sm text-center font-mono text-white tracking-widest placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {authError && (
              <div className="text-xs text-red-400 font-medium py-1">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full apple-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#0a84ff]/30 disabled:opacity-40"
            >
              {authLoading ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
              ) : (
                <>
                  <span>Unlock Vault</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-center space-x-2 text-[11px] text-[#86868b]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Vercel Edge Secure Boundary</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated Control Center Surface ──
  const activeProvidersCount = providers.filter((p) => p.is_active).length;

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col relative selection:bg-[#0a84ff]/30 selection:text-white font-sans antialiased">
      {/* Apple Ambient Specular Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#0a84ff]/8 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[350px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Top macOS Control Center Header */}
      <ControlCenterHeader
        activeProvidersCount={activeProvidersCount}
        totalLicensesCount={licenses.length}
        onSignOut={handleSignOut}
      />

      {/* Main Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Cupertino Segmented Tabs Navigation */}
        <CupertinoTabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          providersCount={providers.length}
          licensesCount={licenses.length}
        />

        {/* Tab Content Display */}
        <div className="transition-all duration-200">
          {activeTab === "brain" && (
            <BrainProvidersTab
              providers={providers}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "licenses" && (
            <LicensesTab
              licenses={licenses}
              providers={providers}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "telemetry" && (
            <TokenTelemetryTab
              licenses={licenses}
            />
          )}

          {activeTab === "radar" && (
            <LiveRadarTab />
          )}

          {activeTab === "simulator" && (
            <PlaygroundTab licenses={licenses} />
          )}

          {activeTab === "specs" && (
            <SystemSpecsTab />
          )}
        </div>
      </main>

      {/* Bottom Subtle Status Bar */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-black/60 backdrop-blur-xl py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868b] gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white/80">TITAN Control Center</span>
            <span>•</span>
            <span>Zero Client Leakage Gateway</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">10-Item Cap Active</span>
          </div>

          <div className="flex items-center space-x-4">
            <a href="/history" className="hover:text-white transition-colors">
              Public Telemetry
            </a>
            <a href="/docs" className="hover:text-white transition-colors">
              Developer Docs
            </a>
            <span>v3.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
