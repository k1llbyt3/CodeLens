import { TraceStep } from "@/types/tracer";

export type BlockStatus = "idle" | "reading" | "writing" | "deleting";

export interface PhysicalBlock {
  id: string;
  originalId: string | number;
  val: any;
  status: BlockStatus;
  isMoving: boolean;
}

export interface ClawPointer {
  name: string;
  index: number;
  actionType: "idle" | "reading" | "writing" | "swapping";
}

export interface ArrayBlockState {
  name: string;
  blocks: PhysicalBlock[];
  pointers: ClawPointer[];
  swapIndices: [number, number] | null;
  maxVal: number;
}

/**
 * Universal Stable ID Tracking System with Crane-Lift Swap Detection
 * Tracks permanent element identities and identifies when blocks are in motion (isMoving).
 */
export function computeGlobalTraceBlocks(
  trace: TraceStep[],
  targetStep: number,
  code: string = ""
): {
  arrayStates: Record<string, ArrayBlockState>;
  globalMaxVal: number;
} {
  if (!trace || trace.length === 0) {
    return { arrayStates: {}, globalMaxVal: 10 };
  }

  const boundedStep = Math.max(0, Math.min(targetStep, trace.length - 1));
  const currentFrame = trace[boundedStep];

  const codeLines = code ? code.split("\n") : [];
  const activeLine = currentFrame?.line ? codeLines[currentFrame.line - 1] || "" : "";

  // 1. Find all arrays that ever exist in trace (ignoring 'args')
  const allArrayNames = new Set<string>();
  trace.forEach((step) => {
    if (step.locals) {
      Object.keys(step.locals).forEach((k) => {
        if (k !== "args" && Array.isArray(step.locals[k])) {
          allArrayNames.add(k);
        }
      });
    }
  });

  const arrayStates: Record<string, ArrayBlockState> = {};
  let globalMax = 1;

  allArrayNames.forEach((arrName) => {
    // Find the first step where this array is initialized
    const firstStepIdx = trace.findIndex(
      (step) => Array.isArray(step.locals?.[arrName]) && step.locals[arrName].length > 0
    );

    if (firstStepIdx === -1 || firstStepIdx > boundedStep) {
      return;
    }

    const initialRaw = trace[firstStepIdx].locals[arrName] as any[];

    // Permanent unique IDs assigned at declaration
    let currentBlocks: PhysicalBlock[] = initialRaw.map((val, idx) => ({
      id: `block-${arrName}-${idx}`,
      originalId: `${arrName}-${idx}`,
      val,
      status: "idle",
      isMoving: false
    }));

    let activeSwapIndices: [number, number] | null = null;
    let previousStepBlocks: PhysicalBlock[] = [...currentBlocks];

    // Replay state step-by-step up to boundedStep
    for (let s = firstStepIdx + 1; s <= boundedStep; s++) {
      const frame = trace[s];
      const prevFrameStep = trace[s - 1];
      const currArr = frame.locals?.[arrName];
      const prevArr = prevFrameStep.locals?.[arrName];

      if (s === boundedStep) {
        previousStepBlocks = [...currentBlocks];
      }

      if (!Array.isArray(currArr)) continue;

      // Detect bubble-sort swap in progress (line 12 or 13)
      if (
        typeof frame.locals?.j === "number" &&
        frame.locals?.temp !== undefined &&
        (frame.line === 12 || frame.line === 13)
      ) {
        const j = frame.locals.j;
        if (j >= 0 && j + 1 < currentBlocks.length) {
          // Swap physical objects at line 12
          if (frame.line === 12 && (!prevArr || prevArr[j] !== currArr[j])) {
            const tempObj = currentBlocks[j];
            currentBlocks[j] = currentBlocks[j + 1];
            currentBlocks[j + 1] = tempObj;
          }
          if (s === boundedStep) {
            activeSwapIndices = [j, j + 1];
          }
        }
      } else if (
        Array.isArray(prevArr) &&
        prevArr.length === currArr.length &&
        currArr.length === currentBlocks.length
      ) {
        // Detect 2-element swap between frames
        const diffs: number[] = [];
        for (let k = 0; k < currArr.length; k++) {
          if (prevArr[k] !== currArr[k]) diffs.push(k);
        }
        if (diffs.length === 2) {
          const [d1, d2] = diffs;
          if (prevArr[d1] === currArr[d2] && prevArr[d2] === currArr[d1]) {
            const tempObj = currentBlocks[d1];
            currentBlocks[d1] = currentBlocks[d2];
            currentBlocks[d2] = tempObj;

            if (s === boundedStep) {
              activeSwapIndices = [Math.min(d1, d2), Math.max(d1, d2)];
            }
          }
        }
      }
    }

    // Detect swap at the active frame if pointers are at comparison or swap
    if (
      currentFrame &&
      typeof currentFrame.locals?.j === "number" &&
      currentFrame.locals?.temp !== undefined &&
      (currentFrame.line === 11 || currentFrame.line === 12 || currentFrame.line === 13)
    ) {
      const j = currentFrame.locals.j;
      if (j >= 0 && j + 1 < currentBlocks.length) {
        activeSwapIndices = [j, j + 1];
      }
    }

    // Extract pointers relevant to this array
    const pointers: ClawPointer[] = [];
    const currLocals = currentFrame?.locals || {};
    const hasJPlus1 = activeLine.includes("j + 1") || activeLine.includes("j+1");

    const isComparisonLine =
      activeLine.includes(">") ||
      activeLine.includes("<") ||
      activeLine.includes("==") ||
      activeLine.includes("!=") ||
      activeLine.includes("+") ||
      activeLine.includes("sum");

    const isWriteLine =
      activeLine.includes("=") &&
      !activeLine.includes("==") &&
      !activeLine.includes("<=") &&
      !activeLine.includes(">=");

    const EXCLUDED_PTR_NAMES = new Set(["args"]);

    Object.entries(currLocals).forEach(([k, val]) => {
      if (EXCLUDED_PTR_NAMES.has(k)) return;
      if (
        typeof val === "number" &&
        Number.isInteger(val) &&
        val >= 0 &&
        val < currentBlocks.length
      ) {
        const isPointerInSwap =
          activeSwapIndices &&
          (val === activeSwapIndices[0] || val === activeSwapIndices[1]);

        let actionType: "idle" | "reading" | "writing" | "swapping" = "idle";
        if (isPointerInSwap) {
          actionType = "swapping";
        } else if (isWriteLine && (activeLine.includes(`[${k}]`) || activeLine.includes(k))) {
          actionType = "writing";
        } else if (isComparisonLine && (activeLine.includes(`[${k}]`) || activeLine.includes(k))) {
          actionType = "reading";
        }

        pointers.push({ name: k, index: val, actionType });

        if (k === "j" && val + 1 >= 0 && val + 1 < currentBlocks.length) {
          const isJPlus1InSwap =
            activeSwapIndices &&
            (val + 1 === activeSwapIndices[0] || val + 1 === activeSwapIndices[1]);
          pointers.push({
            name: "j+1",
            index: val + 1,
            actionType: isJPlus1InSwap
              ? "swapping"
              : isComparisonLine
              ? "reading"
              : "idle"
          });
        }
      }
    });

    // Determine isMoving: Compare position of each block between previous step and current step
    const prevIds = previousStepBlocks.map((b) => b.id);

    const finalBlocks: PhysicalBlock[] = currentBlocks.map((block, idx) => {
      let status: BlockStatus = "idle";
      let isMoving = false;

      const prevIdx = prevIds.indexOf(block.id);
      if (prevIdx !== -1 && prevIdx !== idx) {
        isMoving = true;
      }

      if (activeSwapIndices && (idx === activeSwapIndices[0] || idx === activeSwapIndices[1])) {
        status = "writing";
        isMoving = true;
      } else {
        const readPointer = pointers.find((p) => p.index === idx && p.actionType === "reading");
        const writePointer = pointers.find((p) => p.index === idx && p.actionType === "writing");
        if (writePointer) {
          status = "writing";
        } else if (readPointer) {
          status = "reading";
        }
      }

      const num = Number(block.val);
      if (!isNaN(num) && isFinite(num) && num > globalMax) {
        globalMax = num;
      }

      return {
        ...block,
        status,
        isMoving
      };
    });

    arrayStates[arrName] = {
      name: arrName,
      blocks: finalBlocks,
      pointers,
      swapIndices: activeSwapIndices,
      maxVal: globalMax
    };
  });

  return { arrayStates, globalMaxVal: globalMax };
}
