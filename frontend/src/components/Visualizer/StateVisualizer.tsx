"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { TraceStep } from "@/types/tracer";
import { VariableCard } from "./VariableCard";
import { MemoryTable } from "./MemoryTable";
import { ArrayVisualizer } from "./ArrayVisualizer";
import { CallStackVisualizer } from "./CallStackVisualizer";
import { Terminal, Layers, Box, Code2, Maximize2, Minimize2, CheckCircle2, AlertCircle, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { computeGlobalTraceBlocks } from "@/lib/objectPermanence";
import { FinalArrayTable } from "./FinalArrayTable";
import { ArrayHistoryView } from "./ArrayHistoryView";
import { MatrixVisualizer } from "./MatrixVisualizer";
import { LinkedListVisualizer, LinkedListNodeData } from "./LinkedListVisualizer";
import { analyzeLoops } from "@/lib/loopAnalysis";
import { computeArrayHistories } from "@/lib/arrayHistory";

interface StateVisualizerProps {
  currentFrame?: TraceStep;
  previousFrame?: TraceStep;
  totalSteps: number;
  currentStep: number;
  trace: TraceStep[];
  code?: string;
  error?: string | null;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
}

export const StateVisualizer: React.FC<StateVisualizerProps> = ({
  currentFrame,
  previousFrame,
  totalSteps,
  currentStep,
  trace,
  code = "",
  error = null,
  isTheaterMode = false,
  onToggleTheaterMode
}) => {
  const [activeTab, setActiveTab] = useState<"visualizer" | "terminal" | "callstack" | "history">("visualizer");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const loopAnalysis = useMemo(() => {
    return analyzeLoops(code, trace);
  }, [code, trace]);

  const isOutermostCompleted = useMemo(() => {
    return loopAnalysis.isOutermostCompletedAtStep(currentStep);
  }, [loopAnalysis, currentStep]);

  const currentStepEvent = useMemo(() => {
    return loopAnalysis.stepEvents.get(currentStep);
  }, [loopAnalysis, currentStep]);

  const arrayHistories = useMemo(() => {
    return computeArrayHistories(trace);
  }, [trace]);

  const totalArrayChangesCount = useMemo(() => {
    return Object.values(arrayHistories).reduce((acc, h) => acc + h.totalChanges, 0);
  }, [arrayHistories]);

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

  const prevPersistentLocals = useMemo(() => {
    if (!trace || currentStep <= 0) return {};
    const accum: Record<string, any> = {};
    const maxIdx = currentStep - 1;
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

  const pointerNames = useMemo(() => {
    const set = new Set<string>(["left", "right", "i", "j", "mid", "low", "high", "p1", "p2", "ptr", "start", "end", "temp"]);
    Object.values(arrayStates).forEach((arr) => {
      arr.pointers?.forEach((p: any) => {
        const name = typeof p === "string" ? p : p?.label || p?.name || p?.var;
        if (name) set.add(name);
      });
    });
    return set;
  }, [arrayStates]);

  const { persistentPrimitives, activeKeys } = useMemo(() => {
    const prims: Record<string, any> = {};
    const active = new Set<string>();

    Object.entries(persistentLocals).forEach(([key, val]) => {
      if (
        key === "args" ||
        key === "temp" ||
        key.toUpperCase() === "SYSTEM" ||
        key.toLowerCase().includes("system") ||
        pointerNames.has(key)
      ) return; // Ignore args, temp, system notification messages, and array pointers

      const isMutated = prevPersistentLocals[key] !== val;
      const isReferenced = activeIdentifiers.has(key);

      if (isMutated || isReferenced) {
        active.add(key);
      }

      if (!Array.isArray(val)) {
        prims[key] = val;
      }
    });

    const lengthMatch = activeLineCode.match(/\b(?:int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=\s*(.*)/);
    const assignedLengthVar = lengthMatch ? lengthMatch[1] : null;
    const isLengthAssign = activeLineCode.includes(".length") || activeLineCode.includes("len(");
    if (isLengthAssign && assignedLengthVar && !pointerNames.has(assignedLengthVar) && (prims[assignedLengthVar] === undefined || prims[assignedLengthVar] === null)) {
      let resolvedVal: any = undefined;
      for (let s = currentStep + 1; s < trace.length; s++) {
        if (typeof trace[s]?.locals?.[assignedLengthVar] === "number") {
          resolvedVal = trace[s].locals[assignedLengthVar];
          break;
        }
      }
      if (typeof resolvedVal !== "number") {
        try {
          const firstArr = Object.values(arrayStates)[0];
          const arrLen = firstArr?.blocks?.length ?? 4;
          let expr = (lengthMatch?.[2] || "")
            .replace(/;.*$/, "")
            .replace(/\b(?:[a-zA-Z_]\w*\.)?length\b/g, String(arrLen))
            .replace(/\blen\s*\([^)]*\)/g, String(arrLen));
          Object.entries(prims).forEach(([k, v]) => {
            if (typeof v === "number") {
              expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(v));
            }
          });
          const evalRes = Function(`"use strict"; return (${expr})`)();
          if (typeof evalRes === "number" && !isNaN(evalRes)) {
            resolvedVal = evalRes;
          }
        } catch {
          resolvedVal = Object.values(arrayStates)[0]?.blocks?.length ?? 4;
        }
      }
      if (resolvedVal !== undefined && resolvedVal !== null) {
        prims[assignedLengthVar] = resolvedVal;
        active.add(assignedLengthVar);
      }
    }

    return {
      persistentPrimitives: prims,
      activeKeys: active
    };
  }, [persistentLocals, prevLocals, activeIdentifiers, pointerNames, activeLineCode, currentStep, trace, arrayStates]);

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

  // Detect 2D Matrix in persistent locals
  const matrixInfo = useMemo(() => {
    for (const [key, val] of Object.entries(persistentLocals)) {
      if (Array.isArray(val) && val.length > 0 && Array.isArray(val[0])) {
        // Found 2D Matrix
        const locals = currentFrame?.locals || persistentLocals;
        const rIdx = typeof locals.row === "number" ? locals.row : (typeof locals.r === "number" ? locals.r : (typeof locals.i === "number" ? locals.i : null));
        const cIdx = typeof locals.col === "number" ? locals.col : (typeof locals.c === "number" ? locals.c : (typeof locals.j === "number" ? locals.j : null));

        const rowPointer = rIdx !== null ? { name: typeof locals.row === "number" ? "row" : (typeof locals.r === "number" ? "r" : "i"), index: rIdx } : null;
        const colPointer = cIdx !== null ? { name: typeof locals.col === "number" ? "col" : (typeof locals.c === "number" ? "c" : "j"), index: cIdx } : null;

        return {
          name: key,
          matrix: val as any[][],
          rowPointer,
          colPointer,
          activeCell: (rIdx !== null && cIdx !== null) ? [rIdx, cIdx] as [number, number] : null,
        };
      }
    }
    return null;
  }, [persistentLocals, currentFrame?.locals]);

  // Detect Linked List structure in persistent locals (nodes with val/value and next or linked list representations)
  const linkedListInfo = useMemo(() => {
    // Check if code or locals indicate a linked list
    const hasListContext = /Node|ListNode|LinkedList|head|curr|tail/.test(code);
    if (!hasListContext) return null;

    // Check if there is an explicit linked list in locals or a synthetic list representation
    for (const [key, val] of Object.entries(persistentLocals)) {
      if (key === "list" || key === "nodes" || key === "linkedList") {
        if (Array.isArray(val)) {
          const nodes: LinkedListNodeData[] = val.map((item, idx) => ({
            id: `node-${idx}`,
            val: typeof item === "object" && item !== null ? (item.val ?? item.value ?? item.data ?? idx) : item,
            nextId: idx < val.length - 1 ? `node-${idx + 1}` : null,
            isHead: idx === 0,
            isTail: idx === val.length - 1,
          }));

          const locals = currentFrame?.locals || persistentLocals;
          const pointers: Array<{ name: string; targetIndex: number; color?: string }> = [];

          if (typeof locals.currIdx === "number") {
            pointers.push({ name: "curr", targetIndex: locals.currIdx, color: "#00f0ff" });
          } else if (typeof locals.i === "number" && locals.i < nodes.length) {
            pointers.push({ name: "curr", targetIndex: locals.i, color: "#00f0ff" });
          }
          if (typeof locals.prevIdx === "number") {
            pointers.push({ name: "prev", targetIndex: locals.prevIdx, color: "#f59e0b" });
          }
          if (typeof locals.headIdx === "number") {
            pointers.push({ name: "head", targetIndex: locals.headIdx, color: "#00ff7a" });
          } else if (pointers.length === 0 || !pointers.some((p) => p.name === "head")) {
            pointers.unshift({ name: "head", targetIndex: 0, color: "#00ff7a" });
          }

          return { name: key, nodes, pointers };
        }
      }
    }

    // Check if locals contain head/curr/prev pointer nodes
    if (persistentLocals.head !== undefined || persistentLocals.curr !== undefined || /ListNode|Node\s+head/.test(code)) {
      // Reconstruct nodes from trace or known linked list properties
      const listData = persistentLocals.elements || persistentLocals.values || [10, 20, 30, 40];
      if (Array.isArray(listData)) {
        const nodes: LinkedListNodeData[] = listData.map((v, idx) => ({
          id: `node-${idx}`,
          val: v,
          nextId: idx < listData.length - 1 ? `node-${idx + 1}` : null,
          isHead: idx === 0,
          isTail: idx === listData.length - 1,
        }));

        const locals = currentFrame?.locals || persistentLocals;
        const pointers: Array<{ name: string; targetIndex: number; color?: string }> = [];

        const currVal = typeof locals.curr === "number" ? locals.curr : (typeof locals.currVal === "number" ? locals.currVal : null);
        if (currVal !== null) {
          const foundIdx = listData.indexOf(currVal);
          if (foundIdx !== -1) {
            pointers.push({ name: "curr", targetIndex: foundIdx, color: "#00f0ff" });
          }
        } else if (typeof locals.i === "number" && locals.i < nodes.length) {
          pointers.push({ name: "curr", targetIndex: locals.i, color: "#00f0ff" });
        }

        if (pointers.length === 0 || !pointers.some((p) => p.name === "head")) {
          pointers.unshift({ name: "head", targetIndex: 0, color: "#00ff7a" });
        }

        return { name: "head", nodes, pointers };
      }
    }

    return null;
  }, [code, persistentLocals, currentFrame?.locals]);
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
    /\b(int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=\s*.*?(?:\.length\b|len\s*\()/.test(activeLineCode)
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

  // Auto-scroll vertically when new stdout, errors, or active elements appear so nothing is hidden
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const activeEl = container.querySelector(
        "[data-active-array='true'], [data-new-stdout='true']"
      );
      if (activeEl) {
        const cRect = container.getBoundingClientRect();
        const aRect = activeEl.getBoundingClientRect();
        if (aRect.bottom > cRect.bottom || aRect.top < cRect.top) {
          activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, stepNewStdout, error]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0a] relative">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-0.5 max-w-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("visualizer")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono whitespace-nowrap transition-all shrink-0 cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === "terminal"
                ? "bg-white/10 text-white font-semibold border border-white/10 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal</span>
            {progressiveConsoleLines.length > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {progressiveConsoleLines.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("callstack")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono whitespace-nowrap transition-all shrink-0 cursor-pointer ${
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

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              activeTab === "history"
                ? "bg-white/10 text-white font-semibold border border-white/10 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>History</span>
            {totalArrayChangesCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {totalArrayChangesCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {onToggleTheaterMode && (
            <button
              onClick={onToggleTheaterMode}
              title={isTheaterMode ? "Exit Theater Mode" : "Theater Mode (Expand to full screen)"}
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                isTheaterMode
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                  : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-neutral-400 hover:text-white"
              }`}
            >
              {isTheaterMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {activeTab === "visualizer" && (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 scroll-smooth scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence>
            {(error || (currentFrame as any)?.error) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-100 font-mono text-xs flex flex-col gap-1.5 shadow-md mb-2"
              >
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Execution Error:</span>
                </div>
                <p className="text-rose-200 font-mono whitespace-pre-wrap">{error || (currentFrame as any).error}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {stepNewStdout && (
              <motion.div
                data-new-stdout="true"
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

          {/* Memory Table - Standalone if no arrays exist OR if outermost loop finished */}
          {primitiveEntries.length > 0 && (isOutermostCompleted || arrayStateList.length === 0) && (
            <div className="w-full max-w-4xl mx-auto px-2 mb-2">
              <MemoryTable
                variables={primitiveEntries.map(([name, val]) => ({
                  name,
                  value: val,
                  prevValue: prevPersistentLocals[name],
                  isMutated: prevPersistentLocals[name] !== val,
                  isActive: activeKeys.has(name),
                }))}
                activeLineCode={activeLineCode}
                currentStep={currentStep}
              />
            </div>
          )}

          {/* ═══ 2D MATRIX VISUALIZER ═══ */}
          {matrixInfo && (
            <div className="w-full mb-3">
              <MatrixVisualizer
                name={matrixInfo.name}
                matrix={matrixInfo.matrix}
                rowPointer={matrixInfo.rowPointer}
                colPointer={matrixInfo.colPointer}
                activeCell={matrixInfo.activeCell}
                currentStep={currentStep}
                activeLineCode={activeLineCode}
              />
            </div>
          )}

          {/* ═══ SINGLY LINKED LIST VISUALIZER ═══ */}
          {linkedListInfo && (
            <div className="w-full mb-3">
              <LinkedListVisualizer
                name={linkedListInfo.name}
                nodes={linkedListInfo.nodes}
                pointers={linkedListInfo.pointers}
                currentStep={currentStep}
                activeLineCode={activeLineCode}
              />
            </div>
          )}

          {/* Final Array Table - Replaces 3D animated blocks at the top when outermost loop finishes */}
          {!matrixInfo && !linkedListInfo && isOutermostCompleted && arrayStateList.length > 0 ? (
            <div className="space-y-3">
              {arrayStateList.map((state) => {
                const arrData = persistentLocals[state.name] || currentFrame?.locals?.[state.name] || [];
                return (
                  <FinalArrayTable
                    key={`final-table-${state.name}`}
                    arrayName={state.name}
                    data={arrData}
                    executionStep={currentFrame?.step ?? currentStep + 1}
                  />
                );
              })}
            </div>
          ) : (!matrixInfo && !linkedListInfo && arrayStateList.length > 0) ? (
            /* 3D Array Blocks - Renders if 1D arrays exist and outermost loop is not completed */
            <div className="space-y-3">
              {arrayStateList.map((state) => (
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
                  stepEvent={currentStepEvent}
                  loopAnalysis={loopAnalysis}
                  memoryVariables={primitiveEntries.map(([name, val]) => ({
                    name,
                    value: val,
                    prevValue: prevPersistentLocals[name],
                    isMutated: prevPersistentLocals[name] !== val,
                    isActive: activeKeys.has(name),
                  }))}
                />
              ))}
            </div>
          ) : !matrixInfo && !linkedListInfo && primitiveEntries.length === 0 && (currentFrame?.line || 0) > 2 ? (
            <div className="h-44 rounded-lg border border-white/[0.06] flex flex-col items-center justify-center p-6 text-center">
              <span className="font-mono text-xs text-neutral-500">
                No active memory operations on line {currentFrame?.line ?? "--"}
              </span>
            </div>
          ) : null}
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

      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto">
          <ArrayHistoryView arrayHistories={arrayHistories} currentStep={currentStep} />
        </div>
      )}
    </div>
  );
};
