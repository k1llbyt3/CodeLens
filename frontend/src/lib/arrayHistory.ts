import { TraceStep } from "@/types/tracer";

export interface ArraySnapshot {
  changeIndex: number; // 0 for Initial, 1, 2, 3... for changes
  label: string; // "Initial", "Change 1", "Change 2", etc.
  executionStep: number;
  arrayState: any; // 1D array (any[]) or 2D array (any[][])
  is2D: boolean;
  rows?: number;
  cols?: number;
}

export interface ArrayHistoryRecord {
  arrayName: string;
  initial: ArraySnapshot | null;
  final: ArraySnapshot | null;
  intermediateSnapshots: ArraySnapshot[];
  totalChanges: number;
  is2D: boolean;
  dataType: string;
  sizeDescription: string;
}

function inferElementDataType(sample: any): string {
  if (sample === null || sample === undefined) return "int";
  if (typeof sample === "number") {
    return Number.isInteger(sample) ? "int" : "double";
  }
  if (typeof sample === "boolean") return "boolean";
  if (typeof sample === "string") {
    return sample.length === 1 ? "char" : "String";
  }
  return typeof sample;
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }
  return { ...obj };
}

function is2DArray(arr: any): boolean {
  return Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]);
}

function arraysEqual(a: any, b: any): boolean {
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

export function computeArrayHistories(trace: TraceStep[] = []): Record<string, ArrayHistoryRecord> {
  const histories: Record<string, ArrayHistoryRecord> = {};
  if (!trace || trace.length === 0) return histories;

  // 1. Identify all array names across trace (exclude 'args')
  const arrayNames = new Set<string>();
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
    let initialSnapshot: ArraySnapshot | null = null;
    let lastRecordedArray: any = null;
    const snapshots: ArraySnapshot[] = [];
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
        // Check if there is an actual modification
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

    const initSnap = initialSnapshot as ArraySnapshot | null;
    const finalArrayState = lastRecordedArray || initSnap?.arrayState || [];
    const is2D = is2DArray(finalArrayState);

    let rawDataType = "int";
    let sizeDescription = "0 elements";

    if (initSnap && Array.isArray(initSnap.arrayState)) {
      if (is2D) {
        const rows = initSnap.arrayState.length;
        const cols = Array.isArray(initSnap.arrayState[0]) ? initSnap.arrayState[0].length : 0;
        sizeDescription = `${rows} × ${cols} (${rows * cols} cells)`;
        const sampleVal = initSnap.arrayState[0]?.[0];
        rawDataType = `${inferElementDataType(sampleVal)}[][]`;
      } else {
        const len = initSnap.arrayState.length;
        sizeDescription = `${len} elements`;
        const sampleVal = initSnap.arrayState[0];
        rawDataType = `${inferElementDataType(sampleVal)}[]`;
      }
    }

    const finalSnapshot: ArraySnapshot | null = initSnap
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
      initial: initSnap,
      final: finalSnapshot,
      intermediateSnapshots: snapshots,
      totalChanges: changeCounter,
      is2D,
      dataType: rawDataType,
      sizeDescription
    };
  });

  return histories;
}

