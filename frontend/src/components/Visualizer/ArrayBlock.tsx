"use client";
import React, { useEffect, useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

import { ArrayBlockState, ArrayBlockItem, ThreeArraySceneProps, LoopInfo } from "./ArrayBlock/types";
import { LoopConditionOverlay } from "./ArrayBlock/LoopConditionOverlay";
import { PointerParticleBurst } from "./ArrayBlock/PointerParticleBurst";
import { MemoryTable } from "./MemoryTable";
export type { ArrayBlockState, ArrayBlockItem, ThreeArraySceneProps, LoopInfo };

// Extruded rounded footprint for thick beveled frosted glass monolith
function createBeveledBlockGeometry(width: number, height: number, depth: number, radius = 2.5) {
  const shape = new THREE.Shape();
  const w2 = width / 2 - radius;
  const d2 = depth / 2 - radius;

  shape.moveTo(-w2, -d2 - radius);
  shape.lineTo(w2, -d2 - radius);
  shape.quadraticCurveTo(w2 + radius, -d2 - radius, w2 + radius, -d2);
  shape.lineTo(w2 + radius, d2);
  shape.quadraticCurveTo(w2 + radius, d2 + radius, w2, d2 + radius);
  shape.lineTo(-w2, d2 + radius);
  shape.quadraticCurveTo(-w2 - radius, d2 + radius, -w2 - radius, d2);
  shape.lineTo(-w2 - radius, -d2);
  shape.quadraticCurveTo(-w2 - radius, -d2 - radius, -w2, -d2 - radius);

  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 1.8,
    bevelSize: 1.8,
    bevelOffset: -0.5,
    bevelSegments: 4,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// Crisp 3D canvas texture for enlarged index labels directly applied onto base front face
function createIndexTexture(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 72px 'JetBrains Mono', 'SF Mono', Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const ThreeArrayScene: React.FC<ThreeArraySceneProps> = ({
  currentArray,
  computedMax,
  totalWidth: propTotalWidth,
  itemWidth = 68,
  gap = 38,
  paddingX = 52,
  sceneHeight = 280,
  activeIndices,
  pointerIndex = null,
  pointerLabel = "j",
  pointers = [],
  swapIndices = null,
  isCountingLength = false,
  currentFrame,
  activeLineCode = "",
  currentStep = 0,
  memoryVariables,
  stepEvent,
  loopAnalysis,
  onBlockClick,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const lastKnownPointerPositionsRef = useRef<Record<string, { x: number; y: number; color: string }>>({});
  const prevPointersRef = useRef<Set<string>>(new Set());

  // Track pointers to detect newly appeared ones
  const newPointersThisStep = useMemo(() => {
    const currentLabels = new Set(pointers.map((p) => p.label));
    const newlyAppeared = new Set<string>();
    currentLabels.forEach((label) => {
      if (!prevPointersRef.current.has(label)) {
        newlyAppeared.add(label);
      }
    });
    prevPointersRef.current = currentLabels;
    return newlyAppeared;
  }, [pointers, currentStep]);

  const count = Math.max(1, currentArray.length);
  const contentWidth = count * itemWidth + Math.max(0, count - 1) * gap;
  const totalWidth = propTotalWidth || (2 * paddingX + contentWidth);

  const blockWidth = 50;
  const blockDepth = 42;
  const minHeight = 44;
  const maxHeight = 118;

  const baseDeckHeight = 36;
  const collarHeight = 7;
  const baselineY = baseDeckHeight + 2;
  const blockRotY = -0.10;

  // ═══ 1. DETERMINING COMPARISON OPERANDS & CONDITION ═══
  const { iA, iB, hasComparison } = useMemo(() => {
    const locals = currentFrame?.locals || {};
    let first: number | null = null;
    let second: number | null = null;

    if (typeof locals.j === "number" && locals.j >= 0 && locals.j + 1 < count) {
      first = locals.j;
      second = locals.j + 1;
    } else if (swapIndices && swapIndices.length === 2 && swapIndices[0] !== swapIndices[1]) {
      first = Math.min(swapIndices[0], swapIndices[1]);
      second = Math.max(swapIndices[0], swapIndices[1]);
    } else if (pointers && pointers.length >= 2) {
      const nonIPtrs = pointers.filter((p) => p.label !== "i");
      if (nonIPtrs.length >= 2) {
        first = Math.min(nonIPtrs[0].index, nonIPtrs[1].index);
        second = Math.max(nonIPtrs[0].index, nonIPtrs[1].index);
      } else {
        const sorted = [...pointers].sort((a, b) => a.index - b.index);
        first = sorted[0].index;
        second = sorted[1].index;
      }
    }
    return {
      iA: first,
      iB: second,
      hasComparison: first !== null && second !== null && first !== second && first >= 0 && second < count,
    };
  }, [currentFrame?.locals, swapIndices, pointers, count]);

  const { isConditionTrue, conditionOperator } = useMemo(() => {
    if (iA === null || iB === null) return { isConditionTrue: false, conditionOperator: ">" };
    const valA = currentArray[iA]?.val ?? 0;
    const valB = currentArray[iB]?.val ?? 0;
    let op = ">";
    if (activeLineCode.includes("<=")) op = "<=";
    else if (activeLineCode.includes(">=")) op = ">=";
    else if (activeLineCode.includes("<")) op = "<";
    else if (activeLineCode.includes("==")) op = "==";
    else if (activeLineCode.includes("!=")) op = "!=";

    let res = false;
    if (op === ">") res = valA > valB;
    else if (op === "<") res = valA < valB;
    else if (op === "<=") res = valA <= valB;
    else if (op === ">=") res = valA >= valB;
    else if (op === "==") res = valA === valB;
    else if (op === "!=") res = valA !== valB;

    return { isConditionTrue: res, conditionOperator: op };
  }, [iA, iB, currentArray, activeLineCode]);

  const isSwapNeeded = Boolean(
    (swapIndices && swapIndices.length === 2 && swapIndices[0] !== swapIndices[1]) ||
    (hasComparison && isConditionTrue && (activeLineCode.includes("temp") || activeLineCode.includes("swap") || activeLineCode.includes("arr["))) ||
    (currentFrame?.locals?.temp !== undefined)
  );

  const isIfStatementLine = useMemo(() => {
    const code = activeLineCode.trim();
    const isArrComp = code.includes("arr[") || code.includes("nums[") || code.includes("[left]") || code.includes("[right]") || (hasComparison && !code.includes("sum"));
    return (
      (code.startsWith("if") || code.includes("if (") || code.includes("if(")) &&
      !code.includes("temp") &&
      !code.includes("for") &&
      isArrComp
    );
  }, [activeLineCode, hasComparison]);

  const loopInfo: LoopInfo = useMemo(() => {
    const locals = currentFrame?.locals || {};
    const isLoopLine = /\b(for|while)\b/.test(activeLineCode);

    const pointerMap = new Map<string, number>();
    pointers?.forEach((p) => {
      if (p.label && typeof p.index === "number") {
        pointerMap.set(p.label, p.index);
      }
    });

    const getVarValue = (name: string): number | undefined => {
      if (typeof locals[name] === "number") return locals[name] as number;
      if (pointerMap.has(name)) return pointerMap.get(name);
      return undefined;
    };

    let varName = "j";
    let op = "<";
    let rawRhs = "";
    let rhsVarName = "";

    if (isLoopLine) {
      const forMatch = activeLineCode.match(/for\s*\([^;]*;\s*([^;]+);/);
      if (forMatch) {
        const cond = forMatch[1].trim();
        const condParts = cond.match(/([a-zA-Z_]\w*)\s*(<=|>=|!=|==|<|>)\s*(.+)/);
        if (condParts) {
          varName = condParts[1].trim();
          op = condParts[2];
          rawRhs = condParts[3].trim();
        }
      } else {
        const whileMatch = activeLineCode.match(/while\s*\(([^)]+)\)/);
        if (whileMatch) {
          const cond = whileMatch[1].trim();
          const condParts = cond.match(/([a-zA-Z_]\w*)\s*(<=|>=|!=|==|<|>)\s*(.+)/);
          if (condParts) {
            varName = condParts[1].trim();
            op = condParts[2];
            rawRhs = condParts[3].trim();
          }
        }
      }
    }

    if (!rawRhs) {
      const isJLoop = /\bfor\s*\([^;]*\bj\b|\bj\s*[<>=!]/.test(activeLineCode);
      varName = isJLoop ? "j" : (getVarValue("i") !== undefined ? "i" : (getVarValue("j") !== undefined ? "j" : "left"));
      if (activeLineCode.includes("<=")) op = "<=";
      else if (activeLineCode.includes(">=")) op = ">=";
      else if (activeLineCode.includes("<")) op = "<";
      else if (activeLineCode.includes(">")) op = ">";
      else if (activeLineCode.includes("==")) op = "==";
      else if (activeLineCode.includes("!=")) op = "!=";
    }

    const rhsVarMatch = rawRhs.match(/\b([a-zA-Z_]\w*)\b/);
    if (rhsVarMatch && rhsVarMatch[1] !== "length") {
      rhsVarName = rhsVarMatch[1];
    } else if (rawRhs.includes("length")) {
      rhsVarName = "n";
    }

    const rawVarVal = getVarValue(varName);
    const varVal = rawVarVal !== undefined ? rawVarVal : 0;
    const nVal = getVarValue("n") ?? count;

    let rhsLimit: number = count;
    try {
      if (rawRhs) {
        let evalExpr = rawRhs
          .replace(/\b(?:[a-zA-Z_]\w*\.)?length\b/g, String(count))
          .replace(/\blen\s*\([^)]*\)/g, String(count));

        Object.keys(locals).forEach((k) => {
          if (typeof locals[k] === "number") {
            evalExpr = evalExpr.replace(new RegExp(`\\b${k}\\b`, "g"), String(locals[k]));
          }
        });
        pointerMap.forEach((val, k) => {
          evalExpr = evalExpr.replace(new RegExp(`\\b${k}\\b`, "g"), String(val));
        });

        if (/^[\d\s+\-*/().]+$/.test(evalExpr)) {
          // eslint-disable-next-line no-eval
          const evaluated = Function(`"use strict"; return (${evalExpr})`)();
          if (typeof evaluated === "number" && !isNaN(evaluated)) {
            rhsLimit = evaluated;
          }
        }
      } else {
        rhsLimit = getVarValue("n") ?? count;
      }
    } catch {
      rhsLimit = count;
    }

    const rhsExpr = rawRhs || (rhsVarName || "n");
    let rhsSubstituted = "";
    if (rawRhs && (rawRhs.includes("-") || rawRhs.includes("+"))) {
      let sub = rawRhs
        .replace(/\b(?:[a-zA-Z_]\w*\.)?length\b/g, String(count))
        .replace(/\blen\s*\([^)]*\)/g, String(count))
        .replace(/\bn\b/g, String(nVal));

      Object.keys(locals).forEach((key) => {
        if (typeof locals[key] === "number" && key !== "n") {
          sub = sub.replace(new RegExp(`\\b${key}\\b`, "g"), String(locals[key]));
        }
      });
      const iVal = typeof locals.i === "number" ? locals.i : pointerMap.get("i");
      if (typeof iVal === "number") {
        sub = sub.replace(/\bi\b/g, String(iVal));
      }
      const jVal = typeof locals.j === "number" ? locals.j : pointerMap.get("j");
      if (typeof jVal === "number") {
        sub = sub.replace(/\bj\b/g, String(jVal));
      }
      rhsSubstituted = sub.replace(/\s+/g, " ").trim();
    }

    const isRhsArrayIndex =
      typeof rhsLimit === "number" &&
      rhsLimit >= 0 &&
      rhsLimit < count &&
      (rhsVarName === "right" ||
        rhsVarName === "j" ||
        rhsVarName === "i" ||
        rhsVarName === "mid" ||
        rhsVarName === "high" ||
        rhsVarName === "low" ||
        (rhsVarName !== "n" && !rhsExpr.includes("length") && !rhsExpr.includes("-") && !rhsExpr.includes("+")));

    let isPass = false;
    if (op === "<") isPass = varVal < rhsLimit;
    else if (op === "<=") isPass = varVal <= rhsLimit;
    else if (op === ">") isPass = varVal > rhsLimit;
    else if (op === ">=") isPass = varVal >= rhsLimit;
    else if (op === "==") isPass = varVal === rhsLimit;
    else if (op === "!=") isPass = varVal !== rhsLimit;

    return {
      hasLoop: isLoopLine || getVarValue("i") !== undefined || getVarValue("j") !== undefined,
      isLoopLine,
      varName,
      varVal,
      op,
      nVal,
      rhsLimit,
      rhsVarName,
      rhsExpr,
      rhsSubstituted,
      isRhsArrayIndex,
      isPass,
    };
  }, [currentFrame?.locals, activeLineCode, count, pointers]);

  const [rhsStartPos, setRhsStartPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!loopInfo.isLoopLine || !containerRef.current) return;
    let animId: number;
    const computeRhsPos = () => {
      if (!containerRef.current) return;
      const rhsId = loopInfo.rhsVarName ? `memory-cell-value-${loopInfo.rhsVarName}` : "memory-cell-value-n";
      const elem =
        document.getElementById(rhsId)?.querySelector("span") ||
        document.getElementById(rhsId) ||
        document.getElementById("memory-cell-value-n")?.querySelector("span") ||
        document.getElementById("memory-cell-value-n") ||
        document.getElementById("memory-cell-value-target");
      if (elem && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const rect = elem.getBoundingClientRect();
        const newX = rect.left + rect.width / 2 - containerRect.left;
        const newY = rect.top + rect.height / 2 - containerRect.top;
        setRhsStartPos((prev) => {
          if (prev && Math.abs(prev.x - newX) < 1 && Math.abs(prev.y - newY) < 1) return prev;
          return { x: newX, y: newY };
        });
      }
      animId = requestAnimationFrame(computeRhsPos);
    };
    computeRhsPos();
    return () => cancelAnimationFrame(animId);
  }, [loopInfo.isLoopLine, loopInfo.rhsVarName, currentStep]);

  // ═══ 2. SYNCHRONIZED ALGORITHM PHASES & TIMING STATE MACHINE ═══
  type VisualPhase =
    | "idle"
    | "focus_pointers"
    | "blur_bg"
    | "reveal_condition"
    | "show_result"
    | "sum_calculation"
    | "swap_1_temp"
    | "swap_2_move"
    | "swap_3_assign"
    | "restoring";

  const phase: VisualPhase = useMemo(() => {
    if (
      (activeLineCode.includes("sum =") || activeLineCode.includes("sum=") || activeLineCode.includes("int sum")) &&
      !activeLineCode.includes("==") &&
      !activeLineCode.includes("<") &&
      !activeLineCode.includes(">") &&
      !activeLineCode.startsWith("if") &&
      !activeLineCode.includes("if (") &&
      !activeLineCode.includes("if(")
    ) {
      return "sum_calculation";
    }
    if (
      (/\b\w+\[[^\]]+\]\s*=\s*(?:temp|tmp)\b/.test(activeLineCode) ||
        activeLineCode.includes("= temp") ||
        activeLineCode.includes("= tmp") ||
        activeLineCode.includes("= t;")) &&
      !activeLineCode.includes("==")
    ) {
      return "swap_3_assign";
    }
    if (
      /\b\w+\[[^\]]+\]\s*=\s*\w+\[[^\]]+\]/.test(activeLineCode) ||
      (activeLineCode.includes("[") && activeLineCode.includes("] = ") && activeLineCode.includes("["))
    ) {
      return "swap_2_move";
    }
    if (
      (/\b(?:int|var|let)?\s*(?:temp|tmp)\s*=\s*\w+\[/.test(activeLineCode) ||
        ((activeLineCode.includes("temp =") ||
          activeLineCode.includes("tmp =") ||
          activeLineCode.includes("int temp") ||
          activeLineCode.includes("var temp") ||
          activeLineCode.includes("let temp")) &&
          activeLineCode.includes("["))) &&
      !activeLineCode.includes("==")
    ) {
      return "swap_1_temp";
    }
    if (
      hasComparison &&
      (activeLineCode.includes(">") ||
        activeLineCode.includes("<") ||
        activeLineCode.includes("==") ||
        activeLineCode.includes("!=") ||
        activeLineCode.includes("<=") ||
        activeLineCode.includes(">="))
    ) {
      return "show_result";
    }
    return "idle";
  }, [activeLineCode, hasComparison]);

  const tempValue = useMemo(() => {
    return currentFrame?.locals?.temp ?? null;
  }, [currentFrame?.locals?.temp]);

  const [landedStep, setLandedStep] = useState<number>(-1);

  // Dynamic index extraction from code statements (arr[j], nums[i], a[j+1], etc.)
  const swapIndicesFromCode = useMemo(() => {
    const locals = currentFrame?.locals || {};
    let dst: number | null = null;
    let src: number | null = null;

    const lhsMatch = activeLineCode.match(/\b\w+\[([^\]]+)\]\s*=/);
    if (lhsMatch) {
      const expr = lhsMatch[1].trim();
      if (!isNaN(Number(expr))) dst = Number(expr);
      else if (expr === "j" && typeof locals.j === "number") dst = locals.j;
      else if (expr === "i" && typeof locals.i === "number") dst = locals.i;
      else if ((expr === "j + 1" || expr === "j+1") && typeof locals.j === "number") dst = locals.j + 1;
      else if ((expr === "i + 1" || expr === "i+1") && typeof locals.i === "number") dst = locals.i + 1;
    }

    const rhsMatch = activeLineCode.match(/=\s*\b\w+\[([^\]]+)\]/);
    if (rhsMatch) {
      const expr = rhsMatch[1].trim();
      if (!isNaN(Number(expr))) src = Number(expr);
      else if (expr === "j" && typeof locals.j === "number") src = locals.j;
      else if (expr === "i" && typeof locals.i === "number") src = locals.i;
      else if ((expr === "j + 1" || expr === "j+1") && typeof locals.j === "number") src = locals.j + 1;
      else if ((expr === "i + 1" || expr === "i+1") && typeof locals.i === "number") src = locals.i + 1;
    }

    return {
      dst: dst ?? iA ?? 0,
      src: src ?? (typeof locals.j === "number" ? locals.j : (iA ?? 0)),
    };
  }, [activeLineCode, currentFrame?.locals, iA, iB]);

  const copySourceIdx = useMemo(() => {
    return swapIndicesFromCode.src ?? iA ?? 0;
  }, [swapIndicesFromCode.src, iA]);

  const [sumTargetOffset, setSumTargetOffset] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (phase === "sum_calculation") {
      let animFrameId: number;
      const calculateOffset = () => {
        const sumEl =
          document.getElementById("memory-cell-value-sum")?.querySelector("span") ||
          document.getElementById("memory-cell-value-sum");
        if (sumEl && containerRef.current) {
          const sumRect = sumEl.getBoundingClientRect();
          const contRect = containerRef.current.getBoundingClientRect();
          const targetX = sumRect.left + sumRect.width / 2 - contRect.left;
          const targetY = sumRect.top + sumRect.height / 2 - contRect.top;
          setSumTargetOffset({ x: targetX, y: targetY });
        }
        animFrameId = requestAnimationFrame(calculateOffset);
      };
      calculateOffset();
      return () => cancelAnimationFrame(animFrameId);
    }
  }, [phase, currentStep]);

  // Track position of length variable in MemoryTable
  const [lengthTargetOffset, setLengthTargetOffset] = useState<{ x: number; y: number } | null>(null);

  const lengthVarName = useMemo(() => {
    const match = activeLineCode.match(/\b(?:int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=/);
    return match ? match[1] : "n";
  }, [activeLineCode]);

  // Fully dynamic arithmetic parsing for length expressions (e.g. arr.length - 1, arr.length - i - 1, etc.)
  const lengthOpInfo = useMemo(() => {
    if (!isCountingLength) return null;
    const locals = currentFrame?.locals || {};

    const eqIdx = activeLineCode.indexOf("=");
    const rhsCode = eqIdx !== -1 ? activeLineCode.slice(eqIdx + 1).replace(/;.*$/, "").trim() : activeLineCode;

    let substitutedStr = rhsCode
      .replace(/\b(?:[a-zA-Z_]\w*\.)?length\b/g, String(count))
      .replace(/\blen\s*\([^)]*\)/g, String(count));

    Object.keys(locals).forEach((key) => {
      if (typeof locals[key] === "number" && key !== "n" && key !== lengthVarName) {
        substitutedStr = substitutedStr.replace(new RegExp(`\\b${key}\\b`, "g"), String(locals[key]));
      }
    });
    substitutedStr = substitutedStr.replace(/\s+/g, " ").trim();

    let finalVal = count;
    try {
      let evalExpr = rhsCode
        .replace(/\b(?:[a-zA-Z_]\w*\.)?length\b/g, String(count))
        .replace(/\blen\s*\([^)]*\)/g, String(count));
      Object.keys(locals).forEach((key) => {
        if (typeof locals[key] === "number" && key !== "n" && key !== lengthVarName) {
          evalExpr = evalExpr.replace(new RegExp(`\\b${key}\\b`, "g"), String(locals[key]));
        }
      });
      if (/^[\d\s+\-*/%().]+$/.test(evalExpr)) {
        // eslint-disable-next-line no-eval
        const res = Function(`"use strict"; return (${evalExpr})`)();
        if (typeof res === "number" && !isNaN(res)) {
          finalVal = res;
        }
      }
    } catch {
      finalVal = count;
    }

    const hasOp = /[+\-*/%]/.test(substitutedStr) && substitutedStr !== String(finalVal);

    return {
      hasOp,
      opText: substitutedStr,
      finalVal,
    };
  }, [isCountingLength, activeLineCode, count, currentFrame?.locals, lengthVarName]);

  useEffect(() => {
    if (isCountingLength) {
      const calculateOffset = () => {
        const targetEl =
          document.getElementById(`memory-cell-value-${lengthVarName}`)?.querySelector("span") ||
          document.getElementById(`memory-cell-value-${lengthVarName}`) ||
          document.getElementById("memory-cell-value-n");
        if (targetEl && containerRef.current) {
          const tRect = targetEl.getBoundingClientRect();
          const cRect = containerRef.current.getBoundingClientRect();
          const targetX = tRect.left + tRect.width / 2 - cRect.left;
          const targetY = tRect.top + tRect.height / 2 - cRect.top;
          setLengthTargetOffset((prev) => {
            if (prev && Math.abs(prev.x - targetX) < 1 && Math.abs(prev.y - targetY) < 1) return prev;
            return { x: targetX, y: targetY };
          });
        }
      };
      calculateOffset();
      const t1 = setTimeout(calculateOffset, 30);
      const t2 = setTimeout(calculateOffset, 120);
      const t3 = setTimeout(calculateOffset, 300);
      const t4 = setTimeout(calculateOffset, 600);
      const t5 = setTimeout(calculateOffset, 900);
      const raf = requestAnimationFrame(calculateOffset);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        cancelAnimationFrame(raf);
      };
    }
  }, [isCountingLength, lengthVarName, currentStep]);

  const isPointerTarget = lengthVarName === "right" || lengthVarName === "left" || lengthVarName === "i" || lengthVarName === "j";

  const [isLengthSettled, setIsLengthSettled] = useState(false);

  useEffect(() => {
    if (isCountingLength) {
      setIsLengthSettled(false);
      const baseTraversalTime = 100 + Math.max(0, count - 1) * 280;
      const flightDuration = lengthOpInfo?.hasOp ? 2300 : 1600;
      const settleDelay = baseTraversalTime + flightDuration + 100;
      const timer = setTimeout(() => {
        setIsLengthSettled(true);
      }, settleDelay);
      return () => clearTimeout(timer);
    } else {
      setIsLengthSettled(true);
    }
  }, [isCountingLength, isPointerTarget, lengthOpInfo?.hasOp, currentStep, count]);

  const assignedVarName = useMemo(() => {
    const match = activeLineCode.match(/\b(?:int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=/);
    return match ? match[1] : "sum";
  }, [activeLineCode]);

  const assignedTargetOffset = useMemo(() => {
    if (!assignedVarName || typeof document === "undefined" || !containerRef.current) {
      return { x: totalWidth * 0.72, y: -88 };
    }
    const targetEl =
      document.getElementById(`memory-cell-value-${assignedVarName}`) ||
      document.getElementById(`memory-cell-${assignedVarName}`) ||
      document.getElementById("memory-cell-value-sum") ||
      document.getElementById("memory-cell-value-found");
    if (targetEl && containerRef.current) {
      const tRect = targetEl.getBoundingClientRect();
      const cRect = containerRef.current.getBoundingClientRect();
      if (tRect.width > 0 && cRect.width > 0) {
        return {
          x: tRect.left + tRect.width / 2 - cRect.left,
          y: tRect.top + tRect.height / 2 - cRect.top,
        };
      }
    }
    return { x: totalWidth * 0.72, y: -88 };
  }, [assignedVarName, currentStep, totalWidth]);

  // Single settlement timer: state only updates ONCE after animation completes (no RAF re-render glitch)
  useEffect(() => {
    if (phase === "swap_1_temp" || phase === "swap_2_move" || phase === "swap_3_assign") {
      setLandedStep(-1);
      const timer = setTimeout(() => {
        setLandedStep(currentStep);
      }, 1100);
      return () => clearTimeout(timer);
    } else {
      setLandedStep(-1);
    }
  }, [phase, currentStep]);



  // ═══ 3. LEFT-TO-RIGHT ONE-BY-ONE TRAVERSAL ANIMATION (1.. 2.. 3..) ═══
  const [traversalStep, setTraversalStep] = useState<number>(-1);

  useEffect(() => {
    if (!isCountingLength) {
      setTraversalStep(-1);
      return;
    }

    setTraversalStep(-1);
    const timers: NodeJS.Timeout[] = [];

    for (let k = 0; k < count; k++) {
      const t = setTimeout(() => {
        setTraversalStep(k);
      }, 100 + k * 280);
      timers.push(t);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isCountingLength, count, currentStep]);

  const [isLoopBlurActive, setIsLoopBlurActive] = useState(false);

  useEffect(() => {
    if (loopInfo.isLoopLine) {
      const t1 = setTimeout(() => setIsLoopBlurActive(true), 380);
      const t2 = setTimeout(() => setIsLoopBlurActive(false), 3100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setIsLoopBlurActive(false);
    }
  }, [loopInfo.isLoopLine, currentStep]);

  const isBlurActive = Boolean(
    (isIfStatementLine && hasComparison && phase === "show_result") ||
    isLoopBlurActive ||
    phase === "sum_calculation" ||
    phase === "swap_1_temp" ||
    phase === "swap_2_move" ||
    phase === "swap_3_assign" ||
    (swapIndices && Array.isArray(swapIndices) && swapIndices.length === 2 && swapIndices[0] !== swapIndices[1])
  );

  const isResultActive = Boolean(
    isIfStatementLine &&
    hasComparison &&
    phase === "show_result"
  );

  // ═══ 4. STABLE COLOR THEME WITH RADIANT 3D GLOW ═══
  const getColorTheme = (index: number, state?: string) => {
    const isCompared = isIfStatementLine && hasComparison && (index === iA || index === iB);

    if (isCompared && isResultActive && !stepEvent?.isLoopTermination && !activeLineCode.trim().startsWith("break")) {
      const isLeft = index === iA;
      const receiveGreen = isConditionTrue ? isLeft : !isLeft;
      if (receiveGreen) {
        return {
          name: "green",
          outerGlass: 0xdcfce7,
          attenuationColor: 0x22c55e,
          topGlass: 0xf0fdf4,
          innerColor: 0x22c55e,
          glowColor: 0x22c55e,
          emissive: 0x22c55e,
          emissiveIntensity: 1.25,
          opacity: 0.96,
          pointLightColor: 0x22c55e,
          labelColor: "#4ade80",
          textShadow: "0 0 16px rgba(74, 222, 128, 1), 0 0 32px rgba(34, 197, 94, 0.8)",
          isFocused: true,
        };
      } else {
        return {
          name: "red",
          outerGlass: 0xffe4e6,
          attenuationColor: 0xef4444,
          topGlass: 0xfff1f2,
          innerColor: 0xef4444,
          glowColor: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 1.25,
          opacity: 0.96,
          pointLightColor: 0xef4444,
          labelColor: "#f87171",
          textShadow: "0 0 16px rgba(248, 113, 113, 1), 0 0 32px rgba(239, 68, 68, 0.8)",
          isFocused: true,
        };
      }
    }

    if (phase === "sum_calculation" && (index === iA || index === iB)) {
      return {
        name: "cyan",
        outerGlass: 0xe0f2fe,
        attenuationColor: 0x38bdf8,
        topGlass: 0xf0f9ff,
        innerColor: 0x0284c7,
        glowColor: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        opacity: 0.96,
        pointLightColor: 0x38bdf8,
        labelColor: "#38bdf8",
        textShadow: "0 0 14px rgba(56, 189, 248, 1), 0 0 28px rgba(14, 165, 233, 0.8)",
        isFocused: true,
      };
    }

    if (phase === "swap_1_temp" || phase === "swap_2_move" || phase === "swap_3_assign") {
      if (index === iA || index === iB) {
        return {
          name: "amber",
          outerGlass: 0xfef3c7,
          attenuationColor: 0xfcd34d,
          topGlass: 0xfffbeb,
          innerColor: 0xf59e0b,
          glowColor: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.70,
          opacity: 0.95,
          pointLightColor: 0xf59e0b,
          labelColor: "#fbbf24",
          textShadow: "0 0 12px rgba(251, 191, 36, 0.9)",
          isFocused: true,
        };
      }
    }

    if (state === "green" || state === "sorted") {
      return {
        name: "green",
        outerGlass: 0xdcfce7,
        attenuationColor: 0x4ade80,
        topGlass: 0xf0fdf4,
        innerColor: 0x22c55e,
        glowColor: 0x4ade80,
        emissive: 0x16a34a,
        emissiveIntensity: 0.75,
        opacity: 0.96,
        pointLightColor: 0x22c55e,
        labelColor: "#4ade80",
        textShadow: "0 0 14px rgba(74, 222, 128, 0.95)",
        isFocused: true,
      };
    }

    if (state === "amber" || isCompared) {
      return {
        name: "amber",
        outerGlass: 0xfef3c7,
        attenuationColor: 0xfcd34d,
        topGlass: 0xfffbeb,
        innerColor: 0xf59e0b,
        glowColor: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.65,
        opacity: 0.95,
        pointLightColor: 0xf59e0b,
        labelColor: "#fbbf24",
        textShadow: "0 0 12px rgba(251, 191, 36, 0.9)",
        isFocused: isCompared,
      };
    }

    return {
      name: "neutral",
      outerGlass: 0xf8fafc,
      attenuationColor: 0xe2e8f0,
      topGlass: 0xffffff,
      innerColor: 0x38bdf8,
      glowColor: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.40,
      opacity: 0.94,
      pointLightColor: 0x38bdf8,
      labelColor: "#38bdf8",
      textShadow: "0 0 12px rgba(56, 189, 248, 0.85)",
      isFocused: false,
    };
  };
  const calculatedMax = useMemo(() => {
    if (computedMax && computedMax > 0) return computedMax;
    return Math.max(...currentArray.map((b) => b.val), 1);
  }, [currentArray, computedMax]);

  const isLanded =
    landedStep === currentStep ||
    (phase !== "swap_1_temp" && phase !== "swap_2_move" && phase !== "swap_3_assign");

  const blockData = useMemo(() => {
    return currentArray.map((item, i) => {
      let displayVal = item.val;
      if (!isLanded) {
        if (phase === "swap_2_move" && i === swapIndicesFromCode.dst) {
          displayVal = tempValue ?? currentFrame?.locals?.temp ?? item.val;
        } else if (phase === "swap_3_assign" && i === swapIndicesFromCode.dst) {
          displayVal = currentArray[swapIndicesFromCode.src]?.val ?? item.val;
        }
      }
      const safeMax = Math.max(1, calculatedMax);
      const clampedVal = Math.max(0, Math.min(safeMax, displayVal));
      const h = Math.round(minHeight + (clampedVal / safeMax) * (maxHeight - minHeight));
      const centerX = paddingX + i * (itemWidth + gap) + itemWidth / 2;
      const theme = getColorTheme(i, item.state);
      return {
        index: i,
        val: displayVal,
        h,
        centerX,
        theme,
      };
    });
  }, [currentArray, calculatedMax, totalWidth, phase, isLanded, isResultActive, iA, iB, tempValue, currentFrame, swapIndicesFromCode]);

  const serializedData = useMemo(() => {
    return JSON.stringify(blockData.map((b) => ({ val: b.val, name: b.theme.name, focused: b.theme.isFocused })));
  }, [blockData]);

  // ═══ 5. THREE.JS SCENE RENDERING & DETERMINISTIC SWAP MOTION ═══
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(totalWidth, sceneHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const targetX = totalWidth / 2;
    const targetY = 110;

    const camera = new THREE.OrthographicCamera(
      -totalWidth / 2,
      totalWidth / 2,
      sceneHeight / 2,
      -sceneHeight / 2,
      1,
      2500
    );
    camera.position.set(targetX, targetY + 105, 480);
    camera.lookAt(targetX, targetY, 0);

    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(targetX - 200, targetY + 320, 380);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfd8e3, 0.7);
    fillLight.position.set(targetX + 220, targetY + 140, 220);
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topLight.position.set(targetX, targetY + 420, 30);
    scene.add(topLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Base Deck Platform
    const deckWidth = totalWidth - 6;
    const deckDepth = 86;
    const deckGeo = new THREE.BoxGeometry(deckWidth, baseDeckHeight, deckDepth);
    const deckMatTop = new THREE.MeshStandardMaterial({ color: 0x36404d, metalness: 0.65, roughness: 0.38 });
    const deckMatFront = new THREE.MeshStandardMaterial({ color: 0x0f131a, metalness: 0.8, roughness: 0.45 });
    const deckMatSide = new THREE.MeshStandardMaterial({ color: 0x1a212b, metalness: 0.72, roughness: 0.42 });
    const deckMatDark = new THREE.MeshBasicMaterial({ color: 0x05070a });

    const deckMesh = new THREE.Mesh(deckGeo, [
      deckMatSide,
      deckMatSide,
      deckMatTop,
      deckMatDark,
      deckMatFront,
      deckMatDark,
    ]);
    deckMesh.position.set(targetX, baseDeckHeight / 2, 0);
    rootGroup.add(deckMesh);

    const deckEdges = new THREE.EdgesGeometry(deckGeo);
    const deckLine = new THREE.LineSegments(
      deckEdges,
      new THREE.LineBasicMaterial({ color: 0x5a6778, transparent: true, opacity: 0.45 })
    );
    deckLine.position.copy(deckMesh.position);
    rootGroup.add(deckLine);

    // Socket Collars, Monoliths & Indices
    const socketWidth = 62;
    const socketDepth = 54;

    const blockGroups: Array<{
      group: THREE.Group;
      index: number;
      baseX: number;
    }> = [];

    blockData.forEach((block) => {
      const { h, centerX, theme } = block;

      const singleBlockGroup = new THREE.Group();
      singleBlockGroup.position.set(centerX, 0, 0);
      rootGroup.add(singleBlockGroup);

      blockGroups.push({
        group: singleBlockGroup,
        index: block.index,
        baseX: centerX,
      });

      // Collar Tray
      const collarGeo = new THREE.BoxGeometry(socketWidth, collarHeight, socketDepth);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0x475567, metalness: 0.8, roughness: 0.26 });
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.rotation.y = blockRotY;
      collarMesh.position.set(0, baseDeckHeight + collarHeight / 2 - 1, 0);
      singleBlockGroup.add(collarMesh);

      const collarEdges = new THREE.EdgesGeometry(collarGeo);
      const collarLine = new THREE.LineSegments(
        collarEdges,
        new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.7 })
      );
      collarLine.rotation.y = blockRotY;
      collarLine.position.copy(collarMesh.position);
      singleBlockGroup.add(collarLine);

      // Cavity Slot
      const cavityGeo = new THREE.BoxGeometry(blockWidth + 4, 3, blockDepth + 4);
      const cavityMat = new THREE.MeshStandardMaterial({
        color: 0x06090c,
        emissive: theme.innerColor,
        emissiveIntensity: 0.3,
      });
      const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
      cavityMesh.rotation.y = blockRotY;
      cavityMesh.position.set(0, baseDeckHeight + collarHeight - 1, 0);
      singleBlockGroup.add(cavityMesh);

      // (Dynamic base index labels rendered as crisp HTML overlays with synchronized block colors)

      // Internal Volumetric Glow
      const innerPointLight = new THREE.PointLight(theme.pointLightColor, theme.isFocused ? 6.0 : 2.5, 140);
      innerPointLight.position.set(0, baselineY + h / 2, 0);
      singleBlockGroup.add(innerPointLight);

      // Frosted Glass Monolith
      const outerGlassGeo = createBeveledBlockGeometry(blockWidth, h, blockDepth, 2.5);
      const outerGlassMat = new THREE.MeshPhysicalMaterial({
        color: theme.outerGlass,
        transmission: 0.86,
        roughness: 0.26,
        thickness: 30,
        ior: 1.48,
        reflectivity: 0.65,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        attenuationColor: new THREE.Color(theme.attenuationColor),
        attenuationDistance: 40,
        transparent: true,
        opacity: theme.opacity,
        emissive: theme.emissive,
        emissiveIntensity: theme.isFocused ? 0.65 : 0.35,
      });
      const outerGlassMesh = new THREE.Mesh(outerGlassGeo, outerGlassMat);
      outerGlassMesh.rotation.y = blockRotY;
      outerGlassMesh.position.set(0, baselineY, 0);
      singleBlockGroup.add(outerGlassMesh);

      // Top Specular Surface
      const topCapGeo = new THREE.PlaneGeometry(blockWidth - 4, blockDepth - 4);
      topCapGeo.rotateX(-Math.PI / 2);
      const topCapMat = new THREE.MeshStandardMaterial({
        color: theme.topGlass,
        roughness: 0.16,
        metalness: 0.2,
        transparent: true,
        opacity: 0.65,
        emissive: theme.emissive,
        emissiveIntensity: 0.35,
      });
      const topCapMesh = new THREE.Mesh(topCapGeo, topCapMat);
      topCapMesh.rotation.y = blockRotY;
      topCapMesh.position.set(0, baselineY + h - 0.3, 0);
      singleBlockGroup.add(topCapMesh);
    });

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      let stillMoving = false;

      if (!hasMountedRef.current) {
        blockGroups.forEach((bg) => {
          const delay = bg.index * 0.04;
          const entranceProgress = Math.min(1, Math.max(0, (elapsed - delay) / 0.25));
          const easeOut = 1 - Math.pow(1 - entranceProgress, 3);
          const currentY = -25 * (1 - easeOut);
          bg.group.position.y = currentY;
          bg.group.position.x = bg.baseX;
          if (entranceProgress < 1) stillMoving = true;
        });
        if (!stillMoving && elapsed >= 0.3) {
          hasMountedRef.current = true;
        }
      } else {
        blockGroups.forEach((bg) => {
          bg.group.position.y = 0;
          bg.group.position.x = bg.baseX;
        });
        stillMoving = false;
      }

      renderer.render(scene, camera);
      if (stillMoving || !hasMountedRef.current) {
        animId = requestAnimationFrame(render);
      }
    };
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      rootGroup.clear();
    };
  }, [serializedData, totalWidth, sceneHeight]);



  // Dynamic panel placement (Clean top-left HUD without overlapping blocks or pointers)
  const panelCoord = useMemo(() => {
    if (iA === null || iB === null || !blockData[iA] || !blockData[iB]) return null;
    const bA = blockData[iA];
    const bB = blockData[iB];
    const midX = (bA.centerX + bB.centerX) / 2;
    return { midX, bA, bB };
  }, [iA, iB, blockData]);

  // Dedicated Visual Physical TEMP Block position placed with ample breathing room next to active swap pair
  const tempBlockCoords = useMemo(() => {
    const activeIdxA = iA !== null ? iA : (swapIndicesFromCode.dst ?? 0);
    const activeIdxB = iB !== null ? iB : (swapIndicesFromCode.src ?? (activeIdxA + 1));
    const blockA = blockData[activeIdxA] || blockData[0];
    const blockB = blockData[activeIdxB] || blockData[Math.min(count - 1, activeIdxA + 1)];

    if (blockA && blockB) {
      const minX = Math.min(blockA.centerX, blockB.centerX);
      const maxX = Math.max(blockA.centerX, blockB.centerX);
      // If there is space to the left, place it left of minX with breathing room, otherwise right of maxX
      const placeLeft = minX >= 110;
      const targetX = placeLeft
        ? Math.max(65, minX - 95)
        : Math.min(totalWidth - 65, maxX + 95);
      return { x: targetX, y: 14 };
    }

    const fallbackBlock = (blockData && blockData[activeIdxA]) || (blockData && blockData[0]);
    const fallbackX = fallbackBlock ? fallbackBlock.centerX : 100;
    const targetX = fallbackX >= 110 ? fallbackX - 95 : Math.min(totalWidth - 65, fallbackX + 95);
    return { x: targetX, y: 14 };
  }, [iA, iB, swapIndicesFromCode, blockData, count, totalWidth]);

  // Unified Flight & Trajectory Coordinates for 3-Step Swap Choreography
  const flightCoords = useMemo(() => {
    if (!blockData || blockData.length === 0) return null;
    const sourceIdx1 = copySourceIdx;
    const src1Block = blockData[sourceIdx1] || blockData[iA ?? 0];

    const dstIdx2 = swapIndicesFromCode.dst;
    const srcIdx2 = swapIndicesFromCode.src;
    const dst2Block = blockData[dstIdx2] || blockData[iA ?? 0];
    const src2Block = blockData[srcIdx2] || blockData[iB ?? 1];

    const dstIdx3 = swapIndicesFromCode.dst;
    const dst3Block = blockData[dstIdx3] || blockData[iB ?? 1];

    if (phase === "swap_1_temp" && src1Block) {
      // Step 1: Taking value from array into temp
      const startX = src1Block.centerX;
      const startY = sceneHeight / 2 - (baselineY + src1Block.h - 110);
      const targetX = tempBlockCoords.x;
      const targetY = tempBlockCoords.y + 28;
      const ctrlX = startX < targetX ? startX - 25 : startX + 25;
      const ctrlY = Math.min(startY, targetY) - 20;

      return {
        type: "take_to_temp" as const,
        startX, startY, targetX, targetY, ctrlX, ctrlY,
        val: src1Block.val,
        color: "#fbbf24", // amber
        label: `Step 1/3: temp = arr[${src1Block.index}] (${src1Block.val})`
      };
    }

    if (phase === "swap_2_move" && src2Block && dst2Block) {
      // Step 2: Shifting array element across into destination
      const startX = src2Block.centerX;
      const startY = sceneHeight / 2 - (baselineY + src2Block.h - 110);
      const targetX = dst2Block.centerX;
      const targetY = sceneHeight / 2 - (baselineY + dst2Block.h - 110);
      const ctrlX = (startX + targetX) / 2;
      const ctrlY = Math.min(startY, targetY) - 30;

      return {
        type: "shift_array" as const,
        startX, startY, targetX, targetY, ctrlX, ctrlY,
        val: src2Block.val,
        color: "#38bdf8", // cyan
        label: `Step 2/3: arr[${dst2Block.index}] = arr[${src2Block.index}] (${src2Block.val})`
      };
    }

    if (phase === "swap_3_assign" && dst3Block) {
      // Step 3: Retrieving from temp into array
      const startX = tempBlockCoords.x;
      const startY = tempBlockCoords.y + 28;
      const targetX = dst3Block.centerX;
      const targetY = sceneHeight / 2 - (baselineY + dst3Block.h - 110);
      const ctrlX = targetX < startX ? targetX - 25 : targetX + 25;
      const ctrlY = Math.min(startY, targetY) - 20;

      return {
        type: "retrieve_temp" as const,
        startX, startY, targetX, targetY, ctrlX, ctrlY,
        val: tempValue ?? currentFrame?.locals?.temp ?? 0,
        color: "#a855f7", // purple
        label: `Step 3/3: arr[${dst3Block.index}] = temp (${tempValue ?? currentFrame?.locals?.temp ?? ""})`
      };
    }

    return null;
  }, [phase, blockData, iA, iB, copySourceIdx, swapIndicesFromCode, baselineY, sceneHeight, tempBlockCoords, tempValue, currentFrame]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none flex flex-col items-center ${className}`}
      style={{ width: `${totalWidth}px`, height: `${sceneHeight}px` }}
    >
      <canvas
        ref={canvasRef}
        width={totalWidth}
        height={sceneHeight}
        style={{ width: `${totalWidth}px`, height: `${sceneHeight}px`, display: "block" }}
      />

      {/* ═══ DEPTH-OF-FIELD OPTICAL BLUR ON NON-SELECTED BLOCKS ═══ */}
      {isBlurActive &&
        blockData.map((b) => {
          const isLoopFocused =
            loopInfo.isLoopLine &&
            (b.index === loopInfo.varVal ||
              b.index === Number(loopInfo.rhsLimit) ||
              (loopInfo.rhsVarName === "right" && b.index === count - 1));
          const isFocused = loopInfo.isLoopLine
            ? isLoopFocused
            : (b.index === iA ||
                b.index === iB ||
                (swapIndices !== null && swapIndices.length === 2 && (b.index === swapIndices[0] || b.index === swapIndices[1])) ||
                b.index === swapIndicesFromCode.dst ||
                b.index === swapIndicesFromCode.src ||
                b.index === copySourceIdx);
          if (isFocused) return null;
          return (
            <div
              key={`block-blur-${b.index}`}
              style={{
                position: "absolute",
                left: `${b.centerX - itemWidth / 2}px`,
                top: 0,
                width: `${itemWidth}px`,
                height: `${sceneHeight}px`,
                backdropFilter: "blur(6px) saturate(0.35)",
                WebkitBackdropFilter: "blur(6px) saturate(0.35)",
                pointerEvents: "none",
                zIndex: 20,
              }}
            />
          );
        })}

      {/* ═══ SUM CALCULATION: NOTHING PREWRITTEN, 2 AND 15 FLY FROM BLOCKS TO EMPTY SPACE, COMPUTE 17, 17 FLIES OUT TO MEMORY, EQUATION VANISHES ═══ */}
      {phase === "sum_calculation" && iA !== null && iB !== null && blockData[iA!] && blockData[iB!] && (
        <React.Fragment key={`sum-calc-${currentStep}`}>
          {(() => {
            const startY_A = sceneHeight / 2 - (baselineY + blockData[iA!].h * 0.5 - 110);
            const startY_B = sceneHeight / 2 - (baselineY + blockData[iB!].h * 0.5 - 110);
            const midX = (blockData[iA!].centerX + blockData[iB!].centerX) / 2;
            const targetY = 12; // In upper empty space well above pointers and blocks

            const targetX_A = midX - 54;
            const targetX_B = midX + 8;

            const dX_A = targetX_A - blockData[iA!].centerX;
            const dY_A = targetY - startY_A;

            const dX_B = targetX_B - blockData[iB!].centerX;
            const dY_B = targetY - startY_B;

            const resultVal = currentFrame?.locals?.[assignedVarName] ?? currentFrame?.locals?.sum ?? (blockData[iA!].val + blockData[iB!].val);

            const startResX = midX + 68;
            // Exact target coordinates measured directly from the sum number slot in the DOM
            let liveSumX: number | null = sumTargetOffset ? sumTargetOffset.x : null;
            let liveSumY: number | null = sumTargetOffset ? sumTargetOffset.y : null;

            if (typeof document !== "undefined" && containerRef.current) {
              const sumEl =
                document.getElementById("memory-cell-value-sum")?.querySelector("span") ||
                document.getElementById("memory-cell-value-sum");
              if (sumEl) {
                const sumRect = sumEl.getBoundingClientRect();
                const contRect = containerRef.current.getBoundingClientRect();
                liveSumX = sumRect.left + sumRect.width / 2 - contRect.left;
                liveSumY = sumRect.top + sumRect.height / 2 - contRect.top;
              }
            }

            const targetSumX = liveSumX !== null ? liveSumX : (paddingX + 28);
            const targetSumY = liveSumY !== null ? liveSumY : -88;
            const dX_sum = targetSumX - startResX;
            const dY_sum = targetSumY - targetY;

            return (
              <>
                <style>{`
                  /* Fly A up to equation slot A */
                  @keyframes flyInOperandA_${currentStep} {
                    0% { transform: translate(${-dX_A}px, ${-dY_A}px) scale(0.9); opacity: 0; }
                    100% { transform: translate(0, 0) scale(1.0); opacity: 1; }
                  }
                  /* Fly B up to equation slot B */
                  @keyframes flyInOperandB_${currentStep} {
                    0% { transform: translate(${-dX_B}px, ${-dY_B}px) scale(0.9); opacity: 0; }
                    100% { transform: translate(0, 0) scale(1.0); opacity: 1; }
                  }
                  /* Plus reveals after operands arrive */
                  @keyframes opPlus_${currentStep} {
                    0%, 20% { opacity: 0; transform: scale(0.5); }
                    30%, 75% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.8); }
                  }
                  /* Equal sign reveals after plus */
                  @keyframes opEqual_${currentStep} {
                    0%, 35% { opacity: 0; transform: scale(0.5); }
                    45%, 75% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.8); }
                  }
                  /* Operands fade out when 17 flies out */
                  @keyframes operandFadeOut_${currentStep} {
                    0%, 75% { opacity: 1; }
                    100% { opacity: 0; transform: scale(0.7); }
                  }
                  /* Output 17 appears strictly AFTER equal sign is revealed, then glides to sum cell */
                  @keyframes resultFlyOut_${currentStep} {
                    0%, 48% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
                    55% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
                    65% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
                    95% { opacity: 1; transform: translate(calc(-50% + ${dX_sum}px), calc(-50% + ${dY_sum}px)) scale(1.0); filter: drop-shadow(0 0 20px rgba(74, 222, 128, 1)); }
                    100% { opacity: 0; transform: translate(calc(-50% + ${dX_sum}px), calc(-50% + ${dY_sum}px)) scale(1.0); }
                  }
                `}</style>

                {/* ═══ UNIFIED EQUATION ROW WITH 17 EXACTLY IN LINE ═══ */}
                {/* Operand A (e.g. 2) */}
                <div
                  style={{
                    position: "absolute",
                    left: `${targetX_A}px`,
                    top: `${targetY}px`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 48,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "17px",
                    lineHeight: 1,
                    fontWeight: 900,
                    color: "#38bdf8",
                    textShadow: "0 0 14px rgba(56, 189, 248, 1)",
                    animation: `flyInOperandA_${currentStep} 0.5s cubic-bezier(0.2, 0.9, 0.4, 1) forwards, operandFadeOut_${currentStep} 0.5s ease-in 1.2s forwards`,
                    pointerEvents: "none",
                  }}
                >
                  {blockData[iA!].val}
                </div>

                {/* Plus (+) */}
                <div
                  style={{
                    position: "absolute",
                    left: `${midX - 22}px`,
                    top: `${targetY}px`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 48,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "17px",
                    lineHeight: 1,
                    fontWeight: 900,
                    color: "#ffffff",
                    textShadow: "0 0 8px rgba(255, 255, 255, 0.9)",
                    animation: `opPlus_${currentStep} 2.2s ease-out forwards`,
                    pointerEvents: "none",
                  }}
                >
                  +
                </div>

                {/* Operand B (e.g. 15) */}
                <div
                  style={{
                    position: "absolute",
                    left: `${targetX_B}px`,
                    top: `${targetY}px`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 48,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "17px",
                    lineHeight: 1,
                    fontWeight: 900,
                    color: "#f59e0b",
                    textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                    animation: `flyInOperandB_${currentStep} 0.5s cubic-bezier(0.2, 0.9, 0.4, 1) forwards, operandFadeOut_${currentStep} 0.5s ease-in 1.2s forwards`,
                    pointerEvents: "none",
                  }}
                >
                  {blockData[iB!].val}
                </div>

                {/* Equal (=) */}
                <div
                  style={{
                    position: "absolute",
                    left: `${midX + 38}px`,
                    top: `${targetY}px`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 48,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "17px",
                    lineHeight: 1,
                    fontWeight: 900,
                    color: "#ffffff",
                    textShadow: "0 0 8px rgba(255, 255, 255, 0.9)",
                    animation: `opEqual_${currentStep} 2.2s ease-out forwards`,
                    pointerEvents: "none",
                  }}
                >
                  =
                </div>

                {/* Output result (17) in exact same row right next to =, glides to sum cell */}
                <div
                  style={{
                    position: "absolute",
                    left: `${startResX}px`,
                    top: `${targetY - 1.5}px`,
                    transform: "translate(-50%, -50%)",
                    transformOrigin: "center center",
                    zIndex: 50,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "17px",
                    lineHeight: 1,
                    fontWeight: 900,
                    color: "#4ade80",
                    textShadow: "0 0 16px rgba(74, 222, 128, 1), 0 0 28px rgba(74, 222, 128, 0.8)",
                    animation: `resultFlyOut_${currentStep} 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                    pointerEvents: "none",
                  }}
                >
                  {resultVal}
                </div>
              </>
            );
          })()}
        </React.Fragment>
      )}


      {/* ═══ CONTROL FLOW: continue / break / loop-end — block-level focus pulse only ═══ */}
      {(() => {
        return null;
      })()}

      {/* ═══ GLOWING COMPARISON OPERATOR & VALUES BROUGHT CLOSE TOGETHER ═══ */}
      {isIfStatementLine && panelCoord && (
        <div
          key="between-blocks-comparison"
          style={{
            position: "absolute",
            left: `${panelCoord.midX}px`,
            top: `${sceneHeight / 2 - (baselineY + Math.max(panelCoord.bA.h, panelCoord.bB.h) * 0.5 - 110)}px`,
            transform: "translate(-50%, -50%)",
            zIndex: 40,
            pointerEvents: "none",
          }}
          className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-90 duration-300"
        >
          <style>{`
            @keyframes operatorBlink {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.15; transform: scale(1.15); }
            }
          `}</style>
          
          {/* Glowing comparison operator in yellow */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "28px",
              fontWeight: 900,
              color: "#facc15",
              filter: "drop-shadow(0 0 12px rgba(250, 204, 21, 0.95)) drop-shadow(0 0 24px rgba(234, 179, 8, 0.75))",
              animation: "operatorBlink 0.4s ease-in-out 3",
            }}
          >
            {conditionOperator}
          </div>

          {/* Clean TRUE / FALSE label without background pill */}
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "13px",
              fontWeight: 900,
              color: isConditionTrue ? "#4ade80" : "#f87171",
              textShadow: isConditionTrue
                ? "0 0 12px rgba(74, 222, 128, 0.95), 0 0 20px rgba(74, 222, 128, 0.6)"
                : "0 0 12px rgba(248, 113, 113, 0.95), 0 0 20px rgba(248, 113, 113, 0.6)",
              letterSpacing: "0.08em",
            }}
          >
            {isConditionTrue ? "TRUE" : "FALSE"}
          </span>
        </div>
      )}

      {/* ═══ GLOWING TRAJECTORY ARCS (TAKE, SHIFT, RETRIEVE) ═══ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-35 overflow-visible"
        style={{ width: `${totalWidth}px`, height: `${sceneHeight}px` }}
      >
        <defs>
          <linearGradient id="traj-amber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="traj-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="traj-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
          </linearGradient>
          <filter id="traj-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="traj-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffffff" />
          </marker>
        </defs>

        {flightCoords && (
          <g filter="url(#traj-glow)">
            {/* Background neon blur path */}
            <path
              d={`M ${flightCoords!.startX} ${flightCoords!.startY} Q ${flightCoords!.ctrlX} ${flightCoords!.ctrlY} ${flightCoords!.targetX} ${flightCoords!.targetY}`}
              fill="none"
              stroke={flightCoords!.color}
              strokeWidth="4.5"
              strokeOpacity="0.30"
              strokeLinecap="round"
            />
            {/* Animated dashed trajectory path with flow */}
            <path
              d={`M ${flightCoords!.startX} ${flightCoords!.startY} Q ${flightCoords!.ctrlX} ${flightCoords!.ctrlY} ${flightCoords!.targetX} ${flightCoords!.targetY}`}
              fill="none"
              stroke={flightCoords!.color}
              strokeWidth="2.2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              className="animate-[pulse_1.5s_ease-in-out_infinite]"
              markerEnd="url(#traj-arrow)"
            />
          </g>
        )}
      </svg>

      {/* ═══ PHYSICAL FROSTED GLASS TEMP BLOCK WITH BASE SOCKET & ILLUMINATION ═══ */}
      {((currentFrame?.locals?.temp !== undefined && currentFrame?.locals?.temp !== null) || phase === "swap_1_temp") && (
        <div
          key="visual-temp-block"
          style={{
            position: "absolute",
            left: `${tempBlockCoords.x}px`,
            top: `${tempBlockCoords.y}px`,
            transform: "translate(-50%, 0)",
            zIndex: 46,
            pointerEvents: "none",
          }}
          className="flex flex-col items-center animate-in fade-in zoom-in-90 duration-300"
        >
          {/* Frosted Glass Monolith Body for TEMP */}
          <div
            style={{
              width: "54px",
              height: "58px",
              borderRadius: "6px 6px 3px 3px",
              background:
                "linear-gradient(145deg, rgba(168, 85, 247, 0.45) 0%, rgba(139, 92, 246, 0.25) 50%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1.8px solid rgba(192, 132, 252, 0.9)",
              boxShadow:
                "0 0 20px rgba(168, 85, 247, 0.7), inset 0 0 14px rgba(168, 85, 247, 0.35)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Top specular reflection strip */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                width: "44px",
                height: "5px",
                borderRadius: "3px",
                background: "rgba(255, 255, 255, 0.5)",
                filter: "blur(0.5px)",
              }}
            />

            {/* Glowing Numeric Value inside TEMP */}
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                fontSize: "18px",
                fontWeight: 800,
                color: "#ffffff",
                textShadow: "0 0 12px rgba(192, 132, 252, 0.95), 0 0 24px rgba(168, 85, 247, 0.7)",
                letterSpacing: "-0.02em",
                minHeight: "22px",
                display: "inline-block",
              }}
            >
              {phase === "swap_1_temp" && !isLanded
                ? ""
                : (tempValue !== null && tempValue !== undefined ? tempValue : (isLanded && flightCoords?.val !== undefined ? flightCoords.val : ""))}
            </span>
          </div>

          {/* Metal Socket Collar with glowing [temp] index label */}
          <div
            style={{
              width: "64px",
              height: "17px",
              background: "linear-gradient(180deg, #334155 0%, #0f172a 100%)",
              border: "1px solid #64748b",
              borderRadius: "0 0 4px 4px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                fontSize: "10px",
                fontWeight: 800,
                color: "#c084fc",
                textShadow: "0 0 8px rgba(192, 132, 252, 0.85)",
                letterSpacing: "0.05em",
              }}
            >
              [temp]
            </span>
          </div>
        </div>
      )}

      {/* ═══ ANIMATED GHOST GLASS BLOCK TRAVELING ALONG TRAJECTORY ═══ */}
      {flightCoords && !isLanded && (
        <React.Fragment key={`flying-ghost-block-${flightCoords!.type}-${currentStep}`}>
          <style>{`
            @keyframes flightTrajectory_${flightCoords!.type}_${currentStep} {
              0% {
                left: ${flightCoords!.startX}px;
                top: ${flightCoords!.startY}px;
                transform: translate(-50%, -50%) scale(0.92);
                opacity: 0.85;
              }
              50% {
                left: ${flightCoords!.ctrlX}px;
                top: ${flightCoords!.ctrlY}px;
                transform: translate(-50%, -50%) scale(1.12);
                opacity: 1;
              }
              100% {
                left: ${flightCoords!.targetX}px;
                top: ${flightCoords!.targetY}px;
                transform: translate(-50%, -50%) scale(1.0);
                opacity: 0.95;
              }
            }
          `}</style>
          <div
            style={{
              position: "absolute",
              left: `${flightCoords!.targetX}px`,
              top: `${flightCoords!.targetY}px`,
              transform: "translate(-50%, -50%)",
              animation: `flightTrajectory_${flightCoords!.type}_${currentStep} 1.1s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
              zIndex: 50,
              pointerEvents: "none",
              width: "54px",
              height: "62px",
              borderRadius: "6px",
              background:
                flightCoords!.type === "take_to_temp"
                  ? "linear-gradient(135deg, rgba(254, 243, 199, 0.7) 0%, rgba(245, 158, 11, 0.5) 100%)"
                  : flightCoords!.type === "shift_array"
                  ? "linear-gradient(135deg, rgba(224, 242, 254, 0.7) 0%, rgba(14, 165, 233, 0.5) 100%)"
                  : "linear-gradient(135deg, rgba(243, 232, 255, 0.7) 0%, rgba(168, 85, 247, 0.5) 100%)",
              border: `2px solid ${flightCoords!.color}`,
              boxShadow: `0 0 24px ${flightCoords!.color}, inset 0 0 16px rgba(255, 255, 255, 0.7)`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                fontSize: "19px",
                fontWeight: 800,
                color: "#ffffff",
                textShadow: `0 0 14px ${flightCoords!.color}`,
              }}
            >
              {flightCoords!.val}
            </span>
          </div>
        </React.Fragment>
      )}

      {/* ═══ STRICT 1-BY-1 LEFT-TO-RIGHT ARRAY LENGTH SCAN TRAVERSAL (1.. 2.. 3.. 4..) DIRECTLY ABOVE BLOCKS ═══ */}
      {isCountingLength && traversalStep >= 0 && (
        <React.Fragment key={`length-counting-system-${currentStep}`}>
          <style>{`
            @keyframes traversalCounterFade_${currentStep} {
              0% { opacity: 0; transform: translate(-50%, -100%) scale(0.6); }
              15%, 70% { opacity: 1; transform: translate(-50%, -100%) scale(1.0); }
              100% { opacity: 0; transform: translate(-50%, -100%) scale(0.7); }
            }
          `}</style>
          {/* Blocks 0 to count - 2: Normal sequential traversal counter, fades out once counting finishes */}
          {blockData.map((b, idx) => {
            if (idx > traversalStep) return null;
            const blockTopPx = sceneHeight / 2 - (baselineY + b.h - 110);
            const topPx = blockTopPx - 10;
            const isCurrent = idx === traversalStep;
            const isLast = idx === count - 1;

            if (isLast) return null; // Handled separately below with full op & flight animation

            return (
              <div
                key={`traversal-count-${idx}`}
                style={{
                  position: "absolute",
                  left: `${b.centerX}px`,
                  top: `${topPx}px`,
                  transform: "translate(-50%, -100%)",
                  zIndex: 42,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: isCurrent ? "16px" : "14px",
                  fontWeight: 900,
                  color: isCurrent ? "#00ff7a" : "#38bdf8",
                  textShadow: isCurrent
                    ? "0 0 12px rgba(0, 255, 122, 1), 0 0 20px rgba(0, 255, 122, 0.75)"
                    : "0 0 8px rgba(56, 189, 248, 0.9)",
                  pointerEvents: "none",
                  userSelect: "none",
                  letterSpacing: "0.05em",
                  animation: `traversalCounterFade_${currentStep} 1.3s ease-out forwards`,
                }}
              >
                {idx + 1}..
              </div>
            );
          })}

          {/* Last Block (idx === count - 1): Counting -> Expression Operation (e.g. 4 - 1 -> 3) -> Flight to Destination */}
          {traversalStep === count - 1 && !isLengthSettled && blockData[count - 1] && (() => {
            const lastB = blockData[count - 1];
            const blockTopPx = sceneHeight / 2 - (baselineY + lastB.h - 110);
            const topPx = blockTopPx - 10;
            const startX = lastB.centerX;

            const hasOp = Boolean(lengthOpInfo?.hasOp);
            const opText = lengthOpInfo?.opText || "";
            const finalVal = typeof currentFrame?.locals?.[lengthVarName] === "number"
              ? currentFrame.locals[lengthVarName]
              : (lengthOpInfo?.finalVal ?? count);

            const rawSuffix = opText.startsWith(String(count))
              ? opText.slice(String(count).length).trim()
              : opText.replace(/^\d+/, "").trim();
            const suffixText = rawSuffix || "- 1";

            let destX: number;
            let destY: number;

            if (isPointerTarget) {
              const destBlockIdx = Math.max(0, Math.min(count - 1, finalVal));
              const destBlock = blockData[destBlockIdx] || lastB;
              destX = destBlock.centerX;
              const destBlockTopPx = sceneHeight / 2 - (baselineY + destBlock.h - 110);
              destY = destBlockTopPx - 34; // Exact position where pointer tracker sits above that block
            } else {
              let liveLenX: number | null = lengthTargetOffset ? lengthTargetOffset.x : null;
              let liveLenY: number | null = lengthTargetOffset ? lengthTargetOffset.y : null;

              if (typeof document !== "undefined" && containerRef.current) {
                const targetEl =
                  document.getElementById(`memory-cell-value-${lengthVarName}`)?.querySelector("span") ||
                  document.getElementById(`memory-cell-value-${lengthVarName}`) ||
                  document.getElementById("memory-cell-value-n");
                if (targetEl) {
                  const tRect = targetEl.getBoundingClientRect();
                  const cRect = containerRef.current.getBoundingClientRect();
                  if (tRect.width > 0 && cRect.width > 0) {
                    liveLenX = tRect.left + tRect.width / 2 - cRect.left;
                    liveLenY = tRect.top + tRect.height / 2 - cRect.top;
                  }
                }
              }

              destX = liveLenX !== null ? liveLenX : (totalWidth * 0.72);
              destY = liveLenY !== null ? liveLenY : -88;
            }

            const dX = destX - startX;
            const dY = destY - topPx;

            return (
              <div key={`last-block-length-anim-${currentStep}`}>
                <style>{`
                  /* Step 1: Initial count 4 appears on last block */
                  @keyframes lengthCountStep1_${currentStep} {
                    0% { opacity: 0; transform: scale(0.6); }
                    20%, 85% { opacity: 1; transform: scale(1.0); }
                    100% { opacity: 0; transform: scale(0.8); }
                  }

                  /* Step 2: Suffix '- 1' appears beside 4 */
                  @keyframes lengthSuffixStep2_${currentStep} {
                    0%, 30% { opacity: 0; transform: translateX(-8px) scale(0.6); }
                    45%, 85% { opacity: 1; transform: translateX(0) scale(1.0); }
                    100% { opacity: 0; transform: scale(0.8); }
                  }

                  /* Step 3 & 4: Result 3 emerges from 4 - 1 and flies to destination */
                  @keyframes lengthResultStep3Flight_${currentStep} {
                    0%, 46% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    54% { opacity: 1; transform: translate(-50%, -50%) scale(1.25); filter: drop-shadow(0 0 16px ${isPointerTarget ? "rgba(245, 158, 11, 1)" : "rgba(74, 222, 128, 1)"}); }
                    66% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
                    86% {
                      opacity: 1;
                      transform: translate(calc(-50% + ${dX * 0.75}px), calc(-50% + ${dY * 0.75 - (isPointerTarget ? 15 : 25)}px)) scale(1.05);
                    }
                    93% {
                      opacity: 1;
                      transform: translate(calc(-50% + ${dX}px), calc(-50% + ${dY}px)) scale(1.0);
                      filter: drop-shadow(0 0 18px ${isPointerTarget ? "rgba(245, 158, 11, 1)" : "rgba(56, 189, 248, 1)"});
                    }
                    98%, 100% {
                      opacity: 0;
                      transform: translate(calc(-50% + ${dX}px), calc(-50% + ${dY}px)) scale(0.85);
                    }
                  }

                  /* For plain length (no op, e.g. int n = nums.length): single continuous flight */
                  @keyframes lengthDirectFlight_${currentStep} {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
                    25% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); filter: drop-shadow(0 0 14px rgba(0, 255, 122, 1)); }
                    40% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
                    78% {
                      opacity: 1;
                      transform: translate(calc(-50% + ${dX * 0.75}px), calc(-50% + ${dY * 0.75 - 20}px)) scale(1.05);
                    }
                    88% {
                      opacity: 1;
                      transform: translate(calc(-50% + ${dX}px), calc(-50% + ${dY}px)) scale(1.0);
                      filter: drop-shadow(0 0 18px rgba(56, 189, 248, 1));
                    }
                    98%, 100% {
                      opacity: 0;
                      transform: translate(calc(-50% + ${dX}px), calc(-50% + ${dY}px)) scale(0.85);
                    }
                  }
                `}</style>

                {hasOp ? (
                  <>
                    {/* Steps 1 & 2 container: 4 appears, then '- 1' appears next to 4 */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${startX}px`,
                        top: `${topPx}px`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 44,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      {/* Step 1: 4 appears */}
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                          fontSize: "17px",
                          fontWeight: 900,
                          color: "#00ff7a",
                          textShadow: "0 0 12px rgba(0, 255, 122, 1), 0 0 20px rgba(0, 255, 122, 0.75)",
                          animation: `lengthCountStep1_${currentStep} 1.4s ease-out forwards`,
                        }}
                      >
                        {count}
                      </span>

                      {/* Step 2: - 1 appears beside 4 */}
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                          fontSize: "17px",
                          fontWeight: 900,
                          color: "#f59e0b",
                          textShadow: "0 0 14px rgba(245, 158, 11, 1), 0 0 24px rgba(245, 158, 11, 0.8)",
                          animation: `lengthSuffixStep2_${currentStep} 1.4s ease-out forwards`,
                        }}
                      >
                        {suffixText}
                      </span>
                    </div>

                    {/* Steps 3 & 4: 4 - 1 resolves to 3 and 3 glides to destination */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${startX}px`,
                        top: `${topPx}px`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 50,
                        fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                        fontSize: "18px",
                        fontWeight: 900,
                        color: isPointerTarget ? "#f59e0b" : "#ffffff",
                        textShadow: isPointerTarget
                          ? "0 0 14px rgba(245, 158, 11, 1), 0 0 24px rgba(245, 158, 11, 0.8)"
                          : "0 0 14px rgba(56, 189, 248, 1), 0 0 24px rgba(74, 222, 128, 0.9)",
                        pointerEvents: "none",
                        animation: `lengthResultStep3Flight_${currentStep} 2.6s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                      }}
                    >
                      {finalVal}
                    </div>
                  </>
                ) : (
                  /* Plain length: 4 appears and flies straight to destination */
                  <div
                    style={{
                      position: "absolute",
                      left: `${startX}px`,
                      top: `${topPx}px`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 50,
                      fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                      fontSize: "18px",
                      fontWeight: 900,
                      color: "#00ff7a",
                      textShadow: "0 0 14px rgba(0, 255, 122, 1), 0 0 24px rgba(0, 255, 122, 0.8)",
                      pointerEvents: "none",
                      animation: `lengthDirectFlight_${currentStep} 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                    }}
                  >
                    {count}
                  </div>
                )}
              </div>
            );
          })()}
        </React.Fragment>
      )}

      {/* ═══ NEON POINTER TRACKER WITH SMOOTH GLIDE & ELEVATED POSITIONING ═══ */}
      {(() => {
        if (!pointers || pointers.length === 0) return null;
        const visiblePointers = pointers.filter((p) => {
          if (isCountingLength && !isLengthSettled && p.label === lengthVarName) {
            return false;
          }
          return true;
        });
        if (visiblePointers.length === 0) return null;

        // Check if synthetic j+1 pointer should be shown for Bubble Sort comparisons
        // Only show if currently comparing or accessing elements, not on loop header lines
        const isJLoop =
          typeof currentFrame?.locals?.j === "number" &&
          hasComparison &&
          !loopInfo.isLoopLine &&
          iB !== null &&
          iB < count;
        const hasExplicitJPlusOne = visiblePointers.some((p) => p.label === "j+1");
        const prevHadJPlusOne = prevPointersRef.current.has("j+1");

        // Detached vanishing burst for j+1 when comparison step finishes
        const jPlusOneJustVanished = prevHadJPlusOne && !isJLoop;
        const jPlusOneLastPos = lastKnownPointerPositionsRef.current["j+1"];

        if (isJLoop && !hasExplicitJPlusOne && iB !== null) {
          visiblePointers.push({ index: iB, label: "j+1" });
        }

        const groupsByIndex: Record<number, typeof pointers> = {};
        visiblePointers.forEach((p) => {
          if (!groupsByIndex[p.index]) groupsByIndex[p.index] = [];
          groupsByIndex[p.index].push(p);
        });

        const renderedGroups = Object.entries(groupsByIndex).map(([idxStr, group]) => {
          const rawIndex = Number(idxStr);
          const isOutOfBounds = rawIndex < 0 || rawIndex >= count;
          const activeBlock = !isOutOfBounds ? blockData[rawIndex] : null;

          const pointerX = activeBlock
            ? activeBlock.centerX
            : (paddingX + rawIndex * (itemWidth + gap) + itemWidth / 2);

          const blockH = activeBlock ? activeBlock.h : minHeight;
          const blockTopPx = sceneHeight / 2 - (baselineY + blockH - 110);
          const isLoopPointer =
            loopInfo.isLoopLine &&
            group.some(
              (p) =>
                p.label === loopInfo.varName ||
                p.label === loopInfo.rhsVarName ||
                p.label === "left" ||
                p.label === "right" ||
                p.index === loopInfo.varVal ||
                p.index === Number(loopInfo.rhsLimit)
            );
          const isPointerFocused =
            !isBlurActive ||
            isLoopPointer ||
            (!loopInfo.isLoopLine && group.some((p) => p.index === iA || p.index === iB));

          // Check if group can fit on the same line
          const combinedLength = group.map((p) => p.label).join(", ").length;
          const isSameLine = combinedLength <= 14;

          const isConditionStep = Boolean(
            loopInfo.isLoopLine ||
            isIfStatementLine ||
            activeLineCode.includes("==") ||
            activeLineCode.includes("<") ||
            activeLineCode.includes(">")
          );
          const pointerTransitionDelay = isConditionStep ? "0.2s" : "0.1s";

          const primaryLabel = group.map((p) => p.label).sort()[0];

          if (isSameLine) {
            const pointerTopPx = blockTopPx - 34;

            // Check if any pointers in this group are terminating or continue targets
            const terminatingPointers = group.filter((p) =>
              stepEvent?.isLoopTermination &&
              (stepEvent?.terminatedVars?.includes(p.label) || (stepEvent?.isBreak && loopInfo.hasLoop))
            );
            const activePointersInGroup = group.filter((p) => !terminatingPointers.includes(p));

            return (
              <React.Fragment key={`pointer-track-frag-${primaryLabel}`}>
                {/* Render particle burst for terminating pointers */}
                {terminatingPointers.map((p) => {
                  const color =
                    p.label === "i"
                      ? "#38bdf8"
                      : p.label === "j"
                      ? "#00ff7a"
                      : p.label === "left"
                      ? "#38bdf8"
                      : p.label === "right"
                      ? "#f59e0b"
                      : "#c084fc";
                  const delayMs = stepEvent?.isBreak ? 400 : 3200;
                  return (
                    <PointerParticleBurst
                      key={`burst-sameline-${p.label}-${currentStep}`}
                      x={pointerX}
                      y={pointerTopPx}
                      color={color}
                      label={p.label}
                      delayMs={delayMs}
                    />
                  );
                })}

                {/* Render remaining active pointers */}
                {activePointersInGroup.length > 0 && (
                  (() => {
                    const newlyAppearedPtr = activePointersInGroup.find((p) => newPointersThisStep.has(p.label));
                    const appearAnimation = newlyAppearedPtr
                      ? newlyAppearedPtr.label === "i"
                        ? "pointerEntrance_i 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                        : newlyAppearedPtr.label === "j"
                        ? "pointerEntrance_j 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                        : newlyAppearedPtr.label === "left"
                        ? "pointerEntrance_left 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                        : newlyAppearedPtr.label === "right"
                        ? "pointerEntrance_right 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                        : "pointerEntrance_default 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                      : undefined;

                    return (
                      <div
                        key={`pointer-track-${primaryLabel}`}
                        style={{
                          position: "absolute",
                          left: `${pointerX}px`,
                          top: `${pointerTopPx}px`,
                          transform: "translate(-50%, -100%)",
                          zIndex: isLoopPointer ? 36 : 30,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          pointerEvents: "none",
                          filter: isPointerFocused ? "none" : "blur(3px) opacity(0.35)",
                          transition: `left 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0s, top 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0s, filter 0.3s ease`,
                          animation: appearAnimation,
                        }}
                      >
                    {/* Continue statement indicator */}
                    {activePointersInGroup.some((p) =>
                      stepEvent?.isContinue && (stepEvent?.continueTargetVar === p.label || p.label === loopInfo.varName)
                    ) && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-30px",
                          whiteSpace: "nowrap",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          backgroundColor: "rgba(8, 51, 68, 0.95)",
                          border: "1px solid #06b6d4",
                          color: "#67e8f9",
                          fontWeight: 800,
                          fontSize: "9px",
                          fontFamily: "'JetBrains Mono', monospace",
                          boxShadow: "0 0 16px rgba(6, 182, 212, 0.9), inset 0 0 8px rgba(6, 182, 212, 0.4)",
                          animation: "pulse 1.2s infinite ease-in-out",
                          zIndex: 50,
                        }}
                      >
                        CONTINUE ↷ Next Iteration
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                      {activePointersInGroup.map((p, pIdx) => {
                        const color =
                          p.label === "i"
                            ? "#38bdf8"
                            : p.label === "j"
                            ? "#00ff7a"
                            : p.label === "left"
                            ? "#38bdf8"
                            : p.label === "right"
                            ? "#f59e0b"
                            : "#c084fc";
                        lastKnownPointerPositionsRef.current[p.label] = { x: pointerX, y: pointerTopPx, color };
                        const isContinue = stepEvent?.isContinue && (stepEvent?.continueTargetVar === p.label || p.label === loopInfo.varName);

                        return (
                          <React.Fragment key={`pointer-lbl-stable-${p.label}`}>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                                fontSize: "15px",
                                fontWeight: 800,
                                color,
                                textShadow: "none",
                                letterSpacing: "0.05em",
                                lineHeight: 1,
                              }}
                            >
                              {p.label}
                            </span>
                            {pIdx < activePointersInGroup.length - 1 && (
                              <span
                                style={{
                                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                                  fontSize: "15px",
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  lineHeight: 1,
                                  marginRight: "3px",
                                }}
                              >
                                ,
                              </span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {/* Multiple arrows side by side corresponding to each pointer */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      {activePointersInGroup.map((p, pIdx) => {
                        const color =
                          p.label === "i"
                            ? "#38bdf8"
                            : p.label === "j"
                            ? "#00ff7a"
                            : p.label === "left"
                            ? "#38bdf8"
                            : p.label === "right"
                            ? "#f59e0b"
                            : "#c084fc";
                        return (
                          <svg
                            key={`ptr-arr-${p.label}-${pIdx}`}
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={color}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 4v15M19 12l-7 7-7-7" />
                          </svg>
                        );
                      })}
                      </div>
                    </div>
                  );
                })())}
              </React.Fragment>
            );
          } else {
            // Stacked in separate lines: each line has its pointer and arrow
            return (
              <React.Fragment key={`pointer-group-multiline-stable-${primaryLabel}`}>
                {group.map((p, pIdx) => {
                  const offsetY = pIdx * 24;
                  const pointerTopPx = blockTopPx - 34 - offsetY;
                  const color =
                    p.label === "i"
                      ? "#38bdf8"
                      : p.label === "j"
                      ? "#00ff7a"
                      : p.label === "left"
                      ? "#38bdf8"
                      : p.label === "right"
                      ? "#f59e0b"
                      : "#c084fc";

                  lastKnownPointerPositionsRef.current[p.label] = { x: pointerX, y: pointerTopPx, color };

                  const isTerminating = Boolean(
                    stepEvent?.isLoopTermination &&
                    (stepEvent?.terminatedVars?.includes(p.label) || (stepEvent?.isBreak && loopInfo.hasLoop))
                  );

                  if (isTerminating) {
                    const delayMs = stepEvent?.isBreak ? 400 : 3200;
                    return (
                      <PointerParticleBurst
                        key={`burst-multiline-${p.label}-${currentStep}`}
                        x={pointerX}
                        y={pointerTopPx}
                        color={color}
                        label={p.label}
                        delayMs={delayMs}
                      />
                    );
                  }

                  const isLoopPointer =
                    loopInfo.isLoopLine &&
                    (p.label === loopInfo.varName ||
                      p.label === loopInfo.rhsVarName ||
                      p.label === "left" ||
                      p.label === "right" ||
                      p.index === loopInfo.varVal ||
                      p.index === Number(loopInfo.rhsLimit));
                  const isSinglePointerFocused =
                    !isBlurActive ||
                    isLoopPointer ||
                    (!loopInfo.isLoopLine && (p.index === iA || p.index === iB));

                  const isContinue = stepEvent?.isContinue && (stepEvent?.continueTargetVar === p.label || p.label === loopInfo.varName);
                  const isNewlyAppeared = newPointersThisStep.has(p.label);

                  const singleAppearAnimation = isNewlyAppeared
                    ? p.label === "i"
                      ? "pointerEntrance_i 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                      : p.label === "j"
                      ? "pointerEntrance_j 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                      : p.label === "left"
                      ? "pointerEntrance_left 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                      : p.label === "right"
                      ? "pointerEntrance_right 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                      : "pointerEntrance_default 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                    : undefined;

                  return (
                    <div
                      key={`pointer-tracker-stable-${p.label}`}
                      style={{
                        position: "absolute",
                        left: `${pointerX}px`,
                        top: `${pointerTopPx}px`,
                        transform: "translate(-50%, -100%)",
                        zIndex: isLoopPointer ? 36 : (30 + pIdx),
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pointerEvents: "none",
                        filter: isSinglePointerFocused ? "none" : "blur(3px) opacity(0.35)",
                        transition: `left 0.35s cubic-bezier(0.25, 1, 0.5, 1) ${pointerTransitionDelay}, top 0.35s cubic-bezier(0.25, 1, 0.5, 1) ${pointerTransitionDelay}, filter 0.3s ease`,
                        animation: singleAppearAnimation,
                      }}
                    >
                      {isContinue && (
                        <div
                          style={{
                            position: "absolute",
                            top: "-28px",
                            whiteSpace: "nowrap",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            backgroundColor: "rgba(8, 51, 68, 0.95)",
                            border: "1px solid #06b6d4",
                            color: "#67e8f9",
                            fontWeight: 800,
                            fontSize: "9px",
                            fontFamily: "'JetBrains Mono', monospace",
                            boxShadow: "0 0 16px rgba(6, 182, 212, 0.9), inset 0 0 8px rgba(6, 182, 212, 0.4)",
                            animation: "pulse 1.2s infinite ease-in-out",
                            zIndex: 50,
                          }}
                        >
                          CONTINUE ↷ Next Iteration
                        </div>
                      )}
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                          fontSize: "15px",
                          fontWeight: 800,
                          color,
                          textShadow: "none",
                          letterSpacing: "0.05em",
                          lineHeight: 1,
                        }}
                      >
                        {p.label}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={color}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginTop: "2px" }}
                      >
                        <path d="M12 4v15M19 12l-7 7-7-7" />
                      </svg>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          }
        });

        return (
          <>
            {renderedGroups}
            {/* Detached particle burst for pointers that just terminated and were removed from current step locals */}
            {stepEvent?.isLoopTermination && stepEvent?.terminatedVars && (
              <>
                {stepEvent.terminatedVars.map((vName: string) => {
                  const alreadyHandled = visiblePointers.some((p) => p.label === vName);
                  if (alreadyHandled) return null;
                  const lastPos = lastKnownPointerPositionsRef.current[vName];
                  if (!lastPos) return null;
                  const delayMs = stepEvent?.isBreak ? 400 : 3200;
                  return (
                    <PointerParticleBurst
                      key={`burst-detached-${vName}-${currentStep}`}
                      x={lastPos.x}
                      y={lastPos.y}
                      color={lastPos.color || "#00ff7a"}
                      label={vName}
                      delayMs={delayMs}
                    />
                  );
                })}
              </>
            )}

            {/* Vanishing particle burst for j+1 when comparison step finishes */}
            {jPlusOneJustVanished && jPlusOneLastPos && (
              <PointerParticleBurst
                key={`burst-detached-jplusone-${currentStep}`}
                x={jPlusOneLastPos.x}
                y={jPlusOneLastPos.y}
                color={jPlusOneLastPos.color || "#f59e0b"}
                label="j+1"
                delayMs={0}
              />
            )}
          </>
        );
      })()}

      {/* ═══ NUMERIC VALUES INSIDE UPPER FROSTED GLASS ═══ */}
      {blockData.map((b) => {
        const valueY = baselineY + b.h * 0.52;
        const topPx = sceneHeight / 2 - (valueY - 110);
        const isFocused = loopInfo.isLoopLine
          ? false
          : (!isBlurActive || b.index === iA || b.index === iB);

        const displayVal = b.val;

        return (
          <div
            key={`block-text-${b.index}`}
            onClick={() => onBlockClick?.(b.index)}
            className="cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              position: "absolute",
              left: `${b.centerX}px`,
              top: `${topPx}px`,
              transform: "translate(-50%, -50%)",
              zIndex: 25,
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, -apple-system, sans-serif",
              fontSize: b.h >= 80 ? "20px" : b.h >= 55 ? "17px" : "15px",
              fontWeight: 700,
              color: "#ffffff",
              textShadow: b.theme.textShadow,
              userSelect: "none",
              letterSpacing: "-0.02em",
              filter: isFocused ? "none" : "blur(3.5px) saturate(0.55)",
              opacity: loopInfo.isLoopLine ? 0.45 : (isFocused ? 1 : 0.75),
              pointerEvents: "auto",
              transition: "filter 0.4s ease, opacity 0.3s ease",
            }}
            title={`[${b.index}]: ${displayVal}`}
          >
            {displayVal}
          </div>
        );
      })}

      {/* ═══ VOLUMETRIC NEON GLOW HALO AROUND ACTIVE COMPARED BLOCKS ═══ */}
      {blockData.map((b) => {
        const isCompared = isIfStatementLine && hasComparison && (b.index === iA || b.index === iB);
        if (!isCompared && !b.theme.isFocused) return null;
        if (stepEvent?.isLoopTermination || activeLineCode.trim().startsWith("break") || (loopInfo.isLoopLine && !loopInfo.isPass)) return null;
        const topPx = sceneHeight / 2 - (baselineY + b.h - 110);
        const glowColor =
          b.theme.name === "green"
            ? "rgba(34, 197, 94, 0.95)"
            : b.theme.name === "red"
            ? "rgba(239, 68, 68, 0.95)"
            : "rgba(251, 191, 36, 0.85)";
        return (
          <div
            key={`block-glow-aura-${b.index}`}
            style={{
              position: "absolute",
              left: `${b.centerX}px`,
              top: `${topPx}px`,
              width: "56px",
              height: `${b.h}px`,
              transform: "translate(-50%, 0)",
              borderRadius: "6px",
              border: `1.5px solid ${glowColor}`,
              boxShadow: `0 0 16px ${glowColor}, inset 0 0 8px ${glowColor}`,
              pointerEvents: "none",
              zIndex: 22,
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          />
        );
      })}

      {/* ═══ SEQUENTIAL ANIMATED LOOP CONDITION COMPARISON (AT THE POINTER, ON THE SAME LINE) ═══ */}
      <LoopConditionOverlay
        loopInfo={loopInfo}
        currentStep={currentStep}
        blockData={blockData}
        count={count}
        itemWidth={itemWidth}
        gap={gap}
        minHeight={minHeight}
        totalWidth={totalWidth}
        sceneHeight={sceneHeight}
        baselineY={baselineY}
        rhsStartPos={rhsStartPos}
        currentFrame={currentFrame}
      />

      {/* ═══ ARRAY INDEX LABELS ON BASE IN CRISP WHITE GLOW ═══ */}
      {blockData.map((b) => {
        const isLeftIndex = loopInfo.isLoopLine && b.index === loopInfo.varVal;
        const isRightIndex =
          loopInfo.isLoopLine &&
          loopInfo.isRhsArrayIndex &&
          typeof loopInfo.rhsLimit === "number" &&
          b.index === loopInfo.rhsLimit;
        const isIExprIndex =
          loopInfo.isLoopLine &&
          Boolean(loopInfo.rhsExpr?.includes("i")) &&
          typeof currentFrame?.locals?.i === "number" &&
          b.index === currentFrame.locals.i;
        const isLoopIndex = isLeftIndex || isRightIndex || isIExprIndex;

        // Keep all indexes visible; non-loop indexes are blurred rather than removed
        const isFocused = loopInfo.isLoopLine
          ? isLoopIndex
          : (!isBlurActive ||
              b.index === iA ||
              b.index === iB ||
              (swapIndices !== null &&
                swapIndices.length === 2 &&
                (b.index === swapIndices[0] || b.index === swapIndices[1])));

        const labelColor = isLeftIndex
          ? "#38bdf8"
          : isRightIndex
          ? "#f59e0b"
          : "#a1a1aa";

        return (
          <div
            key={`base-index-label-${b.index}`}
            style={{
              position: "absolute",
              left: `${b.centerX}px`,
              bottom: "33px",
              transform: "translateX(-50%)",
              zIndex: isLoopIndex ? 35 : 28,
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "13px",
              fontWeight: 700,
              color: labelColor,
              textShadow: "none",
              pointerEvents: "none",
              userSelect: "none",
              letterSpacing: "0.02em",
              filter: isFocused ? "none" : "opacity(0.4)",
              transition: "all 0.3s ease",
            }}
          >
            {b.index}
          </div>
        );
      })}

      {/* Global CSS keyframes for pointer appear customized by pointer identity */}
      <style>{`
        /* Pointer 'i': Sky-blue drop-down with kinetic spring settle, initial pulse then clean state */
        @keyframes pointerEntrance_i {
          0% {
            opacity: 0;
            transform: translate(-50%, -200%) scale(0.6);
            filter: drop-shadow(0 0 16px #38bdf8);
          }
          60% {
            opacity: 1;
            transform: translate(-50%, -90%) scale(1.12);
            filter: drop-shadow(0 0 8px #38bdf8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.0);
            filter: none;
          }
        }

        /* Pointer 'j': Emerald slide-scale in with clean settle without residual glow */
        @keyframes pointerEntrance_j {
          0% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.3);
            filter: drop-shadow(0 0 16px #00ff7a);
          }
          65% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.15);
            filter: drop-shadow(0 0 8px #00ff7a);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.0);
            filter: none;
          }
        }

        /* Pointer 'left': Lateral slide-in from left */
        @keyframes pointerEntrance_left {
          0% {
            opacity: 0;
            transform: translate(-120%, -100%) scale(0.7);
            filter: drop-shadow(0 0 14px #38bdf8);
          }
          70% {
            opacity: 1;
            transform: translate(-46%, -100%) scale(1.1);
            filter: drop-shadow(0 0 6px #38bdf8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.0);
            filter: none;
          }
        }

        /* Pointer 'right': Lateral slide-in from right */
        @keyframes pointerEntrance_right {
          0% {
            opacity: 0;
            transform: translate(20%, -100%) scale(0.7);
            filter: drop-shadow(0 0 14px #f59e0b);
          }
          70% {
            opacity: 1;
            transform: translate(-54%, -100%) scale(1.1);
            filter: drop-shadow(0 0 6px #f59e0b);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.0);
            filter: none;
          }
        }

        /* Default fallback */
        @keyframes pointerEntrance_default {
          0% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.5);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.0);
            filter: none;
          }
        }
      `}</style>
    </div>
  );
};

export const ThreeArrayBlocks = ThreeArrayScene;
export const ArrayBlock = ThreeArrayScene as any;
