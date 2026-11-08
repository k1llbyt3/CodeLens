import { TraceStep } from "@/types/tracer";

export interface LoopScope {
  id: string;
  type: "for" | "while" | "do-while";
  headerLine: number;
  startLine: number;
  endLine: number;
  depth: number;
  parentId: string | null;
  variableNames: string[];
  conditionExpr?: string;
}

export interface StepEventInfo {
  isLoopTermination?: boolean;
  terminatedLoop?: LoopScope;
  terminatedVars?: string[];
  isBreak?: boolean;
  isContinue?: boolean;
  continueTargetLoop?: LoopScope;
  continueTargetVar?: string;
}

export interface LoopAnalysisResult {
  loops: LoopScope[];
  outermostLoop: LoopScope | null;
  loopByLine: Map<number, LoopScope>;
  stepEvents: Map<number, StepEventInfo>;
  isOutermostCompletedAtStep: (stepIndex: number) => boolean;
}

/**
 * Parses Java code to extract loops, their nesting depth, boundaries, and associated variables.
 */
export function analyzeLoops(code: string = "", trace: TraceStep[] = []): LoopAnalysisResult {
  const lines = code ? code.split("\n") : [];
  const loops: LoopScope[] = [];
  const stack: {
    id: string;
    type: "for" | "while" | "do-while";
    headerLine: number;
    startLine: number;
    depth: number;
    parentId: string | null;
    variableNames: string[];
    conditionExpr?: string;
  }[] = [];

  let loopCounter = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const lineText = lines[lineIdx].trim();

    // Check for for or while loop headers
    const forMatch = lineText.match(/\bfor\s*\(([^;]*);([^;]*);([^)]*)\)/);
    const whileMatch = lineText.match(/\bwhile\s*\(([^)]+)\)/);

    let foundLoop: { type: "for" | "while"; varNames: string[]; condExpr?: string } | null = null;

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

    // Track closing braces for loops
    const openBraces = (lineText.match(/\{/g) || []).length;
    const closeBraces = (lineText.match(/\}/g) || []).length;

    if (closeBraces > openBraces && stack.length > 0) {
      const diff = closeBraces - openBraces;
      for (let d = 0; d < diff && stack.length > 0; d++) {
        const closed = stack.pop()!;
        loops.push({
          ...closed,
          endLine: lineNum
        });
      }
    }
  }

  // Close any unclosed loops
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    loops.push({
      ...unclosed,
      endLine: lines.length
    });
  }

  loops.sort((a, b) => a.depth - b.depth || a.startLine - b.startLine);

  const outermostLoop = loops.find((l) => l.depth === 1) || null;

  // Build line-to-loop mapping: deepest enclosing loop for each line
  const loopByLine = new Map<number, LoopScope>();
  for (let l = 1; l <= lines.length; l++) {
    const matching = loops
      .filter((loop) => l >= loop.startLine && l <= loop.endLine)
      .sort((a, b) => b.depth - a.depth);
    if (matching.length > 0) {
      loopByLine.set(l, matching[0]);
    }
  }

  // Analyze trace step events
  const stepEvents = new Map<number, StepEventInfo>();

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

    let continueTarget: LoopScope | undefined = undefined;
    let continueTargetVar: string | undefined = undefined;
    if (isContinue && enclosingLoop) {
      continueTarget = enclosingLoop;
      continueTargetVar = enclosingLoop.variableNames[0];
    }

    let isLoopTermination = false;
    let terminatedLoop: LoopScope | undefined = undefined;
    let terminatedVars: string[] = [];

    if (isBreak && enclosingLoop) {
      isLoopTermination = true;
      terminatedLoop = enclosingLoop;
      // Terminated vars are vars belonging to this loop that do not belong to an outer loop
      const parentLoop = loops.find((l) => l.id === enclosingLoop.parentId);
      const parentVars = new Set(parentLoop?.variableNames || []);
      terminatedVars = enclosingLoop.variableNames.filter((v) => !parentVars.has(v));
    } else if (enclosingLoop && currStep.line === enclosingLoop.headerLine && nextStep) {
      // Current step is at loop header/condition.
      // If next step is outside this loop, condition evaluated to false!
      if (nextStep.line < enclosingLoop.startLine || nextStep.line > enclosingLoop.endLine) {
        isLoopTermination = true;
        terminatedLoop = enclosingLoop;
        const parentLoop = loops.find((l) => l.id === enclosingLoop.parentId);
        const parentVars = new Set(parentLoop?.variableNames || []);
        terminatedVars = enclosingLoop.variableNames.filter((v) => !parentVars.has(v));
      }
    } else if (nextStep && enclosingLoop) {
      // Check if variable belonging to this loop disappeared from locals
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

  const isOutermostCompletedAtStep = (stepIndex: number): boolean => {
    if (!outermostLoop || firstOutermostStepIdx === -1 || lastOutermostStepIdx === -1) {
      return false;
    }
    // Outermost loop completed if current step is strictly after the last step inside outermost loop
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
