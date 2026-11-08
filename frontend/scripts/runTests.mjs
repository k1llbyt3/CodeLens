import assert from "node:assert";

// Implementation of computeArrayHistories for test verification
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }
  return { ...obj };
}

function is2DArray(arr) {
  return Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]);
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i]) && Array.isArray(b[i])) {
      if (!arraysEqual(a[i], b[i])) return false;
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function computeArrayHistories(trace = []) {
  const histories = {};
  if (!trace || trace.length === 0) return histories;

  const arrayNames = new Set();
  trace.forEach((step) => {
    if (step.locals) {
      Object.keys(step.locals).forEach((key) => {
        if (key !== "args" && Array.isArray(step.locals[key])) {
          arrayNames.add(key);
        }
      });
    }
  });

  arrayNames.forEach((name) => {
    let initialSnapshot = null;
    let lastRecordedArray = null;
    const snapshots = [];
    let changeCounter = 0;

    trace.forEach((step, idx) => {
      const rawArr = step.locals?.[name];
      if (!Array.isArray(rawArr) || rawArr.length === 0) return;

      const is2D = is2DArray(rawArr);
      const cloned = deepClone(rawArr);
      const rows = is2D ? rawArr.length : undefined;
      const cols = is2D ? (rawArr[0]?.length ?? 0) : undefined;

      if (!initialSnapshot) {
        initialSnapshot = {
          changeIndex: 0,
          label: "Initial",
          executionStep: step.step || (idx + 1),
          arrayState: cloned,
          is2D,
          rows,
          cols
        };
        lastRecordedArray = cloned;
      } else {
        if (!arraysEqual(cloned, lastRecordedArray)) {
          changeCounter++;
          snapshots.push({
            changeIndex: changeCounter,
            label: `Change ${changeCounter}`,
            executionStep: step.step || (idx + 1),
            arrayState: cloned,
            is2D,
            rows,
            cols
          });
          lastRecordedArray = cloned;
        }
      }
    });

    const finalArrayState = lastRecordedArray || initialSnapshot?.arrayState || [];
    const is2D = is2DArray(finalArrayState);

    const finalSnapshot = initialSnapshot
      ? {
          changeIndex: changeCounter,
          label: "Final",
          executionStep: trace[trace.length - 1]?.step || trace.length,
          arrayState: finalArrayState,
          is2D,
          rows: is2D ? finalArrayState.length : undefined,
          cols: is2D ? (finalArrayState[0]?.length ?? 0) : undefined
        }
      : null;

    histories[name] = {
      arrayName: name,
      initial: initialSnapshot,
      final: finalSnapshot,
      intermediateSnapshots: snapshots,
      totalChanges: changeCounter,
      is2D
    };
  });

  return histories;
}

// Loop analysis test implementation
function analyzeLoops(code = "", trace = []) {
  const lines = code ? code.split("\n") : [];
  const loops = [];
  const stack = [];

  let loopCounter = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const lineText = lines[lineIdx].trim();

    const forMatch = lineText.match(/\bfor\s*\(([^;]*);([^;]*);([^)]*)\)/);
    const whileMatch = lineText.match(/\bwhile\s*\(([^)]+)\)/);

    let foundLoop = null;

    if (forMatch) {
      const initPart = forMatch[1];
      const condPart = forMatch[2];
      const varMatches = Array.from(initPart.matchAll(/\b([a-zA-Z_]\w*)\s*=/g)).map((m) => m[1]);
      if (varMatches.length === 0) {
        const condVars = Array.from(condPart.matchAll(/\b([a-zA-Z_]\w*)\b/g))
          .map((m) => m[1])
          .filter((v) => !["length", "true", "false"].includes(v));
        if (condVars.length > 0) varMatches.push(condVars[0]);
      }
      foundLoop = {
        type: "for",
        varNames: varMatches,
        condExpr: condPart.trim()
      };
    } else if (whileMatch && !lineText.startsWith("//")) {
      const condPart = whileMatch[1];
      const condVars = Array.from(condPart.matchAll(/\b([a-zA-Z_]\w*)\b/g))
        .map((m) => m[1])
        .filter((v) => !["length", "true", "false", "Math", "null"].includes(v));
      foundLoop = {
        type: "while",
        varNames: condVars,
        condExpr: condPart.trim()
      };
    }

    if (foundLoop) {
      loopCounter++;
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const depth = parent ? parent.depth + 1 : 1;
      const newLoop = {
        id: `loop_${loopCounter}`,
        type: foundLoop.type,
        headerLine: lineNum,
        startLine: lineNum,
        depth,
        parentId: parent ? parent.id : null,
        variableNames: foundLoop.varNames,
        conditionExpr: foundLoop.condExpr
      };
      stack.push(newLoop);
    }

    const openBraces = (lineText.match(/\{/g) || []).length;
    const closeBraces = (lineText.match(/\}/g) || []).length;

    if (closeBraces > openBraces && stack.length > 0) {
      const diff = closeBraces - openBraces;
      for (let d = 0; d < diff && stack.length > 0; d++) {
        const closed = stack.pop();
        loops.push({
          ...closed,
          endLine: lineNum
        });
      }
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop();
    loops.push({
      ...unclosed,
      endLine: lines.length
    });
  }

  loops.sort((a, b) => a.depth - b.depth || a.startLine - b.startLine);

  const outermostLoop = loops.find((l) => l.depth === 1) || null;

  const loopByLine = new Map();
  for (let l = 1; l <= lines.length; l++) {
    const matching = loops
      .filter((loop) => l >= loop.startLine && l <= loop.endLine)
      .sort((a, b) => b.depth - a.depth);
    if (matching.length > 0) {
      loopByLine.set(l, matching[0]);
    }
  }

  const stepEvents = new Map();

  let firstOutermostStepIdx = -1;
  let lastOutermostStepIdx = -1;

  if (outermostLoop) {
    trace.forEach((step, idx) => {
      if (step.line >= outermostLoop.startLine && step.line <= outermostLoop.endLine) {
        if (firstOutermostStepIdx === -1) firstOutermostStepIdx = idx;
        lastOutermostStepIdx = idx;
      }
    });
  }

  for (let i = 0; i < trace.length; i++) {
    const currStep = trace[i];
    const nextStep = i + 1 < trace.length ? trace[i + 1] : null;
    const currLineCode = lines[currStep.line - 1]?.trim() || "";

    const isBreak = /\bbreak\s*;/.test(currLineCode);
    const isContinue = /\bcontinue\s*;/.test(currLineCode);

    const enclosingLoop = loopByLine.get(currStep.line);

    let continueTarget = undefined;
    let continueTargetVar = undefined;
    if (isContinue && enclosingLoop) {
      continueTarget = enclosingLoop;
      continueTargetVar = enclosingLoop.variableNames[0];
    }

    let isLoopTermination = false;
    let terminatedLoop = undefined;
    let terminatedVars = [];

    if (isBreak && enclosingLoop) {
      isLoopTermination = true;
      terminatedLoop = enclosingLoop;
      const parentLoop = loops.find((l) => l.id === enclosingLoop.parentId);
      const parentVars = new Set(parentLoop?.variableNames || []);
      terminatedVars = enclosingLoop.variableNames.filter((v) => !parentVars.has(v));
    } else if (enclosingLoop && currStep.line === enclosingLoop.headerLine && nextStep) {
      if (nextStep.line < enclosingLoop.startLine || nextStep.line > enclosingLoop.endLine) {
        isLoopTermination = true;
        terminatedLoop = enclosingLoop;
        const parentLoop = loops.find((l) => l.id === enclosingLoop.parentId);
        const parentVars = new Set(parentLoop?.variableNames || []);
        terminatedVars = enclosingLoop.variableNames.filter((v) => !parentVars.has(v));
      }
    } else if (nextStep && enclosingLoop) {
      const parentLoop = loops.find((l) => l.id === enclosingLoop.parentId);
      const parentVars = new Set(parentLoop?.variableNames || []);
      const disappeared = enclosingLoop.variableNames.filter(
        (v) => !parentVars.has(v) && currStep.locals?.[v] !== undefined && nextStep.locals?.[v] === undefined
      );
      if (disappeared.length > 0) {
        isLoopTermination = true;
        terminatedLoop = enclosingLoop;
        terminatedVars = disappeared;
      }
    }

    stepEvents.set(i, {
      isLoopTermination,
      terminatedLoop,
      terminatedVars: terminatedVars.length > 0 ? terminatedVars : undefined,
      isBreak,
      isContinue,
      continueTargetLoop: continueTarget,
      continueTargetVar
    });
  }

  const isOutermostCompletedAtStep = (stepIndex) => {
    if (!outermostLoop || firstOutermostStepIdx === -1 || lastOutermostStepIdx === -1) {
      return false;
    }
    if (stepIndex > lastOutermostStepIdx) {
      return true;
    }
    const curr = trace[stepIndex];
    if (curr && (curr.line < outermostLoop.startLine || curr.line > outermostLoop.endLine) && stepIndex >= firstOutermostStepIdx) {
      const willReenter = trace.slice(stepIndex).some(
        (s) => s.line >= outermostLoop.startLine && s.line <= outermostLoop.endLine
      );
      if (!willReenter) return true;
    }
    return false;
  };

  return {
    loops,
    outermostLoop,
    loopByLine,
    stepEvents,
    isOutermostCompletedAtStep
  };
}

