"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export type ControlCenterTab = "brain" | "licenses" | "telemetry" | "radar" | "simulator" | "specs";

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
      id: "radar" as ControlCenterTab,
      label: "Live Radar (SSE)",
      icon: "radar",
      color: "text-rose-400",
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

  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updatePill = useCallback(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && containerRef.current) {
      setIndicator({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        ready: true,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updatePill();
    const handleResize = () => updatePill();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updatePill]);

  const handleTabClick = (tabId: ControlCenterTab) => {
    onChange(tabId);
    const targetEl = tabRefs.current[tabId];
    if (targetEl && containerRef.current) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  return (
    <div className="w-full mb-8">
      {/* Cupertino Segmented Bar */}
      <div
        ref={containerRef}
        className="relative p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl flex items-center overflow-x-auto no-scrollbar space-x-1 shadow-inner shadow-black/40 smooth-touch-scroll"
      >
        {/* Apple iOS Fluid Sliding Pill */}
        <div
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-xl bg-white/[0.14] border border-white/[0.18] shadow-lg shadow-black/60 backdrop-blur-xl pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
            opacity: indicator.ready ? 1 : 0,
          }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              onClick={() => handleTabClick(tab.id)}
              className={`relative z-10 flex-1 min-w-[140px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold tracking-tight transition-colors duration-200 select-none ios-press ${
                isActive
                  ? "text-white"
                  : "text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.03]"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-colors duration-200 ${
                  isActive ? tab.color : "text-[#86868b]"
                }`}
              >
                {tab.icon}
              </span>
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono transition-colors duration-200 ${
                    isActive
                      ? "bg-white/[0.22] text-white"
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
