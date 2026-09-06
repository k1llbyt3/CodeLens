"use client";
import React, { useEffect, useRef, useMemo, useState } from "react";
import * as THREE from "three";

export type ArrayBlockState = "default" | "active" | "comparing" | "swapping" | "sorted" | "amber" | "green" | "blue";

export interface ArrayBlockItem {
  val: number;
  state?: ArrayBlockState | string;
}

export interface ThreeArraySceneProps {
  currentArray: ArrayBlockItem[];
  computedMax?: number;
  totalWidth?: number;
  itemWidth?: number;
  gap?: number;
  paddingX?: number;
  sceneHeight?: number;
  activeIndices?: Set<number>;
  pointerIndex?: number | null;
  pointerLabel?: string;
  pointers?: Array<{ index: number; label: string }>;
  swapIndices?: [number, number] | null;
  isCountingLength?: boolean;
  currentFrame?: any;
  activeLineCode?: string;
  currentStep?: number;
  onBlockClick?: (index: number) => void;
  className?: string;
}

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
  onBlockClick,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasMountedRef = useRef(false);

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

  const lengthCalcInfo = useMemo(() => {
    const code = activeLineCode.trim();
    const match = code.match(/\b(int|var|let|const)?\s*([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (!match) return null;
    const varName = match[2];
    let expr = match[3].replace(/;$/, "").trim();
    const locals = currentFrame?.locals || {};
    const evalVal = locals[varName] !== undefined ? locals[varName] : null;

    if (evalVal === null || typeof evalVal !== "number") return null;

    // Substitute array length (e.g. nums.length -> 4, arr.length -> 4) and any local variables
    // e.g. "nums.length - 1" -> "4 - 1 = 3"
    let expandedExpr = expr.replace(/\b[a-zA-Z_]\w*\.length\b/g, String(count));
    Object.keys(locals).forEach((k) => {
      if (k !== varName && typeof locals[k] === "number") {
        expandedExpr = expandedExpr.replace(new RegExp(`\\b${k}\\b`, "g"), String(locals[k]));
      }
    });

    return {
      varName,
      expr,
      finalVal: evalVal,
      formula: expandedExpr !== String(evalVal) ? `${expandedExpr} = ${evalVal}` : `${evalVal}`,
    };
  }, [activeLineCode, currentFrame?.locals, count]);

  const loopInfo = useMemo(() => {
    const locals = currentFrame?.locals || {};
    const hasI = typeof locals.i === "number";
    const hasJ = typeof locals.j === "number";
    const iVal = hasI ? (locals.i as number) : 0;
    const jVal = hasJ ? (locals.j as number) : 0;
    const isLoopLine = /\b(for|while)\b/.test(activeLineCode);
    const endBound = hasI ? Math.max(0, count - 1 - iVal) : count - 1;
    const isInside = hasJ ? jVal < endBound : hasI ? iVal < count : true;
    return {
      hasLoop: hasI || hasJ || isLoopLine,
      isLoopLine,
      iVal,
      jVal,
      startIdx: 0,
      endBound,
      hasI,
      hasJ,
      isInside,
    };
  }, [currentFrame?.locals, activeLineCode, count]);

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

  const containerRef = useRef<HTMLDivElement>(null);
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

  // Single settlement timer: state only updates ONCE after animation completes (no RAF re-render glitch)
  useEffect(() => {
    if (phase === "swap_1_temp" || phase === "swap_2_move" || phase === "swap_3_assign") {
      const timer = setTimeout(() => {
        setLandedStep(currentStep);
      }, 1100);
      return () => clearTimeout(timer);
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

  const isBlurActive = Boolean(
    (isIfStatementLine && hasComparison && phase === "show_result") ||
    phase === "sum_calculation" ||
    phase === "swap_1_temp" ||
    phase === "swap_2_move" ||
    phase === "swap_3_assign" ||
    (swapIndices && swapIndices.length === 2 && swapIndices[0] !== swapIndices[1])
  );

  const isResultActive = Boolean(
    isIfStatementLine &&
    hasComparison &&
    phase === "show_result"
  );

  // ═══ 4. STABLE COLOR THEME WITH RADIANT 3D GLOW ═══
  const getColorTheme = (index: number, state?: string) => {
    const isCompared = isIfStatementLine && hasComparison && (index === iA || index === iB);

    if (isCompared && isResultActive) {
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

  // Dedicated Visual Physical TEMP Block position (placed in empty canvas directly next to active swap blocks)
  const tempBlockCoords = useMemo(() => {
    const activeIdx = iA !== null ? iA : (swapIndicesFromCode.src ?? 0);
    const activeBlock = (blockData && blockData[activeIdx]) || (blockData && blockData[0]);
    const activeX = activeBlock ? activeBlock.centerX : 100;
    const targetX = Math.max(75, Math.min(totalWidth - 75, activeX + 60));
    return { x: targetX, y: 15 };
  }, [totalWidth, iA, swapIndicesFromCode, blockData]);

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
      const ctrlX = (startX + targetX) / 2;
      const ctrlY = Math.min(startY, targetY) - 35;

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
      const ctrlY = Math.min(startY, targetY) - 45;

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
      const ctrlX = (startX + targetX) / 2;
      const ctrlY = Math.min(startY, targetY) - 35;

      return {
        type: "retrieve_temp" as const,
        startX, startY, targetX, targetY, ctrlX, ctrlY,
        val: tempValue ?? currentFrame?.locals?.temp ?? dst3Block.val,
        color: "#a855f7", // purple
        label: `Step 3/3: arr[${dst3Block.index}] = temp (${tempValue ?? currentFrame?.locals?.temp ?? dst3Block.val})`
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
          const isFocused =
            b.index === iA ||
            b.index === iB ||
            (swapIndices && (b.index === swapIndices[0] || b.index === swapIndices[1])) ||
            b.index === swapIndicesFromCode.dst ||
            b.index === swapIndicesFromCode.src ||
            b.index === copySourceIdx;
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
      {phase === "sum_calculation" && iA !== null && iB !== null && blockData[iA] && blockData[iB] && (() => {
        const startY_A = sceneHeight / 2 - (baselineY + blockData[iA].h * 0.5 - 110);
        const startY_B = sceneHeight / 2 - (baselineY + blockData[iB].h * 0.5 - 110);
        const midX = (blockData[iA].centerX + blockData[iB].centerX) / 2;
        const targetY = 12; // In upper empty space well above pointers and blocks

        const targetX_A = midX - 54;
        const targetX_B = midX + 8;

        const dX_A = targetX_A - blockData[iA].centerX;
        const dY_A = targetY - startY_A;

        const dX_B = targetX_B - blockData[iB].centerX;
        const dY_B = targetY - startY_B;

        const resultVal = currentFrame?.locals?.sum ?? (blockData[iA].val + blockData[iB].val);

        const startResX = midX + 68;
        // Exact target coordinates measured directly from the sum number slot in the DOM (with top-left alignment calibration)
        const targetSumX = (sumTargetOffset ? sumTargetOffset.x : (paddingX + 28)) - 8; 
        const targetSumY = (sumTargetOffset ? sumTargetOffset.y : -52) - 6; 
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
                0%, 48% { opacity: 0; transform: translate(0, 0) scale(0.6); }
                55% { opacity: 1; transform: translate(0, 0) scale(1.15); }
                65% { opacity: 1; transform: translate(0, 0) scale(1.0); }
                95% { opacity: 1; transform: translate(${dX_sum}px, ${dY_sum}px) scale(1.0); filter: drop-shadow(0 0 20px rgba(74, 222, 128, 1)); }
                100% { opacity: 0; transform: translate(${dX_sum}px, ${dY_sum}px) scale(1.0); }
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
              {blockData[iA].val}
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
              {blockData[iB].val}
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

      {/* ═══ VISUAL BREAK: CIRCUIT CRACK & ESCAPE VECTOR (NO TEXT, NO PILLS) ═══ */}
      {activeLineCode.trim().startsWith("break") && (
        <div
          key="visual-break-effect"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 44,
          }}
          className="flex items-center justify-center overflow-hidden"
        >
          <style>{`
            @keyframes breakFlash {
              0% { opacity: 0; transform: scaleX(0.4); }
              30% { opacity: 1; transform: scaleX(1); }
              70% { opacity: 0.9; }
              100% { opacity: 0; transform: scaleX(1.3); }
            }
            @keyframes breakArrowOut {
              0% { opacity: 0; transform: translate(-30px, 0) scale(0.6); }
              40% { opacity: 1; transform: translate(0, 0) scale(1.1); }
              100% { opacity: 0; transform: translate(60px, -20px) scale(1.3); }
            }
            @keyframes breakSpark {
              0%, 100% { opacity: 0; }
              50% { opacity: 1; }
            }
          `}</style>
          <svg className="w-full h-full" viewBox={`0 0 ${totalWidth} ${sceneHeight}`}>
            <defs>
              <linearGradient id="breakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                <stop offset="30%" stopColor="#f87171" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <filter id="breakGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing fractured circuit line across array representing loop boundary snapping */}
            <path
              d={`M 40 ${sceneHeight / 2 - 30} L ${totalWidth / 2 - 25} ${sceneHeight / 2 - 30} L ${totalWidth / 2 - 10} ${sceneHeight / 2 - 45} L ${totalWidth / 2 + 10} ${sceneHeight / 2 - 15} L ${totalWidth / 2 + 30} ${sceneHeight / 2 - 30} L ${totalWidth - 40} ${sceneHeight / 2 - 30}`}
              fill="none"
              stroke="url(#breakGrad)"
              strokeWidth="4"
              filter="url(#breakGlow)"
              style={{ animation: `breakFlash 0.9s ease-out forwards` }}
            />

            {/* Outward kinetic escape arrows representing loop exit */}
            <g style={{ transformOrigin: "center", animation: `breakArrowOut 0.9s cubic-bezier(0.2, 0.8, 0.4, 1) forwards` }}>
              <path
                d={`M ${totalWidth / 2 + 10} ${sceneHeight / 2 - 30} L ${totalWidth / 2 + 50} ${sceneHeight / 2 - 30} M ${totalWidth / 2 + 38} ${sceneHeight / 2 - 42} L ${totalWidth / 2 + 52} ${sceneHeight / 2 - 30} L ${totalWidth / 2 + 38} ${sceneHeight / 2 - 18}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#breakGlow)"
              />
              <circle
                cx={totalWidth / 2}
                cy={sceneHeight / 2 - 30}
                r="18"
                fill="none"
                stroke="#f87171"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                style={{ animation: `breakSpark 0.5s ease-in-out infinite` }}
              />
            </g>
          </svg>
        </div>
      )}

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
              letterSpacing: "0.1em",
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
              d={`M ${flightCoords.startX} ${flightCoords.startY} Q ${flightCoords.ctrlX} ${flightCoords.ctrlY} ${flightCoords.targetX} ${flightCoords.targetY}`}
              fill="none"
              stroke={flightCoords.color}
              strokeWidth="4.5"
              strokeOpacity="0.30"
              strokeLinecap="round"
            />
            {/* Animated dashed trajectory path with flow */}
            <path
              d={`M ${flightCoords.startX} ${flightCoords.startY} Q ${flightCoords.ctrlX} ${flightCoords.ctrlY} ${flightCoords.targetX} ${flightCoords.targetY}`}
              fill="none"
              stroke={flightCoords.color}
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
      {currentFrame?.locals?.temp !== undefined && currentFrame?.locals?.temp !== null && (
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
                : (tempValue ?? currentFrame?.locals?.temp ?? "")}
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
        <>
          <style>{`
            @keyframes flightTrajectory_${flightCoords.type}_${currentStep} {
              0% {
                left: ${flightCoords.startX}px;
                top: ${flightCoords.startY}px;
                transform: translate(-50%, -50%) scale(0.92);
                opacity: 0.85;
              }
              50% {
                left: ${flightCoords.ctrlX}px;
                top: ${flightCoords.ctrlY}px;
                transform: translate(-50%, -50%) scale(1.12);
                opacity: 1;
              }
              100% {
                left: ${flightCoords.targetX}px;
                top: ${flightCoords.targetY}px;
                transform: translate(-50%, -50%) scale(1.0);
                opacity: 0.95;
              }
            }
          `}</style>
          <div
            key={`flying-ghost-block-${flightCoords.type}-${currentStep}`}
            style={{
              position: "absolute",
              left: `${flightCoords.targetX}px`,
              top: `${flightCoords.targetY}px`,
              transform: "translate(-50%, -50%)",
              animation: `flightTrajectory_${flightCoords.type}_${currentStep} 1.1s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
              zIndex: 50,
              pointerEvents: "none",
              width: "54px",
              height: "62px",
              borderRadius: "6px",
              background:
                flightCoords.type === "take_to_temp"
                  ? "linear-gradient(135deg, rgba(254, 243, 199, 0.7) 0%, rgba(245, 158, 11, 0.5) 100%)"
                  : flightCoords.type === "shift_array"
                  ? "linear-gradient(135deg, rgba(224, 242, 254, 0.7) 0%, rgba(14, 165, 233, 0.5) 100%)"
                  : "linear-gradient(135deg, rgba(243, 232, 255, 0.7) 0%, rgba(168, 85, 247, 0.5) 100%)",
              border: `2px solid ${flightCoords.color}`,
              boxShadow: `0 0 24px ${flightCoords.color}, inset 0 0 16px rgba(255, 255, 255, 0.7)`,
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
                textShadow: `0 0 14px ${flightCoords.color}`,
              }}
            >
              {flightCoords.val}
            </span>
          </div>
        </>
      )}

      {/* ═══ STRICT 1-BY-1 LEFT-TO-RIGHT ARRAY LENGTH SCAN TRAVERSAL (1.. 2.. 3.. 4..) DIRECTLY ABOVE BLOCKS ═══ */}
      {isCountingLength && traversalStep >= 0 && (
        <>
          {blockData.map((b, idx) => {
            if (idx > traversalStep) return null;
            const blockTopPx = sceneHeight / 2 - (baselineY + b.h - 110);
            const topPx = blockTopPx - 10;
            const isCurrent = idx === traversalStep;
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
                  transition: "all 0.3s ease",
                }}
                className="animate-in fade-in zoom-in-75 duration-300"
              >
                {idx + 1}..
              </div>
            );
          })}

          {/* Length completion variable assignment badge - positioned top right cleanly without pill container */}
          {traversalStep >= count - 1 && (
            <div
              style={{
                position: "absolute",
                right: "16px",
                top: "4px",
                zIndex: 44,
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              }}
              className="text-xs font-extrabold flex items-center gap-1 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-none"
            >
              <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">{lengthCalcInfo?.varName}</span>
              <span className="text-neutral-400">=</span>
              <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{lengthCalcInfo?.formula}</span>
            </div>
          )}
        </>
      )}

      {/* ═══ NEON POINTER TRACKER WITH SMOOTH GLIDE & ELEVATED POSITIONING ═══ */}
      {(() => {
        if (!pointers || pointers.length === 0) return null;
        const groupsByIndex: Record<number, typeof pointers> = {};
        pointers.forEach((p) => {
          if (!groupsByIndex[p.index]) groupsByIndex[p.index] = [];
          groupsByIndex[p.index].push(p);
        });

        return Object.entries(groupsByIndex).map(([idxStr, group]) => {
          const index = Number(idxStr);
          const activeBlock = blockData[index];
          if (!activeBlock) return null;

          const blockTopPx = sceneHeight / 2 - (baselineY + activeBlock.h - 110);
          const isPointerFocused = !isBlurActive || group.some((p) => p.index === iA || p.index === iB);

          // Check if group can fit on the same line
          const combinedLength = group.map((p) => p.label).join(", ").length;
          const isSameLine = combinedLength <= 14;

          if (isSameLine) {
            const pointerTopPx = blockTopPx - 34;
            const primaryColor =
              group[0].label === "i"
                ? "#38bdf8"
                : group[0].label === "j"
                ? "#00ff7a"
                : group[0].label === "left"
                ? "#38bdf8"
                : group[0].label === "right"
                ? "#f59e0b"
                : "#c084fc";

            return (
              <div
                key={`pointer-group-${index}`}
                style={{
                  position: "absolute",
                  left: `${activeBlock.centerX}px`,
                  top: `${pointerTopPx}px`,
                  transform: "translate(-50%, -100%)",
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  pointerEvents: "none",
                  filter: isPointerFocused ? "none" : "blur(3px) opacity(0.35)",
                  transition: "left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1), filter 0.3s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  {group.map((p, pIdx) => {
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
                      <React.Fragment key={`pointer-lbl-${p.label}-${index}`}>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                            fontSize: "15px",
                            fontWeight: 800,
                            color,
                            textShadow: `0 0 8px ${color}, 0 0 18px ${color}80`,
                            letterSpacing: "0.05em",
                            lineHeight: 1,
                          }}
                        >
                          {p.label}
                        </span>
                        {pIdx < group.length - 1 && (
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
                  {group.map((p, pIdx) => {
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
                        style={{
                          filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}90)`,
                        }}
                      >
                        <path d="M12 4v15M19 12l-7 7-7-7" />
                      </svg>
                    );
                  })}
                </div>
              </div>
            );
          } else {
            // Stacked in separate lines: each line has its pointer and arrow
            return (
              <React.Fragment key={`pointer-group-multiline-${index}`}>
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

                  return (
                    <div
                      key={`pointer-tracker-${p.label}-${index}`}
                      style={{
                        position: "absolute",
                        left: `${activeBlock.centerX}px`,
                        top: `${pointerTopPx}px`,
                        transform: "translate(-50%, -100%)",
                        zIndex: 30 + pIdx,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pointerEvents: "none",
                        filter: isPointerFocused ? "none" : "blur(3px) opacity(0.35)",
                        transition: "left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1), filter 0.3s ease",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                          fontSize: "15px",
                          fontWeight: 800,
                          color,
                          textShadow: `0 0 8px ${color}, 0 0 18px ${color}80`,
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
                        style={{
                          filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}90)`,
                          marginTop: "2px",
                        }}
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
      })()}

      {/* ═══ NUMERIC VALUES INSIDE UPPER FROSTED GLASS ═══ */}
      {blockData.map((b) => {
        const valueY = baselineY + b.h * 0.52;
        const topPx = sceneHeight / 2 - (valueY - 110);
        const isFocused = !isBlurActive || b.index === iA || b.index === iB;

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
              filter: isFocused ? "none" : "blur(3.5px) saturate(0.60)",
              opacity: isFocused ? 1 : 0.75,
              transition: "filter 0.4s ease, opacity 0.4s ease",
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

      {/* ═══ ACTIVE LOOP BOUNDARY SCANNER RAIL (VISUAL LOOP CHECK CUE) ═══ */}
      {loopInfo.isLoopLine && blockData[0] && blockData[loopInfo.endBound] && (
        <div
          style={{
            position: "absolute",
            left: `${blockData[0].centerX - 28}px`,
            width: `${blockData[loopInfo.endBound].centerX - blockData[0].centerX + 56}px`,
            bottom: "8px",
            height: "5px",
            borderRadius: "9999px",
            background: loopInfo.isInside
              ? "linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.65) 50%, rgba(56, 189, 248, 0.15) 100%)"
              : "linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.8) 50%, rgba(239, 68, 68, 0.2) 100%)",
            border: loopInfo.isInside ? "1.2px solid rgba(56, 189, 248, 0.85)" : "1.2px solid rgba(239, 68, 68, 0.85)",
            boxShadow: loopInfo.isInside
              ? "0 0 16px rgba(56, 189, 248, 0.85), inset 0 0 8px rgba(56, 189, 248, 0.5)"
              : "0 0 16px rgba(239, 68, 68, 0.85), inset 0 0 8px rgba(239, 68, 68, 0.5)",
            pointerEvents: "none",
            zIndex: 26,
            overflow: "hidden",
          }}
        >
          {/* Traveling scanner pulse pip */}
          <div
            style={{
              width: "36px",
              height: "100%",
              borderRadius: "9999px",
              background: loopInfo.isInside ? "#38bdf8" : "#ef4444",
              boxShadow: loopInfo.isInside ? "0 0 14px #38bdf8" : "0 0 14px #ef4444",
              animation: "scanPulse 1.2s ease-in-out infinite alternate",
            }}
          />
        </div>
      )}

      {/* ═══ SORTED PASS / LOOP END AURORA CASCADE SHIMMER WAVE (VISUAL TREAT - NO LETTERS) ═══ */}
      {(activeLineCode.includes("Sorting completed") || (currentFrame?.locals?.i !== undefined && currentFrame.locals.i >= count - 1)) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 24,
            overflow: "hidden",
          }}
        >
          {blockData.map((b, idx) => {
            const topPx = sceneHeight / 2 - (baselineY + b.h - 110);
            return (
              <div
                key={`aurora-wave-${b.index}`}
                style={{
                  position: "absolute",
                  left: `${b.centerX}px`,
                  top: `${topPx}px`,
                  width: "64px",
                  height: `${b.h}px`,
                  transform: "translateX(-50%)",
                  borderRadius: "6px",
                  background: "linear-gradient(180deg, rgba(52, 211, 153, 0.35) 0%, rgba(56, 189, 248, 0.2) 100%)",
                  boxShadow: "0 0 22px rgba(52, 211, 153, 0.85), inset 0 0 12px rgba(56, 189, 248, 0.6)",
                  animation: `auroraPulse 1.8s ease-in-out infinite ${idx * 0.14}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ═══ ARRAY INDEX LABELS ON BASE IN CRISP WHITE GLOW ═══ */}
      {blockData.map((b) => {
        const isFocused = !isBlurActive || b.index === iA || b.index === iB || (swapIndices && (b.index === swapIndices[0] || b.index === swapIndices[1]));
        return (
          <div
            key={`base-index-label-${b.index}`}
            style={{
              position: "absolute",
              left: `${b.centerX}px`,
              bottom: "33px",
              transform: "translateX(-50%)",
              zIndex: 28,
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "14px",
              fontWeight: 800,
              color: "#ffffff",
              textShadow: "0 0 10px rgba(255, 255, 255, 0.95), 0 0 20px rgba(255, 255, 255, 0.6)",
              pointerEvents: "none",
              userSelect: "none",
              letterSpacing: "0.04em",
              filter: isFocused ? "none" : "blur(3px) opacity(0.25)",
              transition: "all 0.3s ease",
            }}
          >
            [{b.index}]
          </div>
        );
      })}
    </div>
  );
};

export const ThreeArrayBlocks = ThreeArrayScene;
export const ArrayBlock = ThreeArrayScene as any;