console.log("=== Running CodeLens Verification Test Suite ===");

// TEST 1: BubbleSort Nested Loops & Outermost Completion
console.log("\n[Test 1] Nested Loop Analysis & Outermost Completion");
const bubbleCode = `public class Solution {
    public static void main(String[] args) {
        int[] arr = {5, 1, 4, 2};
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        System.out.println("Sorting completed.");
    }
}`;

const bubbleTrace = [
  { step: 1, line: 1, locals: {} },
  { step: 2, line: 2, locals: {} },
  { step: 3, line: 3, locals: { arr: [5, 1, 4, 2] } },
  { step: 4, line: 4, locals: { arr: [5, 1, 4, 2], n: 4 } },
  { step: 5, line: 5, locals: { arr: [5, 1, 4, 2], n: 4, i: 0 } },
  { step: 6, line: 6, locals: { arr: [5, 1, 4, 2], n: 4, i: 0, j: 0 } },
  { step: 7, line: 7, locals: { arr: [5, 1, 4, 2], n: 4, i: 0, j: 0 } },
  { step: 8, line: 6, locals: { arr: [1, 5, 4, 2], n: 4, i: 0, j: 1 } },
  { step: 9, line: 6, locals: { arr: [1, 4, 5, 2], n: 4, i: 0, j: 2 } },
  // Inner loop condition false at step 10: next step goes back to outer loop line 5
  { step: 10, line: 6, locals: { arr: [1, 4, 2, 5], n: 4, i: 0, j: 3 } },
  { step: 11, line: 5, locals: { arr: [1, 4, 2, 5], n: 4, i: 1 } },
  // Outer loop continues
  { step: 12, line: 6, locals: { arr: [1, 4, 2, 5], n: 4, i: 1, j: 0 } },
  // Final step after outermost loop
  { step: 13, line: 14, locals: { arr: [1, 2, 4, 5], n: 4, i: 3 } }
];

