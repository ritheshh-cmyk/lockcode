"use client";

import React, { useEffect, useState } from "react";

interface ControlCenterHeaderProps {
  activeProvidersCount: number;
  totalLicensesCount: number;
  onSignOut: () => void;
}

export function ControlCenterHeader({
  activeProvidersCount,
  totalLicensesCount,
  onSignOut,
}: ControlCenterHeaderProps) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-black/80 backdrop-blur-2xl transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: macOS Window Controls & Title */}
        <div className="flex items-center space-x-4">
          {/* Traffic Light Dots */}
          <div className="hidden sm:flex items-center space-x-2 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/40 shadow-sm inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/40 shadow-sm inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/40 shadow-sm inline-block"></span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-md shadow-black/40">
              <span className="material-symbols-outlined text-[#0a84ff] text-[20px]">
                neurology
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold tracking-tight text-white">
                  TITAN Control Center
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
                  Sequoia 3.0
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-[#86868b]">
                <span>Cloud Brain</span>
                <span>•</span>
                <span className="font-mono text-[10px] text-white/60">
                  {currentTime || "12:00:00"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Telemetry Badges & Quick Actions */}
        <div className="flex items-center space-x-3">
          {/* Brain Status Pill */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Brain: {activeProvidersCount} Provider{activeProvidersCount !== 1 ? "s" : ""} Online</span>
          </div>

          {/* Licenses Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-[#86868b]">
            <span className="material-symbols-outlined text-[14px] text-[#0a84ff]">
              vpn_key
            </span>
            <span>{totalLicensesCount} Client Keys</span>
          </div>

          {/* Lock / Sign Out */}
          <button
            onClick={onSignOut}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-white transition-all duration-150 active:scale-95"
            title="Lock Control Center"
          >
            <span className="material-symbols-outlined text-[16px] text-[#86868b]">
              lock
            </span>
            <span className="hidden sm:inline">Lock Console</span>
          </button>
        </div>
      </div>
    </header>
  );
}
