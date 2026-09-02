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
    if (rawTrace[0].line === 1) return rawTrace;

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

    const reindexed = rawTrace.map((s, idx) => ({
      ...s,
      step: idx + 2
    }));

    return [mock0, mock1, ...reindexed];
  }, [rawTrace]);

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
      playbackSpeed === 0.25 ? 6000 : playbackSpeed === 0.5 ? 3000 : 1500;

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

  const currentFrame = trace[currentStep];
  const previousFrame = currentStep > 0 ? trace[currentStep - 1] : undefined;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-neutral-100 select-none">
      <Header
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onRunTrace={handleRunTrace}
        isLoading={isLoading}
      />

      {error && (
        <div className="px-5 py-1.5 bg-neutral-900 border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-neutral-300">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-neutral-500 hover:text-neutral-300 text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <section className="w-1/2 h-full">
          <CodeEditor
            code={code}
            onChange={(val) => setCode(val || "")}
            currentLine={currentFrame?.line}
          />
        </section>

        <section className="w-1/2 h-full overflow-hidden">
          <StateVisualizer
            currentFrame={currentFrame}
            previousFrame={previousFrame}
            totalSteps={trace.length}
            currentStep={currentStep}
            trace={trace}
            code={code}
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