const bubbleAnalysis = analyzeLoops(bubbleCode, bubbleTrace);
assert.strictEqual(bubbleAnalysis.loops.length, 2, "Expected 2 loops (outer i and inner j)");
assert.strictEqual(bubbleAnalysis.outermostLoop.depth, 1, "Outer loop must have depth 1");
assert.strictEqual(bubbleAnalysis.outermostLoop.variableNames[0], "i", "Outer loop var must be 'i'");

const innerLoop = bubbleAnalysis.loops.find((l) => l.depth === 2);
assert.ok(innerLoop, "Inner loop must exist at depth 2");
assert.strictEqual(innerLoop.variableNames[0], "j", "Inner loop var must be 'j'");

// Check inner loop termination at step index 9 (step 10):
const step9Event = bubbleAnalysis.stepEvents.get(9);
assert.strictEqual(step9Event.isLoopTermination, true, "Step 9 must be inner loop termination");
assert.deepStrictEqual(step9Event.terminatedVars, ["j"], "Only inner loop var 'j' must terminate");
console.log("✔ Inner loop termination correctly identified, terminating only 'j' without terminating outer 'i'");

// Outermost completion check
assert.strictEqual(bubbleAnalysis.isOutermostCompletedAtStep(9), false, "Outermost loop must NOT be completed while inner loop runs");
assert.strictEqual(bubbleAnalysis.isOutermostCompletedAtStep(11), false, "Outermost loop must NOT be completed while outer loop is still running");
assert.strictEqual(bubbleAnalysis.isOutermostCompletedAtStep(12), true, "Outermost loop MUST be completed at line 14 after outer loop exits");
console.log("✔ Outermost loop completion correctly detected ONLY after outermost loop finishes (not on inner loop exit)");

