"use client";

import React from "react";

export type ControlCenterTab = "brain" | "licenses" | "telemetry" | "simulator" | "specs";

interface CupertinoTabsProps {
  activeTab: ControlCenterTab;
  onChange: (tab: ControlCenterTab) => void;
  providersCount: number;
  licensesCount: number;
}

export function CupertinoTabs({
  activeTab,
  onChange,
  providersCount,
  licensesCount,
}: CupertinoTabsProps) {
  const tabs = [
    {
      id: "brain" as ControlCenterTab,
      label: "AI Brain & Providers",
      icon: "neurology",
      badge: providersCount,
      color: "text-[#0a84ff]",
    },
    {
      id: "licenses" as ControlCenterTab,
      label: "Client Licenses",
      icon: "vpn_key",
      badge: licensesCount,
      color: "text-emerald-400",
    },
    {
      id: "telemetry" as ControlCenterTab,
      label: "Token Telemetry",
      icon: "monitoring",
      color: "text-amber-400",
    },
    {
      id: "simulator" as ControlCenterTab,
      label: "Live Simulator",
      icon: "bolt",
      color: "text-purple-400",
    },
    {
      id: "specs" as ControlCenterTab,
      label: "System Specs",
      icon: "developer_guide",
      color: "text-cyan-400",
    },
  ];

  return (
    <div className="w-full mb-8">
      {/* Cupertino Segmented Bar */}
      <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl flex items-center overflow-x-auto no-scrollbar space-x-1 shadow-inner shadow-black/40">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 min-w-[140px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold tracking-tight transition-all duration-200 select-none ${
                isActive
                  ? "bg-white/[0.12] text-white shadow-md shadow-black/50 border border-white/[0.15]"
                  : "text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-colors ${
                  isActive ? tab.color : "text-[#86868b]"
                }`}
              >
                {tab.icon}
              </span>
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-white/[0.2] text-white"
                      : "bg-white/[0.06] text-[#86868b]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
