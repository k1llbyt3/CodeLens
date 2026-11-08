"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { TraceStep, TraceResponse } from "@/types/tracer";
import { PRESETS } from "@/lib/presets";
import { Header } from "@/components/Header";
import { CodeEditor } from "@/components/CodeEditor";
import { StateVisualizer } from "@/components/Visualizer/StateVisualizer";
import { PlaybackBar } from "@/components/PlaybackBar";

const DEFAULT_TEMPLATE = `public class Solution {
    public static void main(String[] args) {
        // Write your code here...

    }
}`;

export default function CodeLensPage() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [code, setCode] = useState<string>(DEFAULT_TEMPLATE);
  const [rawTrace, setRawTrace] = useState<TraceStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const trace = useMemo(() => {
    if (!rawTrace || rawTrace.length === 0) return [];
    const normalized = rawTrace;
    if (normalized[0]?.line === 1) return normalized;

    const mock0: TraceStep = {
      step: 0,
      line: 1,
      locals: {},
      callStack: ["Solution"]
    };
    const mock1: TraceStep = {
      step: 1,
      line: 2,
      locals: {},
      callStack: ["Solution.main"]
    };

    const reindexed = normalized.map((s, idx) => ({
      ...s,
      step: idx + 2
    }));

    return [mock0, mock1, ...reindexed];
  }, [rawTrace, code]);

  const handleSelectPreset = (id: string) => {
    if (!id) {
      setSelectedPresetId("");
      setCode(DEFAULT_TEMPLATE);
      setRawTrace([]);
      setCurrentStep(0);
      setIsPlaying(false);
      setError(null);
      return;
    }
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setSelectedPresetId(id);
    setCode(preset.code);
    setRawTrace(preset.fallbackTrace);
    setCurrentStep(0);
    setIsPlaying(false);
    setError(null);
  };

  const handleRunTrace = async () => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);

    try {
      const response = await axios.post<TraceResponse>(
        "http://127.0.0.1:8000/trace",
        { code, language: "java" },
        { timeout: 12000 }
      );

      if (response.data.status === "success" && Array.isArray(response.data.trace) && response.data.trace.length > 0) {
        setRawTrace(response.data.trace);
        setCurrentStep(0);
      } else if (response.data.error) {
        setError(response.data.error);
      } else {
        setError("Execution finished with no step trace generated.");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Backend engine offline. Displaying fallback trace timeline.";
      const fallback = PRESETS.find((p) => p.id === selectedPresetId)?.fallbackTrace || [];
      setRawTrace(fallback);
      setCurrentStep(0);
      setError(`Notice: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, trace.length - 1));
  }, [trace.length]);

  const handleStepBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleTogglePlay = () => {
    if (currentStep >= trace.length - 1) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs =
      playbackSpeed === 0.25 ? 8000 : playbackSpeed === 0.5 ? 4500 : 2800;

    playTimerRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= trace.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, trace.length, playbackSpeed]);

  useEffect(() => {
    const isInputOrEditor = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return true;
      if (
        el.closest(".monaco-editor") ||
        el.classList.contains("inputarea") ||
        el.classList.contains("monaco-mouse-cursor-text")
      ) {
        return true;
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeEl = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

      const inEditor = isInputOrEditor(target) || isInputOrEditor(activeEl);

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunTrace();
        return;
      }

      if (inEditor) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleStepForward();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleStepBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunTrace, handleTogglePlay, handleStepForward, handleStepBack]);

  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage of editor width (18% to 50%)
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  const handleMouseDownSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPct = (e.clientX / window.innerWidth) * 100;
      // Clamped between 18% (can move to the left) and 50% (strictly limited to right)
      const clamped = Math.max(18, Math.min(50, newPct));
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  const currentFrame = trace[currentStep];
  const previousFrame = currentStep > 0 ? trace[currentStep - 1] : undefined;

  const errorLine = useMemo(() => {
    if (!error) return undefined;
    const match = error.match(/line\s*(\d+)/i) || error.match(/:(\d+):/);
    return match ? parseInt(match[1], 10) : undefined;
  }, [error]);

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-neutral-100 select-none ${isDraggingSplit ? "cursor-col-resize select-none" : ""}`}>
      <Header
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onRunTrace={handleRunTrace}
        isLoading={isLoading}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {!isTheaterMode && (
          <section
            style={{ width: `${splitRatio}%` }}
            className={`h-full overflow-hidden ${isDraggingSplit ? "" : "transition-all duration-150"}`}
          >
            <CodeEditor
              code={code}
              onChange={(val) => setCode(val || "")}
              currentLine={currentFrame?.line}
              errorLine={errorLine}
            />
          </section>
        )}

        {!isTheaterMode && (
          <div
            onMouseDown={handleMouseDownSplit}
            className={`relative group w-1.5 hover:w-2 bg-[#171717] hover:bg-cyan-500/70 cursor-col-resize flex items-center justify-center transition-colors z-40 ${
              isDraggingSplit ? "bg-cyan-400 w-2 shadow-[0_0_12px_rgba(6,182,212,0.8)]" : ""
            }`}
            title="Drag to expand visualizer"
          >
            {/* Grab handle indicator */}
            <div className="absolute flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-full bg-neutral-800/90 group-hover:bg-cyan-950 border border-white/10 group-hover:border-cyan-400/50 shadow-md pointer-events-none transition-all">
              <span className="w-0.5 h-3 bg-neutral-400 group-hover:bg-cyan-300 rounded-full" />
              <span className="w-0.5 h-3 bg-neutral-400 group-hover:bg-cyan-300 rounded-full" />
            </div>

            {/* Quick adjust preset tags appearing on hover */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#121212]/95 border border-white/10 rounded-md p-1 shadow-xl z-50 text-[10px] font-mono pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setSplitRatio(25); }}
                className={`px-1.5 py-0.5 rounded hover:bg-cyan-500/20 hover:text-cyan-300 ${splitRatio <= 28 ? "text-cyan-400 font-bold bg-cyan-950/60" : "text-neutral-400"}`}
                title="Compact Editor (25%)"
              >
                25%
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSplitRatio(35); }}
                className={`px-1.5 py-0.5 rounded hover:bg-cyan-500/20 hover:text-cyan-300 ${splitRatio > 28 && splitRatio < 45 ? "text-cyan-400 font-bold bg-cyan-950/60" : "text-neutral-400"}`}
                title="Medium (35%)"
              >
                35%
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSplitRatio(50); }}
                className={`px-1.5 py-0.5 rounded hover:bg-cyan-500/20 hover:text-cyan-300 ${splitRatio >= 48 ? "text-cyan-400 font-bold bg-cyan-950/60" : "text-neutral-400"}`}
                title="Half Split (50% max)"
              >
                50%
              </button>
            </div>
          </div>
        )}

        <section
          style={{ width: isTheaterMode ? "100%" : `${100 - splitRatio}%` }}
          className={`h-full overflow-hidden ${isDraggingSplit ? "" : "transition-all duration-150"}`}
        >
          <StateVisualizer
            currentFrame={currentFrame}
            previousFrame={previousFrame}
            totalSteps={trace.length}
            currentStep={currentStep}
            trace={trace}
            code={code}
            error={error}
            isTheaterMode={isTheaterMode}
            onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
          />
        </section>
      </main>

      <PlaybackBar
        currentStep={currentStep}
        totalSteps={trace.length}
        isPlaying={isPlaying}
        speed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        onTogglePlay={handleTogglePlay}
        onStepForward={handleStepForward}
        onStepBack={handleStepBack}
        onReset={handleReset}
        onSeek={(step) => setCurrentStep(step)}
      />
    </div>
  );
}