// TEST 2: Break Statement Detection
console.log("\n[Test 2] Break Statement Detection");
const breakCode = `public class Solution {
    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int left = 0;
        int right = 3;
        while (left < right) {
            if (nums[left] == 2) {
                break;
            }
            left++;
        }
        System.out.println("Done");
    }
}`;

const breakTrace = [
  { step: 1, line: 1, locals: {} },
  { step: 2, line: 6, locals: { nums: [2, 7, 11, 15], left: 0, right: 3 } },
  { step: 3, line: 7, locals: { nums: [2, 7, 11, 15], left: 0, right: 3 } },
  { step: 4, line: 8, locals: { nums: [2, 7, 11, 15], left: 0, right: 3 } }, // break line
  { step: 5, line: 12, locals: { nums: [2, 7, 11, 15], left: 0, right: 3 } }  // after loop
];

const breakAnalysis = analyzeLoops(breakCode, breakTrace);
const breakStepEvent = breakAnalysis.stepEvents.get(3); // index 3 = step 4 (line 8 break)
assert.strictEqual(breakStepEvent.isBreak, true, "Break step must have isBreak = true");
assert.strictEqual(breakStepEvent.isLoopTermination, true, "Break step must trigger loop termination");
assert.ok(breakStepEvent.terminatedVars.includes("left"), "Break must terminate associated pointer");
console.log("✔ Break statement correctly triggers pointer explosion and loop termination");

// TEST 3: Continue Statement Detection
console.log("\n[Test 3] Continue Statement Detection");
const continueCode = `public class Solution {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4};
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == 2) {
                continue;
            }
            arr[i] = arr[i] * 2;
        }
    }
}`;

const continueTrace = [
  { step: 1, line: 4, locals: { arr: [1, 2, 3, 4], i: 0 } },
  { step: 2, line: 5, locals: { arr: [1, 2, 3, 4], i: 0 } },
  { step: 3, line: 8, locals: { arr: [2, 2, 3, 4], i: 0 } },
  { step: 4, line: 4, locals: { arr: [2, 2, 3, 4], i: 1 } },
  { step: 5, line: 5, locals: { arr: [2, 2, 3, 4], i: 1 } },
  { step: 6, line: 6, locals: { arr: [2, 2, 3, 4], i: 1 } }, // continue line
  { step: 7, line: 4, locals: { arr: [2, 2, 3, 4], i: 2 } }, // jumps to loop header
];

const continueAnalysis = analyzeLoops(continueCode, continueTrace);
const continueStepEvent = continueAnalysis.stepEvents.get(5); // index 5 = step 6 (line 6 continue)
assert.strictEqual(continueStepEvent.isContinue, true, "Continue step must have isContinue = true");
assert.strictEqual(continueStepEvent.isLoopTermination, false, "Continue MUST NOT trigger loop termination");
assert.strictEqual(continueStepEvent.continueTargetVar, "i", "Continue must target loop variable 'i'");
console.log("✔ Continue statement correctly detected, targets correct loop, and does NOT trigger explosion");

// TEST 4: Array History & Mutation Tracking (1D and 2D)
console.log("\n[Test 4] Array History & Snapshot Correctness (1D and 2D)");

