"use client";

import React, { useMemo, useState } from "react";
import { TraceStep } from "@/types/tracer";
import { VariableCard } from "./VariableCard";
import { MemoryTable } from "./MemoryTable";
import { ArrayVisualizer } from "./ArrayVisualizer";
import { CallStackVisualizer } from "./CallStackVisualizer";
import { Terminal, Layers, Box, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { computeGlobalTraceBlocks } from "@/lib/objectPermanence";

interface StateVisualizerProps {
  currentFrame?: TraceStep;
  previousFrame?: TraceStep;
  totalSteps: number;
  currentStep: number;
  trace: TraceStep[];
  code?: string;
}

export const StateVisualizer: React.FC<StateVisualizerProps> = ({
  currentFrame,
  previousFrame,
  totalSteps,
  currentStep,
  trace,
  code = ""
}) => {
  const [activeTab, setActiveTab] = useState<"visualizer" | "terminal" | "callstack">("visualizer");

  const activeLineCode = useMemo(() => {
    if (!code || !currentFrame?.line) return "";
    const lines = code.split("\n");
    return lines[currentFrame.line - 1] || "";
  }, [code, currentFrame?.line]);

  const activeIdentifiers = useMemo(() => {
    if (!activeLineCode) return new Set<string>();
    const matches = activeLineCode.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    return new Set(matches);
  }, [activeLineCode]);

  const persistentLocals = useMemo(() => {
    if (!trace || trace.length === 0) return {};
    const accum: Record<string, any> = {};
    const maxIdx = Math.min(currentStep, trace.length - 1);

    for (let i = 0; i <= maxIdx; i++) {
      const frameLocals = trace[i]?.locals || {};
      Object.entries(frameLocals).forEach(([k, v]) => {
        accum[k] = v;
      });
    }

    return accum;
  }, [trace, currentStep]);

  const prevLocals = previousFrame?.locals || {};
  const currLocals = currentFrame?.locals || {};

  // Compute 3D kinetic physical array states with universal object permanence
  const { arrayStates, globalMaxVal } = useMemo(() => {
    return computeGlobalTraceBlocks(trace, currentStep, code);
  }, [trace, currentStep, code]);

  const { persistentPrimitives, activeKeys } = useMemo(() => {
    const prims: Record<string, any> = {};
    const active = new Set<string>();

    Object.entries(persistentLocals).forEach(([key, val]) => {
      if (key === "args") return; // Hardcode ignore "args"

      const isMutated = prevLocals[key] !== undefined && prevLocals[key] !== val;
      const isReferenced = activeIdentifiers.has(key);

      if (isMutated || isReferenced) {
        active.add(key);
      }

      if (!Array.isArray(val)) {
        prims[key] = val;
      }
    });

    return {
      persistentPrimitives: prims,
      activeKeys: active
    };
  }, [persistentLocals, prevLocals, activeIdentifiers]);

  const progressiveConsoleLines = useMemo(() => {
    if (!trace || trace.length === 0) return [];
    const lines: string[] = [];
    const maxIdx = Math.min(currentStep, trace.length - 1);
    for (let i = 0; i <= maxIdx; i++) {
      if (trace[i]?.stdout) {
        const frameLines = trace[i].stdout!.split("\n");
        frameLines.forEach((l) => {
          if (l && !lines.includes(l)) {
            lines.push(l);
          }
        });
      }
    }
    return lines;
  }, [trace, currentStep]);

  // Hide "args" and render actively animated/modified array at the very top
  const arrayStateList = useMemo(() => {
    const list = Object.values(arrayStates).filter((s) => s.name !== "args");
    return list.sort((a, b) => {
      const aActive =
        a.swapIndices !== null ||
        a.blocks.some((b) => b.status === "writing" || b.status === "reading") ||
        a.pointers.some((p) => p.actionType !== "idle");
      const bActive =
        b.swapIndices !== null ||
        b.blocks.some((b) => b.status === "writing" || b.status === "reading") ||
        b.pointers.some((p) => p.actionType !== "idle");

      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [arrayStates]);

  const primitiveEntries = Object.entries(persistentPrimitives).reverse();
  const callStack = currentFrame?.callStack || ["Solution.main"];
  const isCountingLength = Boolean(
    /\b(int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=\s*([a-zA-Z_]\w*)\.length\b|\b([a-zA-Z_]\w*)\s*=\s*len\s*\(/.test(activeLineCode)
  );

  const stepNewStdout = useMemo(() => {
    if (!currentFrame?.stdout) return null;
    const curr = currentFrame.stdout.trim();
    const prev = previousFrame?.stdout ? previousFrame.stdout.trim() : "";

    if (curr && curr !== prev) {
      if (curr.startsWith(prev)) {
        const added = curr.slice(prev.length).trim();
        return added || null;
      }
      return curr;
    }
    return null;
  }, [currentFrame, previousFrame]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0a] relative">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="p-1 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-1">
          <button
            onClick={() => setActiveTab("visualizer")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
              activeTab === "visualizer"
                ? "bg-white/10 text-white font-semibold border border-white/10 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>State Visualizer</span>
          </button>

          <button
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
              activeTab === "terminal"
                ? "bg-white/10 text-white font-semibold border border-white/10 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal Output</span>
            {progressiveConsoleLines.length > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {progressiveConsoleLines.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("callstack")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
              activeTab === "callstack"
                ? "bg-white/10 text-white font-semibold border border-white/10 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Call Stack</span>
            {callStack.length > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-neutral-800 text-neutral-300 font-bold border border-neutral-700">
                {callStack.length}
              </span>
            )}
          </button>
        </div>

        <span className="px-3 py-1.5 rounded-lg font-mono text-xs bg-white/[0.03] border border-white/[0.08] text-neutral-400 font-medium">
          Step {currentFrame ? currentFrame.step : 0} of {totalSteps}
        </span>
      </div>

      {activeTab === "visualizer" && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          <AnimatePresence>
            {stepNewStdout && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-100 font-mono text-xs shadow-lg flex items-center gap-2.5 z-30 mb-2"
              >
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-emerald-400">stdout:</span>
                <span className="whitespace-pre-wrap">{stepNewStdout}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {currentFrame?.line === 1 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 font-mono text-xs flex flex-col gap-1.5 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-bold">Class:</span>
                  <span className="text-white font-bold text-sm bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                    Solution
                  </span>
                </div>
                <div className="text-xs pl-6 flex items-center gap-1.5">
                  <span className="text-neutral-300 font-semibold">Access:</span>
                  <span className="text-cyan-300 font-bold">public</span>
                </div>
              </motion.div>
            )}

            {currentFrame?.line === 2 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 font-mono text-xs flex flex-col gap-1.5 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-bold">Method:</span>
                  <span className="text-white font-bold text-sm bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                    main
                  </span>
                </div>
                <div className="text-xs pl-6 flex flex-col gap-1 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-300 font-semibold">Access:</span>
                    <span className="text-cyan-300 font-bold">public</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-300 font-semibold">Modifier:</span>
                    <span className="text-amber-300 font-bold">static</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-300 font-semibold">Returns:</span>
                    <span className="text-emerald-300 font-bold">void</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {arrayStateList.length === 0 && primitiveEntries.length === 0 && (currentFrame?.line || 0) > 2 ? (
            <div className="h-44 rounded-lg border border-white/[0.06] flex flex-col items-center justify-center p-6 text-center">
              <span className="font-mono text-xs text-neutral-500">
                No active memory operations on line {currentFrame?.line ?? "--"}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {arrayStateList.length > 0 &&
                arrayStateList.map((state) => (
                  <ArrayVisualizer
                    key={state.name}
                    name={state.name}
                    blocks={state.blocks}
                    pointers={state.pointers}
                    maxVal={globalMaxVal}
                    swapIndices={state.swapIndices}
                    currentStep={currentStep}
                    isCountingLength={isCountingLength}
                    currentFrame={currentFrame}
                    activeLineCode={activeLineCode}
                    memoryVariables={primitiveEntries.map(([name, val]) => ({
                      name,
                      value: val,
                      prevValue: prevLocals[name],
                      isMutated: prevLocals[name] !== undefined && prevLocals[name] !== val,
                      isActive: activeKeys.has(name),
                    }))}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "terminal" && (
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-2 bg-[#050505]">
          {progressiveConsoleLines.length === 0 ? (
            <div className="text-neutral-600 italic text-xs">
              No console output recorded so far. Use System.out.println() in Java.
            </div>
          ) : (
            progressiveConsoleLines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-3 text-neutral-200">
                <span className="text-neutral-600 text-[10px] select-none min-w-[20px]">
                  {idx + 1}
                </span>
                <span className="whitespace-pre-wrap">{line}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "callstack" && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <CallStackVisualizer callStack={callStack} />
        </div>
      )}
    </div>
  );
};
