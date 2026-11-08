"use client";

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
  memoryVariables?: any[];
  stepEvent?: any;
  loopAnalysis?: any;
  onBlockClick?: (index: number) => void;
  className?: string;
}

export interface BlockData {
  index: number;
  val: number;
  h: number;
  centerX: number;
  rotY?: number;
  theme: any;
}

export interface LoopInfo {
  hasLoop: boolean;
  isLoopLine: boolean;
  varName: string;
  varVal: number;
  op: string;
  nVal: number;
  rhsLimit: number | string;
  rhsVarName: string;
  rhsExpr: string;
  rhsSubstituted: string;
  isRhsArrayIndex: boolean;
  isPass: boolean;
}