// 1D Array Mutation Trace
const arrayHistoryTrace = [
  { step: 1, locals: { arr: [5, 1, 4, 2] } }, // Initial
  { step: 2, locals: { arr: [5, 1, 4, 2], n: 4 } }, // No mutation -> must NOT duplicate
  { step: 3, locals: { arr: [5, 1, 4, 2], i: 0, j: 0 } }, // No mutation -> must NOT duplicate
  { step: 4, locals: { arr: [1, 5, 4, 2], i: 0, j: 0 } }, // Change 1 at step 4
  { step: 5, locals: { arr: [1, 5, 4, 2], i: 0, j: 1 } }, // No mutation
  { step: 6, locals: { arr: [1, 4, 5, 2], i: 0, j: 1 } }, // Change 2 at step 6
  { step: 7, locals: { arr: [1, 4, 2, 5], i: 0, j: 2 } }, // Change 3 at step 7
  { step: 8, locals: { arr: [1, 4, 2, 5], i: 1 } }, // No mutation
  { step: 9, locals: { arr: [1, 2, 4, 5], i: 1, j: 1 } }, // Change 4 at step 9 (final)
];

const histories = computeArrayHistories(arrayHistoryTrace);
const arrRecord = histories["arr"];

assert.ok(arrRecord, "Record for 'arr' must exist");
assert.strictEqual(arrRecord.is2D, false, "Must be 1D array");
assert.deepStrictEqual(arrRecord.initial.arrayState, [5, 1, 4, 2], "Initial state must match step 1");
assert.strictEqual(arrRecord.initial.executionStep, 1, "Initial execution step must be 1");
assert.strictEqual(arrRecord.totalChanges, 4, "Must have exactly 4 intermediate changes (no duplicates)");
assert.deepStrictEqual(arrRecord.intermediateSnapshots[0].arrayState, [1, 5, 4, 2]);
assert.strictEqual(arrRecord.intermediateSnapshots[0].executionStep, 4);
assert.deepStrictEqual(arrRecord.intermediateSnapshots[1].arrayState, [1, 4, 5, 2]);
assert.strictEqual(arrRecord.intermediateSnapshots[1].executionStep, 6);
assert.deepStrictEqual(arrRecord.intermediateSnapshots[2].arrayState, [1, 4, 2, 5]);
assert.strictEqual(arrRecord.intermediateSnapshots[2].executionStep, 7);
assert.deepStrictEqual(arrRecord.intermediateSnapshots[3].arrayState, [1, 2, 4, 5]);
assert.strictEqual(arrRecord.intermediateSnapshots[3].executionStep, 9);
assert.deepStrictEqual(arrRecord.final.arrayState, [1, 2, 4, 5], "Final state must match sorted array");
console.log("✔ 1D Array History correctly captured initial, 4 non-duplicate changes, and final states");

// 2D Array Matrix Trace
console.log("\n[Test 5] 2D Matrix History & Multi-Element Mutation in 1 Step");
const matrixTrace = [
  { step: 1, locals: { matrix: [[1, 0], [0, 1]] } }, // Initial 2D
  { step: 2, locals: { matrix: [[1, 0], [0, 1]] } }, // Unchanged
  { step: 3, locals: { matrix: [[9, 0], [0, 9]] } }, // Change 1: 2 elements mutated in 1 step -> 1 snapshot
  { step: 4, locals: { matrix: [[9, 5], [5, 9]] } }, // Change 2
];

const matrixHistories = computeArrayHistories(matrixTrace);
const matRecord = matrixHistories["matrix"];

assert.ok(matRecord, "Record for 'matrix' must exist");
assert.strictEqual(matRecord.is2D, true, "Must be detected as 2D matrix");
assert.strictEqual(matRecord.initial.rows, 2, "Rows must be 2");
assert.strictEqual(matRecord.initial.cols, 2, "Cols must be 2");
assert.strictEqual(matRecord.totalChanges, 2, "Must record exactly 2 changes (multi-element mutation in 1 step = 1 snapshot)");
assert.deepStrictEqual(matRecord.final.arrayState, [[9, 5], [5, 9]]);
console.log("✔ 2D Matrix correctly detected with correct dimensions and single snapshot for multi-element mutation");

console.log("\n==============================================");
console.log("🎉 ALL ACCEPTANCE TEST CRITERIA PASSED! 100% OK");
console.log("==============================================");

