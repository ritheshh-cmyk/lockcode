"use client";

import React, { useState, useEffect } from "react";
import {
  BrainProviderItem,
  saveBrainProvider,
  toggleBrainProvider,
  deleteBrainProvider,
  pingTestProvider,
  getRoutingStrategy,
  saveRoutingStrategy,
  triggerHealthAudit,
  simulateChaosFailure,
  clearProviderBackoff,
  type RoutingConfig,
} from "../actions";

interface BrainProvidersTabProps {
  providers: BrainProviderItem[];
  onRefresh: () => void;
}

export function BrainProvidersTab({ providers, onRefresh }: BrainProvidersTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<BrainProviderItem | null>(null);

  // Form State
  const [providerType, setProviderType] = useState("groq");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [baseUrl, setBaseUrl] = useState("");
  const [priority, setPriority] = useState(1);
  const [weight, setWeight] = useState(50);
  const [preferredFor, setPreferredFor] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  // Routing Strategy State
  const [routingConfig, setRoutingConfig] = useState<RoutingConfig>({
    strategy: "waterfall",
    preferredCodeProvider: "auto",
    preferredMcqProvider: "auto",
  });
  const [strategySaving, setStrategySaving] = useState(false);
  const [strategySavedMsg, setStrategySavedMsg] = useState("");

  useEffect(() => {
    getRoutingStrategy().then((cfg) => {
      if (cfg) setRoutingConfig(cfg);
    });
  }, []);

  const handleSaveStrategy = async () => {
    setStrategySaving(true);
    setStrategySavedMsg("");
    const res = await saveRoutingStrategy(routingConfig);
    setStrategySaving(false);
    if (res.success) {
      setStrategySavedMsg("Saved live!");
      setTimeout(() => setStrategySavedMsg(""), 2500);
      onRefresh();
    }
  };

  // Test Ping State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; latency?: number; error?: string } | null>(null);
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  // Action Loading
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditResultMsg, setAuditResultMsg] = useState("");
  const [chaosTarget, setChaosTarget] = useState<string | null>(null);
  const [autoAudit, setAutoAudit] = useState(true);
  const [auditCountdown, setAuditCountdown] = useState(30);

  useEffect(() => {
    if (!autoAudit) return;
    const iv = setInterval(() => {
      setAuditCountdown((prev) => {
        if (prev <= 1) {
          triggerHealthAudit().then(() => onRefresh());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [autoAudit, onRefresh]);

  const handleRunHealthAudit = async () => {
    setAuditing(true);
    setAuditResultMsg("");
    const res = await triggerHealthAudit();
    setAuditing(false);
    if (res.success) {
      setAuditResultMsg(`Audited ${res.auditedCount} providers: ${res.healthyCount} online`);
      setTimeout(() => setAuditResultMsg(""), 3500);
      onRefresh();
    } else {
      setAuditResultMsg(`Audit error: ${res.error || "Unknown"}`);
      setTimeout(() => setAuditResultMsg(""), 3500);
    }
  };

  const handleSimulateChaos = async (p: BrainProviderItem) => {
    setChaosTarget(p.id);
    await simulateChaosFailure(p.id, 45_000);
    setTimeout(() => setChaosTarget(null), 45_000);
    onRefresh();
  };

  const handleClearBackoff = async (p: BrainProviderItem) => {
    await clearProviderBackoff(p.id);
    onRefresh();
  };

  const presets: Record<string, { label: string; model: string; baseUrl?: string; icon: string; color: string }> = {
    groq: {
      label: "Groq Cloud (Ultra Fast)",
      model: "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      icon: "bolt",
      color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    gemini: {
      label: "Google Gemini",
      model: "gemini-2.5-flash",
      icon: "auto_awesome",
      color: "text-[#0a84ff] bg-[#0a84ff]/10 border-[#0a84ff]/20",
    },
    deepseek: {
      label: "DeepSeek",
      model: "deepseek-chat",
      baseUrl: "https://api.deepseek.com/chat/completions",
      icon: "smart_toy",
      color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    },
    openai: {
      label: "OpenAI",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1/chat/completions",
      icon: "psychology",
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    anthropic: {
      label: "Anthropic Claude",
      model: "claude-3-5-sonnet-20241022",
      icon: "neurology",
      color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
    openrouter: {
      label: "OpenRouter",
      model: "meta-llama/llama-3.3-70b-instruct",
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      icon: "hub",
      color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    },
    custom: {
      label: "Custom / Self-Hosted",
      model: "",
      baseUrl: "http://localhost:11434/v1/chat/completions",
      icon: "dns",
      color: "text-slate-400 bg-white/10 border-white/20",
    },
  };

  const handleOpenAddModal = () => {
    setEditingProvider(null);
    setProviderType("groq");
    setLabel("Primary Groq Llama 3.3");
    setApiKey("");
    setModel("llama-3.3-70b-versatile");
    setBaseUrl("https://api.groq.com/openai/v1/chat/completions");
    setPriority(providers.length + 1);
    setWeight(50);
    setPreferredFor("");
    setIsActive(true);
    setErrorMsg("");
    setModalTestResult(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: BrainProviderItem) => {
    setEditingProvider(p);
    setProviderType(p.provider);
    setLabel(p.label);
    setApiKey(p.api_key);
    setModel(p.model);
    setBaseUrl(p.base_url || "");
    setPriority(p.priority);
    setWeight(p.weight ?? 50);
    setPreferredFor(p.preferred_for || "");
    setIsActive(p.is_active);
    setErrorMsg("");
    setModalTestResult(null);
    setModalOpen(true);
  };

  const handleSelectPreset = (type: string) => {
    setProviderType(type);
    const preset = presets[type];
    if (preset) {
      if (!editingProvider) {
        setLabel(preset.label);
      }
      setModel(preset.model);
      setBaseUrl(preset.baseUrl || "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setErrorMsg("API Key is required.");
      return;
    }
    if (!model.trim()) {
      setErrorMsg("Model name is required.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const res = await saveBrainProvider({
      id: editingProvider?.id,
      provider: providerType,
      label: label.trim() || `${providerType} Provider`,
      api_key: apiKey.trim(),
      model: model.trim(),
      base_url: baseUrl.trim() || undefined,
      priority: Number(priority) || 1,
      weight: Number(weight) || 50,
      preferred_for: preferredFor || null,
      is_active: isActive,
    });

    setSaving(false);

    if (res.success) {
      setModalOpen(false);
      onRefresh();
    } else {
      setErrorMsg(res.error || "Failed to save provider.");
    }
  };

  const handleToggleActive = async (p: BrainProviderItem) => {
    await toggleBrainProvider(p.id, !p.is_active);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this provider from the Brain?")) {
      await deleteBrainProvider(id);
      onRefresh();
    }
  };

  const handlePingTest = async (p: BrainProviderItem) => {
    setTestingId(p.id);
    setTestResult(null);
    const res = await pingTestProvider({
      provider: p.provider,
      api_key: p.api_key,
      model: p.model,
      base_url: p.base_url || undefined,
    });
    setTestingId(null);
    if (res.success) {
      setTestResult({ id: p.id, latency: res.latency_ms });
    } else {
      setTestResult({ id: p.id, error: res.message || "Failed ping test" });
    }
    onRefresh();
  };

  const handleModalPingTest = async () => {
    if (!apiKey.trim()) {
      setErrorMsg("Please enter an API key to test.");
      return;
    }
    setModalTesting(true);
    setModalTestResult(null);
    const res = await pingTestProvider({
      provider: providerType,
      api_key: apiKey.trim(),
      model: model.trim(),
      base_url: baseUrl.trim() || undefined,
    });
    setModalTesting(false);
    if (res.success) {
      setModalTestResult({ success: true, latency: res.latency_ms });
    } else {
      setModalTestResult({ success: false, error: res.message || "Ping failed" });
    }
  };

  const activeProviders = providers.filter((p) => p.is_active);

  return (
    <div className="space-y-8">
      {/* ── 1. Bento Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b] text-xs font-medium">
            <span>Configured Providers</span>
            <span className="material-symbols-outlined text-[18px] text-[#0a84ff]">
              hub
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {providers.length}
            </div>
            <div className="text-[11px] text-[#86868b] mt-1 flex items-center space-x-1">
              <span className="text-emerald-400 font-semibold">{activeProviders.length} active</span>
              <span>•</span>
              <span>{providers.length - activeProviders.length} standby</span>
            </div>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b] text-xs font-medium">
            <span>Routing Cascade</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">
              route
            </span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold tracking-tight text-white flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Auto Failover</span>
            </div>
            <div className="text-[11px] text-[#86868b] mt-1 truncate">
              {activeProviders.length > 0
                ? `#1: ${activeProviders[0].provider.toUpperCase()} (${activeProviders[0].model})`
                : "No active providers"}
            </div>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b] text-xs font-medium">
            <span>TITAN Client Shield</span>
            <span className="material-symbols-outlined text-[18px] text-purple-400">
              verified_user
            </span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold tracking-tight text-white">
              100% Decoupled
            </div>
            <div className="text-[11px] text-[#86868b] mt-1">
              TITAN client sees zero upstream keys or provider switches
            </div>
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868b] text-xs font-medium">
            <span>Health & Latency</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400">
              speed
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {activeProviders[0]?.last_latency_ms
                ? `${activeProviders[0].last_latency_ms}ms`
                : "⚡ Ready"}
            </div>
            <div className="text-[11px] text-[#86868b] mt-1">
              Sub-second Vercel edge execution
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Header & Action Row ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#0a84ff] text-[22px]">
              neurology
            </span>
            <span>Centralized Multi-Provider Brain</span>
          </h2>
          <p className="text-xs text-[#86868b] mt-0.5">
            Add unlimited providers and API keys (Groq, Gemini, DeepSeek, OpenAI, Anthropic, Custom).
            Vercel cascades queries automatically while TITAN desktop client receives standardized answers intact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Auto-Watcher Pill */}
          <button
            onClick={() => setAutoAudit(!autoAudit)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all ${
              autoAudit
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/[0.04] border-white/[0.08] text-[#86868b] hover:text-white"
            }`}
            title="Automatically run concurrent provider health checks in the background"
          >
            <span className={`w-2 h-2 rounded-full ${autoAudit ? "bg-emerald-400 animate-ping" : "bg-[#86868b]"}`}></span>
            <span>{autoAudit ? `Watcher Active (${auditCountdown}s)` : "Live Watcher: Off"}</span>
          </button>

          {auditResultMsg && (
            <span className="text-xs text-emerald-400 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              {auditResultMsg}
            </span>
          )}

          <button
            onClick={handleRunHealthAudit}
            disabled={auditing}
            className="apple-btn-secondary px-3.5 py-2 text-xs font-medium flex items-center space-x-1.5 disabled:opacity-50"
            title="Concurrently ping all active providers to test live latency"
          >
            <span className={`material-symbols-outlined text-[16px] ${auditing ? "animate-spin text-[#0a84ff]" : "text-emerald-400"}`}>
              {auditing ? "progress_activity" : "health_and_safety"}
            </span>
            <span>{auditing ? "Auditing..." : "Live Health Audit"}</span>
          </button>

          <button
            onClick={onRefresh}
            className="apple-btn-secondary px-3 py-2 text-xs font-medium flex items-center space-x-1"
            title="Refresh Providers"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="apple-btn-primary px-4 py-2 text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-[#0a84ff]/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add AI Provider</span>
          </button>
        </div>
      </div>

      {/* 2.5 Routing Engine Strategy & Mode Dispatch Panel */}
      <div className="apple-glass-card rounded-2xl p-5 border border-white/[0.1] bg-white/[0.02]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
              <span className="material-symbols-outlined text-[20px] text-purple-400">tune</span>
              <span>Intelligent Load Balancing & Mode Dispatch</span>
            </div>
            <div className="text-xs text-[#86868b] mt-0.5">
              Control how Vercel routes TITAN queries across providers based on exam mode and latency.
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {strategySavedMsg && (
              <span className="text-xs text-emerald-400 font-medium animate-fade-in flex items-center space-x-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>{strategySavedMsg}</span>
              </span>
            )}
            <button
              onClick={handleSaveStrategy}
              disabled={strategySaving}
              className="apple-btn-primary px-4 py-1.5 text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-[#0a84ff]/20 disabled:opacity-50"
            >
              {strategySaving && (
                <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              )}
              <span>Save Strategy</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Strategy Selector */}
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-2 uppercase tracking-wider text-[10px]">
              Load Balancing Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              {[
                { id: "waterfall", label: "Waterfall" },
                { id: "weighted", label: "Weighted %" },
                { id: "round_robin", label: "Round-Robin" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setRoutingConfig((c) => ({ ...c, strategy: s.id as any }))}
                  className={`py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                    routingConfig.strategy === s.id
                      ? "bg-white/[0.15] text-white shadow-sm border border-white/[0.2]"
                      : "text-[#86868b] hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred MCQ Engine */}
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1.5 uppercase tracking-wider text-[10px]">
              Preferred MCQ Engine (Sub-500ms)
            </label>
            <select
              value={routingConfig.preferredMcqProvider}
              onChange={(e) => setRoutingConfig((c) => ({ ...c, preferredMcqProvider: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
            >
              <option value="auto" className="bg-[#1c1c1e]">Auto (Fastest Latency Tier)</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1c1c1e]">
                  {p.label} ({p.provider} • {p.model})
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Code Engine */}
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1.5 uppercase tracking-wider text-[10px]">
              Preferred Code Engine (Deep Reasoner)
            </label>
            <select
              value={routingConfig.preferredCodeProvider}
              onChange={(e) => setRoutingConfig((c) => ({ ...c, preferredCodeProvider: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
            >
              <option value="auto" className="bg-[#1c1c1e]">Auto (Highest Priority Deep Reasoner)</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1c1c1e]">
                  {p.label} ({p.provider} • {p.model})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. Providers List / Apple Glass Cards ── */}
      {providers.length === 0 ? (
        <div className="apple-glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4 text-[#86868b]">
            <span className="material-symbols-outlined text-[28px]">smart_toy</span>
          </div>
          <h3 className="text-sm font-semibold text-white">No AI Providers Configured</h3>
          <p className="text-xs text-[#86868b] max-w-sm mt-1 mb-6">
            The Brain needs at least one active provider (like Groq or Gemini) to process incoming queries from TITAN.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="apple-btn-primary px-5 py-2 text-xs font-semibold flex items-center space-x-2"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Your First Provider</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p, index) => {
            const presetInfo = presets[p.provider.toLowerCase()] || presets.custom;
            const isTesting = testingId === p.id;
            const hasTestedThis = testResult?.id === p.id;
            const subKeys = p.api_key.split(",").map((k) => k.trim()).filter(Boolean);

            return (
              <div
                key={p.id}
                className={`apple-glass-card rounded-2xl p-4 sm:p-5 transition-all duration-200 border ${
                  p.is_active
                    ? "border-white/[0.1] hover:border-white/[0.2]"
                    : "opacity-60 border-white/[0.04] bg-white/[0.01]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Provider Identity & Priority */}
                  <div className="flex items-start sm:items-center space-x-3.5">
                    {/* Priority Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold border shadow-sm ${
                        p.priority === 1
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-white/[0.06] text-white/70 border-white/[0.1]"
                      }`}
                      title={`Cascade Priority #${p.priority}`}
                    >
                      #{p.priority}
                    </div>

                    {/* Provider Emblem */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${presetInfo.color}`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {presetInfo.icon}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white tracking-tight">
                          {p.label}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
                          {p.provider}
                        </span>
                        {p.preferred_for === "mcq" && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                            MCQ Speed ⚡
                          </span>
                        )}
                        {p.preferred_for === "code" && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                            Code Engine 💻
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#86868b] bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                          Weight: {p.weight ?? 50}%
                        </span>
                        {p.priority === 1 && (
                          <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#86868b]">
                        <span className="font-mono text-white/90 font-medium">
                          {p.model}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-white/60">
                          {p.api_key.slice(0, 8)}...{p.api_key.slice(-4)}
                          {subKeys.length > 1 && (
                            <span className="ml-1 text-[10px] text-cyan-400 font-sans font-semibold">
                              ({subKeys.length} keys rotating)
                            </span>
                          )}
                        </span>
                        {p.base_url && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-white/40 truncate max-w-[200px]" title={p.base_url}>
                              {p.base_url}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status, Latency & Controls */}
                  <div className="flex items-center flex-wrap gap-2.5 sm:self-end lg:self-center">
                    {/* Live Ping Test Feedback */}
                    {hasTestedThis && (
                      <div
                        className={`text-xs px-2.5 py-1 rounded-xl font-mono flex items-center space-x-1 border ${
                          testResult.latency
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {testResult.latency ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            <span>{testResult.latency}ms</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            <span className="truncate max-w-[120px]">{testResult.error}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Historical Latency Indicator */}
                    {p.last_latency_ms > 0 && !hasTestedThis && (
                      <span className="text-[11px] font-mono text-[#86868b] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        ⚡ {p.last_latency_ms}ms
                      </span>
                    )}

                    {/* Circuit Breaker Status */}
                    {p.rate_limited_until && new Date(p.rate_limited_until) > new Date() && (
                      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium">
                        <span className="material-symbols-outlined text-[13px]">warning</span>
                        <span>Backoff (429)</span>
                        <button
                          onClick={() => handleClearBackoff(p)}
                          className="ml-1 underline hover:text-white"
                          title="Clear backoff and re-enable immediately"
                        >
                          Reset
                        </button>
                      </div>
                    )}

                    {/* Chaos Outage Simulation Button */}
                    <button
                      onClick={() => handleSimulateChaos(p)}
                      disabled={chaosTarget === p.id}
                      className="px-2 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-[11px] text-[#86868b] hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Simulate a 45s outage to test automatic cascade failover live"
                    >
                      {chaosTarget === p.id ? "429 Mocked" : "Test Failover"}
                    </button>

                    {/* Ping Test Button */}
                    <button
                      onClick={() => handlePingTest(p)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-white transition-colors flex items-center space-x-1 disabled:opacity-50"
                      title="Test live connectivity"
                    >
                      <span className={`material-symbols-outlined text-[15px] ${isTesting ? "animate-spin" : "text-amber-400"}`}>
                        {isTesting ? "progress_activity" : "speed"}
                      </span>
                      <span>{isTesting ? "Testing..." : "Test Ping"}</span>
                    </button>

                    {/* Cupertino Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer ml-1" title="Toggle active status">
                      <input
                        type="checkbox"
                        checked={p.is_active}
                        onChange={() => handleToggleActive(p)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-white/[0.15] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0a84ff]"></div>
                    </label>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 rounded-xl text-[#86868b] hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Edit Provider"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-xl text-[#86868b] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Provider"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Apple Glass Modal: Add / Edit AI Provider ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#1c1c1e]/90 border border-white/[0.12] shadow-2xl shadow-black/80 p-6 sm:p-8 backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">neurology</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {editingProvider ? "Edit AI Provider" : "Connect AI Provider to Brain"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[#86868b] hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Preset Selector */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-2">
                  Provider Ecosystem Preset
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Object.entries(presets).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        providerType === key
                          ? "bg-white/[0.15] border-white/30 text-white shadow-sm"
                          : "bg-white/[0.04] border-white/[0.06] text-[#86868b] hover:bg-white/[0.08]"
                      }`}
                    >
                      <div className="text-[11px] font-semibold capitalize truncate">{key}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Provider Label / Nickname
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Primary Groq Llama 3.3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]/30"
                  required
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama-3.3-70b-versatile or gemini-2.5-flash"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]/30"
                  required
                />
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#86868b]">
                    API Key(s)
                  </label>
                  <span className="text-[10px] text-white/40">Comma-separate multiple keys for pool rotation</span>
                </div>
                <textarea
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  rows={2}
                  placeholder="gsk_... or AIzaSy... (or key1, key2, key3)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]/30 resize-none"
                  required
                />
              </div>

              {/* Custom Base URL (Optional) */}
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Custom Base URL <span className="text-white/40">(Optional / Self-Hosted)</span>
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="e.g. https://api.groq.com/openai/v1/chat/completions"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]/30"
                />
              </div>

              {/* Routing Specialization & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                    Mode Specialization
                  </label>
                  <select
                    value={preferredFor}
                    onChange={(e) => setPreferredFor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="" className="bg-[#1c1c1e]">General / Fallback (Any)</option>
                    <option value="mcq" className="bg-[#1c1c1e]">MCQ Fast-Solver (⚡ Speed)</option>
                    <option value="code" className="bg-[#1c1c1e]">Code Engine (💻 Deep Reasoning)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#86868b]">
                      Load Weight
                    </label>
                    <span className="text-xs font-mono font-bold text-white">{weight}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-[#0a84ff] mt-2.5"
                  />
                </div>
              </div>

              {/* Priority & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                    Cascade Priority Rank
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-[#0a84ff]"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">1 is tried first</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                    Active in Brain
                  </label>
                  <div className="flex items-center h-[42px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/[0.15] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a84ff]"></div>
                      <span className="ml-2.5 text-xs text-white">
                        {isActive ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Test Ping Result */}
              {modalTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    modalTestResult.success
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {modalTestResult.success ? "check_circle" : "error"}
                  </span>
                  <span>
                    {modalTestResult.success
                      ? `Credentials verified! Latency: ${modalTestResult.latency}ms`
                      : `Connection test failed: ${modalTestResult.error}`}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleModalPingTest}
                  disabled={modalTesting}
                  className="apple-btn-secondary px-3.5 py-2 text-xs font-medium flex items-center space-x-1.5"
                >
                  <span className={`material-symbols-outlined text-[16px] ${modalTesting ? "animate-spin" : "text-amber-400"}`}>
                    {modalTesting ? "progress_activity" : "speed"}
                  </span>
                  <span>{modalTesting ? "Testing..." : "Test Credentials"}</span>
                </button>

                <div className="flex items-center space-x-2">
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
                    <span>{editingProvider ? "Save Changes" : "Connect Provider"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
