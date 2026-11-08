"use client";

import React from "react";
import { Terminal, Play, Loader2 } from "lucide-react";
import { PRESETS } from "@/lib/presets";

interface HeaderProps {
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  onRunTrace: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedPresetId,
  onSelectPreset,
  onRunTrace,
  isLoading
}) => {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#0a0a0a] border-b border-neutral-800 select-none z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          {/* Main Logo Container */}
          <div className="relative flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="CodeLens"
              className="h-12 max-w-[160px] object-contain"
              onError={(e) => {
                // Graceful fallback if image fails to load
                e.currentTarget.style.display = "none";
                const fallback = document.getElementById("codelens-logo-fallback");
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div id="codelens-logo-fallback" className="hidden items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-wider text-cyan-400">
                CodeLens
              </span>
            </div>
          </div>
        </div>

        <div className="h-3.5 w-px bg-neutral-800" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-500">Preset</span>
          <select
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="px-2.5 py-1 text-xs font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md focus:outline-none focus:border-neutral-700 cursor-pointer"
          >
            <option value="" className="bg-neutral-900 text-neutral-400">
              Select Preset...
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-200">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

    </header>
  );
};
