"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";

interface PlaybackBarProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSeek: (step: number) => void;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  speed = 1,
  onSpeedChange,
  onTogglePlay,
  onStepForward,
  onStepBack,
  onReset,
  onSeek
}) => {
  const progressPercent =
    totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  const handleJumpToEnd = () => {
    if (totalSteps > 0) {
      onSeek(totalSteps - 1);
    }
  };

  return (
    <div className="h-20 flex flex-col justify-between py-3 px-8 bg-[#0a0a0a] border-t border-white/[0.08] select-none z-30 shadow-2xl">
      <div className="w-full max-w-5xl mx-auto flex items-center gap-4">
        <span className="font-mono text-xs text-neutral-400 min-w-[75px] text-right font-medium">
          Step {totalSteps > 0 ? currentStep + 1 : 0}
        </span>

        <div className="relative flex-1 flex items-center h-5 group">
          <div className="absolute left-0 right-0 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-neutral-200 transition-[width] duration-100 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            disabled={totalSteps === 0}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="absolute left-0 right-0 w-full h-5 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-900 pointer-events-none transition-transform duration-100 group-hover:scale-125 shadow-md"
            style={{
              left: `calc(${progressPercent}% - 7px)`
            }}
          />
        </div>

        <span className="font-mono text-xs text-neutral-500 min-w-[65px]">
          / {totalSteps} total
        </span>
      </div>

      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <div className="w-28 hidden sm:block" />

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            disabled={totalSteps === 0}
            title="Skip to Start (|<<)"
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onStepBack}
            disabled={currentStep <= 0 || totalSteps === 0}
            title="Step Back (<)"
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <SkipBack className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={totalSteps === 0}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            className="w-10 h-10 rounded-lg bg-white text-black hover:bg-neutral-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-4.5 h-4.5 fill-current" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onStepForward}
            disabled={currentStep >= totalSteps - 1 || totalSteps === 0}
            title="Step Forward (>)"
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <SkipForward className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={handleJumpToEnd}
            disabled={currentStep >= totalSteps - 1 || totalSteps === 0}
            title="Skip to End (>>|)"
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls: 0.25x (6000ms), 0.5x (3000ms), 1x (1500ms) */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.08]">
          {[
            { label: "0.25x", val: 0.25, tooltip: "0.25x Ultra Slow (6000ms)" },
            { label: "0.5x", val: 0.5, tooltip: "0.5x Slow (3000ms)" },
            { label: "1x", val: 1, tooltip: "1x Normal (1500ms)" }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onSpeedChange?.(item.val)}
              title={item.tooltip}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                speed === item.val
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
