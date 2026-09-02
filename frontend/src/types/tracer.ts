export interface TraceStep {
  step: number;
  line: number;
  column?: number;
  locals: Record<string, any>;
  callStack: string[];
  stdout?: string;
}

export interface TraceResponse {
  status: 'success' | 'error';
  trace: TraceStep[];
  error?: string | null;
  stdout?: string;
}

export interface CodeRequest {
  code: string;
  language?: string;
}

export interface AlgorithmPreset {
  id: string;
  name: string;
  code: string;
  fallbackTrace: TraceStep[];
}
