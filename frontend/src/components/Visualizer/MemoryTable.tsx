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
  currentStep?: number;
}

export const MemoryTable: React.FC<MemoryTableProps> = ({
  variables,
  activeLineCode = "",
  currentStep = 0,
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
  }, [isSumCalculation, activeLineCode, currentStep]);

  // Is current line a length assignment (e.g. int n = arr.length, n = arr.length - 1)?
  const lengthVarTarget = useMemo(() => {
    const match = activeLineCode.match(/\b(?:int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=\s*.*?(?:\.length\b|len\s*\()/);
    return match ? match[1] : null;
  }, [activeLineCode]);

  const [isLengthSettled, setIsLengthSettled] = useState(false);

  useEffect(() => {
    if (lengthVarTarget) {
      setIsLengthSettled(false);
      const timer = setTimeout(() => {
        setIsLengthSettled(true);
      }, 2600);
      return () => clearTimeout(timer);
    } else {
      setIsLengthSettled(true);
    }
  }, [lengthVarTarget, activeLineCode, currentStep]);

  // Dynamic variable comparison parser (e.g. if (sum == target), if (sum < target), etc.)
  const compInfo = useMemo(() => {
    const code = activeLineCode.trim();
    if (!code.startsWith("if") && !code.includes("if (") && !code.includes("if(")) return null;

    const match = code.match(/if\s*\(\s*([a-zA-Z_]\w*)\s*(==|!=|<=|>=|<|>)\s*([a-zA-Z_]\w*|\d+)\s*\)/);
    if (!match) return null;

    const leftVar = match[1];
    const op = match[2];
    const rightOperand = match[3];

    const vA = orderedVariables.find((v) => v.name === leftVar);
    let valB: any = undefined;
    const vB = orderedVariables.find((v) => v.name === rightOperand);
    if (vB) {
      valB = vB.value;
    } else if (!isNaN(Number(rightOperand))) {
      valB = Number(rightOperand);
    }

    if (!vA || valB === undefined) return null;

    const idxA = orderedVariables.findIndex((v) => v.name === leftVar);
    const idxB = vB ? orderedVariables.findIndex((v) => v.name === rightOperand) : -1;

    let isTrue = false;
    if (op === "==") isTrue = vA.value === valB;
    else if (op === "!=") isTrue = vA.value !== valB;
    else if (op === "<") isTrue = vA.value < valB;
    else if (op === ">") isTrue = vA.value > valB;
    else if (op === "<=") isTrue = vA.value <= valB;
    else if (op === ">=") isTrue = vA.value >= valB;

    return {
      leftVar,
      rightVar: rightOperand,
      valA: vA.value,
      valB,
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

  // Synchronous + fallback offset calculation for comparison glide
  const compOffsets = useMemo(() => {
    if (!compInfo) return { left: -120, right: 120 };

    const leftVar = compInfo.leftVar;
    const rightVar = compInfo.rightVar;

    let offA = offsets[leftVar];
    let offB = offsets[rightVar];

    if (offA === undefined || offB === undefined) {
      if (typeof document !== "undefined" && centerRef.current) {
        const centerRect = centerRef.current.getBoundingClientRect();
        const elA = cellValueRefs.current[leftVar] || document.getElementById(`memory-cell-value-${leftVar}`);
        const elB = cellValueRefs.current[rightVar] || document.getElementById(`memory-cell-value-${rightVar}`);

        if (elA && elB && centerRect.width > 0) {
          const rectA = elA.getBoundingClientRect();
          const rectB = elB.getBoundingClientRect();
          const centerMidX = centerRect.left + centerRect.width / 2;
          const originA_X = rectA.left + rectA.width / 2;
          const originB_X = rectB.left + rectB.width / 2;
          if (rectA.width > 0 && rectB.width > 0) {
            offA = centerMidX - originA_X - 26;
            offB = centerMidX - originB_X + 26;
          }
        }
      }
    }

    if (offA === undefined || offA === null) {
      const idxA = orderedVariables.findIndex((v) => v.name === leftVar);
      offA = ((orderedVariables.length - 1) / 2 - (idxA !== -1 ? idxA : 0)) * 75 - 26;
    }
    if (offB === undefined || offB === null) {
      const idxB = orderedVariables.findIndex((v) => v.name === rightVar);
      offB = ((orderedVariables.length - 1) / 2 - (idxB !== -1 ? idxB : orderedVariables.length - 1)) * 75 + 26;
    }

    return { left: offA, right: offB };
  }, [compInfo, orderedVariables, offsets]);

  return (
    <div className="w-full flex flex-col items-center select-none my-1">
      {/* ═══ SINGLE OUTLINED RECTANGLE (BOXES & LABELS 100% STATIC) ═══ */}
      <div className="w-full rounded-lg border border-white/20 bg-transparent overflow-visible relative min-h-[58px]">
        {/* ═══ CENTERED OPERATOR & NUMBERS + FALSE/TRUE (INTRO & OUTRO FROM EXACT SLOTS) ═══ */}
        <div
          ref={centerRef}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <AnimatePresence>
            {compInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center relative"
              >
                {/* 17 == 9 equation row with numbers flying in smoothly from their respective variable cells */}
                <div className="flex items-center gap-2">
                  {/* Left number (e.g. 17 from sum) */}
                  <motion.span
                    initial={{
                      x: -compOffsets.left,
                      opacity: 0.85,
                      scale: 0.9,
                    }}
                    animate={{
                      x: 0,
                      opacity: 1,
                      scale: 1.1,
                    }}
                    exit={{
                      x: -compOffsets.left,
                      opacity: 0,
                      scale: 0.9,
                    }}
                    transition={{
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="font-mono text-xl font-black text-cyan-300 drop-shadow-[0_0_16px_rgba(56,189,248,1)]"
                  >
                    {compInfo.valA}
                  </motion.span>

                  {/* Operator == appears strictly AFTER numbers meet */}
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.35, delay: 0.4, ease: "easeOut" }}
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
                    initial={{
                      x: -compOffsets.right,
                      opacity: 0.85,
                      scale: 0.9,
                    }}
                    animate={{
                      x: 0,
                      opacity: 1,
                      scale: 1.1,
                    }}
                    exit={{
                      x: -compOffsets.right,
                      opacity: 0,
                      scale: 0.9,
                    }}
                    transition={{
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="font-mono text-xl font-black text-amber-300 drop-shadow-[0_0_16px_rgba(245,158,11,1)]"
                  >
                    {compInfo.valB}
                  </motion.span>
                </div>

                {/* BIGGER FALSE / TRUE label reveals distinctly beneath == */}
                <motion.span
                  initial={{ y: 8, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 8, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.35, delay: 0.8, ease: "easeOut" }}
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
            const isSumItem = item.name === "sum";

            const isTempItem = item.name === "temp" || item.name === "tmp";
            const isTempAssigning = isTempItem && /\b(?:int|var|let)?\s*(?:temp|tmp)\s*=\s*/.test(activeLineCode);

            // STRICT NO-PRE-STORE: Show empty "—" until flight settles
            const isLengthTarget = lengthVarTarget === item.name;
            let displayValue: any = item.value ?? "—";
            if (isSumItem && isSumCalculation && !isSumSettled) {
              displayValue = "—"; // Clear sum to empty whenever int sum = is calculated!
            } else if (isLengthTarget && !isLengthSettled) {
              displayValue = "—";
            } else if (isTempItem && (isTempAssigning || item.value === undefined || item.value === null)) {
              displayValue = "—";
            }

            // Suppress mutation pulse while variable calculation is still in flight
            const isMutated =
              item.isMutated &&
              !(isLengthTarget && !isLengthSettled) &&
              !(isSumItem && isSumCalculation && !isSumSettled);

            return (
              <motion.div
                key={item.name}
                id={`memory-cell-${item.name}`}
                animate={
                  isMutated
                    ? {
                        borderColor: ["rgba(255,255,255,0.2)", "rgba(56,189,248,0.9)", "rgba(255,255,255,0.2)"],
                      }
                    : {}
                }
                transition={{ duration: 0.5 }}
                style={{
                  filter: isBlurred ? "blur(3.5px) opacity(0.20)" : "none",
                  transition: "filter 0.4s ease, opacity 0.4s ease",
                }}
                className="flex flex-col justify-between px-3 py-1.5 min-w-[62px] flex-grow bg-transparent transition-all duration-200 relative"
              >
                {/* Visual Radiant Aura Pulse when variable value updates */}
                {isMutated && (
                  <motion.div
                    key={`mutate-pulse-${item.name}-${String(displayValue)}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0.70, 1.10, 1],
                    }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="absolute inset-0 rounded border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_22px_rgba(56,189,248,0.9),inset_0_0_10px_rgba(56,189,248,0.5)] pointer-events-none z-1"
                  />
                )}

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
                  className="h-6 flex items-center mt-0.5 relative z-5"
                >
                  {!isCompared ? (
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${item.name}-${String(displayValue)}`}
                        initial={
                          isMutated
                            ? { opacity: 0 }
                            : { opacity: isSumItem && !isSumSettled ? 0.3 : 1 }
                        }
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`font-mono text-xs font-bold ${
                          isMutated
                            ? "text-cyan-300 drop-shadow-[0_0_14px_rgba(56,189,248,1)]"
                            : isHighlighted
                            ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]"
                            : "text-neutral-200"
                        }`}
                      >
                        {String(displayValue)}
                      </motion.span>
                    </AnimatePresence>
                  ) : (
                    <span className="font-mono text-xs font-bold text-neutral-500 opacity-25">
                      {String(displayValue)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
