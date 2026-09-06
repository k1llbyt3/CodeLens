"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MemoryTableProps {
  variables: Array<{
    name: string;
    value: any;
    prevValue?: any;
    isMutated?: boolean;
    isActive?: boolean;
  }>;
  activeLineCode?: string;
}

export const MemoryTable: React.FC<MemoryTableProps> = ({
  variables,
  activeLineCode = "",
}) => {
  if (!variables || variables.length === 0) return null;

  const centerRef = useRef<HTMLDivElement>(null);
  const cellValueRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Guarantee SUM is on the left and TARGET is on the right
  const orderedVariables = useMemo(() => {
    const list = [...variables];
    const sumIdx = list.findIndex((v) => v.name === "sum");
    const targetIdx = list.findIndex((v) => v.name === "target");
    if (sumIdx !== -1 && targetIdx !== -1 && sumIdx > targetIdx) {
      const sumItem = list.splice(sumIdx, 1)[0];
      list.splice(targetIdx, 0, sumItem);
    }
    return list;
  }, [variables]);

  // Is current line a sum assignment?
  const isSumCalculation = useMemo(() => {
    return (
      (activeLineCode.includes("sum =") || activeLineCode.includes("sum=") || activeLineCode.includes("int sum")) &&
      !activeLineCode.includes("==") &&
      !activeLineCode.includes("<") &&
      !activeLineCode.includes(">")
    );
  }, [activeLineCode]);

  // Stored state for sum value: locked to old value during flight, updates only upon landing
  const [isSumSettled, setIsSumSettled] = useState(false);

  useEffect(() => {
    if (isSumCalculation) {
      setIsSumSettled(false);
      const timer = setTimeout(() => {
        setIsSumSettled(true);
      }, 1600);
      return () => clearTimeout(timer);
    } else {
      setIsSumSettled(true);
    }
  }, [isSumCalculation, activeLineCode]);

  // Dynamic variable comparison parser (e.g. if (sum == target), if (sum < target), etc.)
  const compInfo = useMemo(() => {
    const code = activeLineCode.trim();
    if (!code.startsWith("if") && !code.includes("if (") && !code.includes("if(")) return null;

    const match = code.match(/if\s*\(\s*([a-zA-Z_]\w*)\s*(==|!=|<=|>=|<|>)\s*([a-zA-Z_]\w*|\d+)\s*\)/);
    if (!match) return null;

    const leftVar = match[1];
    const op = match[2];
    const rightVar = match[3];

    const vA = orderedVariables.find((v) => v.name === leftVar);
    const vB = orderedVariables.find((v) => v.name === rightVar);

    if (!vA || !vB) return null;

    const idxA = orderedVariables.findIndex((v) => v.name === leftVar);
    const idxB = orderedVariables.findIndex((v) => v.name === rightVar);

    let isTrue = false;
    if (op === "==") isTrue = vA.value === vB.value;
    else if (op === "!=") isTrue = vA.value !== vB.value;
    else if (op === "<") isTrue = vA.value < vB.value;
    else if (op === ">") isTrue = vA.value > vB.value;
    else if (op === "<=") isTrue = vA.value <= vB.value;
    else if (op === ">=") isTrue = vA.value >= vB.value;

    return {
      leftVar,
      rightVar,
      valA: vA.value,
      valB: vB.value,
      op,
      idxA,
      idxB,
      isTrue,
      totalVars: orderedVariables.length,
    };
  }, [activeLineCode, orderedVariables]);

  // Measure exact real-time pixel distances from cell number positions to centered ==
  const [offsets, setOffsets] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!compInfo || !centerRef.current) {
      setOffsets({});
      return;
    }

    const compute = () => {
      if (!centerRef.current) return;
      const centerRect = centerRef.current.getBoundingClientRect();
      const newOffsets: { [key: string]: number } = {};

      const elA = cellValueRefs.current[compInfo.leftVar];
      const elB = cellValueRefs.current[compInfo.rightVar];

      if (elA && elB) {
        const rectA = elA.getBoundingClientRect();
        const rectB = elB.getBoundingClientRect();

        const centerMidX = centerRect.left + centerRect.width / 2;
        const originA_X = rectA.left + rectA.width / 2;
        const originB_X = rectB.left + rectB.width / 2;

        // Position A exactly 26px to the left of centered ==
        newOffsets[compInfo.leftVar] = centerMidX - originA_X - 26;
        // Position B exactly 26px to the right of centered ==
        newOffsets[compInfo.rightVar] = centerMidX - originB_X + 26;

        setOffsets(newOffsets);
      }
    };

    // Calculate immediately and on next frame to ensure layouts are stable
    compute();
    const raf = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(raf);
  }, [compInfo, orderedVariables]);

  return (
    <div className="w-full flex flex-col items-center select-none relative my-1">
      {/* ═══ SINGLE OUTLINED RECTANGLE (BOXES & LABELS 100% STATIC) ═══ */}
      <div className="w-full rounded-lg border border-white/20 bg-transparent overflow-visible relative min-h-[58px]">
        {/* ═══ CENTERED OPERATOR & NUMBERS + FALSE/TRUE (INTRO & OUTRO FROM EXACT SLOTS) ═══ */}
        <div
          ref={centerRef}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30"
        >
          <AnimatePresence>
            {compInfo && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center justify-center relative"
              >
                {/* 17 == 9 equation row with tight proximity to == */}
                <div className="flex items-center gap-1.5">
                  {/* Left number (e.g. 17 from sum) */}
                  <motion.span
                    layoutId={`var-val-${compInfo.leftVar}`}
                    className="font-mono text-lg font-black text-cyan-300 drop-shadow-[0_0_16px_rgba(56,189,248,1)]"
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  >
                    {compInfo.valA}
                  </motion.span>

                  {/* Operator == */}
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    className={`font-mono text-2xl font-black leading-none mx-0.5 ${
                      compInfo.isTrue
                        ? "text-emerald-400 drop-shadow-[0_0_16px_rgba(74,222,128,0.95)]"
                        : "text-rose-400 drop-shadow-[0_0_16px_rgba(248,113,113,0.95)]"
                    }`}
                  >
                    {compInfo.op}
                  </motion.span>

                  {/* Right number (e.g. 9 from target) */}
                  <motion.span
                    layoutId={`var-val-${compInfo.rightVar}`}
                    className="font-mono text-lg font-black text-amber-300 drop-shadow-[0_0_16px_rgba(245,158,11,1)]"
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  >
                    {compInfo.valB}
                  </motion.span>
                </div>

                {/* BIGGER FALSE / TRUE label directly beneath == */}
                <motion.span
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  className={`font-mono text-base font-black tracking-widest mt-1 leading-none ${
                    compInfo.isTrue
                      ? "text-emerald-400 drop-shadow-[0_0_16px_rgba(74,222,128,1)]"
                      : "text-rose-400 drop-shadow-[0_0_16px_rgba(248,113,113,1)]"
                  }`}
                >
                  {compInfo.isTrue ? "TRUE" : "FALSE"}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap divide-x divide-white/20 relative">
          {orderedVariables.map((item) => {
            const isVarA = compInfo && compInfo.leftVar === item.name;
            const isVarB = compInfo && compInfo.rightVar === item.name;
            const isCompared = Boolean(isVarA || isVarB);
            // Do NOT blur the compared variables (sum, target); only blur other unrelated variables if comparison is active
            const isBlurred = Boolean(compInfo && !isCompared);
            const isHighlighted = item.isActive || isCompared;
            const isMutated = item.isMutated;

            const isSumItem = item.name === "sum";

            // STRICT NO-PRE-STORE: Show previous value or "—" until flight settles
            const displayValue =
              isSumItem && isSumCalculation && !isSumSettled
                ? (item.prevValue ?? "—")
                : item.value;

            return (
              <div
                key={item.name}
                style={{
                  filter: isBlurred ? "blur(3.5px) opacity(0.20)" : "none",
                  transition: "filter 0.4s ease, opacity 0.4s ease",
                }}
                className="flex flex-col justify-between px-3 py-1.5 min-w-[62px] flex-grow bg-transparent transition-all duration-200 relative"
              >
                {/* Fixed stationary variable name - crisp and highlighted for compared variables */}
                <span
                  className={`text-[10px] font-mono font-extrabold tracking-wider select-none transition-colors duration-200 ${
                    isCompared
                      ? isVarA
                        ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.85)]"
                        : "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.85)]"
                      : "text-neutral-300"
                  }`}
                >
                  {item.name}
                </span>

                {/* Resting number inside cell */}
                <div
                  id={`memory-cell-value-${item.name}`}
                  ref={(el) => {
                    cellValueRefs.current[item.name] = el;
                  }}
                  className="h-6 flex items-center mt-0.5 relative z-20"
                >
                  {!isCompared ? (
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${item.name}-${String(displayValue)}`}
                        layoutId={`var-val-${item.name}`}
                        initial={{ opacity: isSumItem && isSumSettled ? 0 : 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`font-mono text-xs font-bold ${
                          isHighlighted
                            ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]"
                            : isMutated
                            ? "text-white"
                            : "text-neutral-200"
                        }`}
                      >
                        {String(displayValue)}
                      </motion.span>
                    </AnimatePresence>
                  ) : (
                    <div className="w-2 h-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
