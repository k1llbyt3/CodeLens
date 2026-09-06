"use client";
import React, { useState, useMemo } from "react";
import { MemoryTable } from "./MemoryTable";
import { ThreeArrayBlocks } from "./ArrayBlock";

export interface ArrayVisualizerProps {
  name?: string;
  blocks?: any[];
  pointers?: any[];
  maxVal?: number;
  swapIndices?: [number, number] | null;
  isCountingLength?: boolean;
  currentFrame?: any;
  activeLineCode?: string;
  currentStep?: number;
  memoryVariables?: any[];
  [key: string]: any;
}

export const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({
  name,
  blocks = [],
  pointers = [],
  maxVal,
  swapIndices = null,
  isCountingLength = false,
  currentFrame,
  activeLineCode = "",
  currentStep = 0,
  memoryVariables = [],
}) => {
  const [activeOverrideIdx, setActiveOverrideIdx] = useState<number | null>(null);

  // Normalize array elements from trace blocks ({ val, status, ... } or raw numbers)
  const { currentArray, activeIndices, computedMin,computedMax } = useMemo(() => {
    let rawVals: { val: number; state: string }[] = [];

    if (blocks && blocks.length > 0) {
      rawVals = blocks.map((b, i) => {
        const val =
          typeof b === "number"
            ? b
            : typeof b?.val === "number"
            ? b.val
            : typeof b?.value === "number"
            ? b.value
            : 0;
        const isSwapping = swapIndices && (swapIndices[0] === i || swapIndices[1] === i);
        const isActive =
          b?.status === "writing" ||
          b?.status === "reading" ||
          b?.state === "active" ||
          isSwapping ||
          activeOverrideIdx === i;
        const state = isSwapping
          ? "amber"
          : b?.state || (isActive ? "active" : b?.status === "reading" ? "amber" : "default");
        return {
          val,
          state,
        };
      });
    } else {
      rawVals = [];
    }

    const calculatedMax =
      maxVal && maxVal > 0
        ? maxVal
        : Math.max(...rawVals.map((item) => item.val), 1);

    const calculatedMin =
      rawVals.length > 0
        ? Math.min(...rawVals.map((item) => item.val))
        : 0;

    const activeSet = new Set<number>();
    rawVals.forEach((item, i) => {
      if (item.state !== "default") {
        activeSet.add(i);
      }
    });

    return {
      currentArray: rawVals,
      activeIndices: activeSet,
      computedMax: calculatedMax,
      computedMin: calculatedMin,
    };
  }, [blocks, activeOverrideIdx, maxVal, swapIndices]);

  const count = currentArray.length;

  if (count === 0) {
    return null;
  }

  // Shared geometry constants strictly locked to Three.js base & block layout
  const itemWidth = 68;
  const gap = 38;
  const paddingX = 28;
  const contentWidth = count * itemWidth + Math.max(0, count - 1) * gap;
  const totalWidth = Math.max(280, 2 * paddingX + contentWidth);
  const sceneHeight = 280;

  // Normalize pointers list for any number of dynamic pointers
  const normalizedPointers = useMemo(() => {
    if (!pointers || pointers.length === 0) return [];
    return pointers.map((p, idx) => {
      const index =
        typeof p === "number"
          ? p
          : typeof p?.index === "number"
          ? p.index
          : typeof p?.idx === "number"
          ? p.idx
          : 0;
      const label =
        typeof p === "object"
          ? p?.name || p?.label || p?.var || `p${idx}`
          : `p${idx}`;
      return { index, label };
    });
  }, [pointers]);

  const firstPointer = pointers && pointers.length > 0 ? pointers[0] : null;
  const pointerIndex: number | null =
    firstPointer != null
      ? typeof firstPointer === "number"
        ? firstPointer
        : typeof firstPointer?.index === "number"
        ? firstPointer.index
        : null
      : null;
  const pointerLabel: string = firstPointer?.name || firstPointer?.label || "";

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* Visualizer Header */}
      <div className="w-full max-w-4xl mb-2 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2">
          {name && (
            <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
              {name}
            </span>
          )}
          <span className="text-xs font-mono text-neutral-400">
            <span className="text-neutral-200 font-semibold">{count} elements</span> &bull; Min:{" "}
            <span className="text-emerald-400 font-semibold">{computedMin}</span> &bull; Max:{" "}
            <span className="text-cyan-400 font-semibold">{computedMax}</span>
          </span>
        </div>
      </div>

      {/* Memory Table - Positioned cleanly BELOW the array header */}
      {memoryVariables && memoryVariables.length > 0 && (
        <div className="w-full max-w-4xl px-2 my-2">
          <MemoryTable
            variables={memoryVariables}
            activeLineCode={activeLineCode}
          />
        </div>
      )}

      {/* Main Responsive Horizontal Scroll Wrapper */}
      <div className="w-full overflow-visible pb-4 flex justify-center">
        <div
          className="relative flex flex-col items-center overflow-visible"
          style={{ width: `${totalWidth}px` }}
        >
          {/* ═══ THREE.JS 3D ARRAY SYSTEM (BLOCKS + BASE) ═══ */}
          <ThreeArrayBlocks
            currentArray={currentArray}
            activeIndices={activeIndices}
            computedMax={computedMax}
            totalWidth={totalWidth}
            itemWidth={itemWidth}
            gap={gap}
            paddingX={paddingX}
            sceneHeight={sceneHeight}
            pointerIndex={pointerIndex}
            pointerLabel={pointerLabel}
            pointers={normalizedPointers}
            swapIndices={swapIndices}
            isCountingLength={isCountingLength}
            currentFrame={currentFrame}
            activeLineCode={activeLineCode}
            currentStep={currentStep}
            onBlockClick={(idx) => setActiveOverrideIdx(activeOverrideIdx === idx ? null : idx)}
          />
        </div>
      </div>
    </div>
  );
};