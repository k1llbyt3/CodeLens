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
          <div className="w-7 h-7 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-neutral-300" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wide text-neutral-100">
              CodeLens
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              / tracer
            </span>
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

      <div className="flex items-center gap-3">
        <button
          onClick={onRunTrace}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-neutral-100 text-neutral-900 font-mono text-xs font-medium hover:bg-white active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>{isLoading ? "Tracing" : "Run Trace"}</span>
          <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono bg-neutral-300 text-neutral-900 rounded-sm">
            Ctrl+↵
          </kbd>
        </button>
      </div>
    </header>
  );
};
