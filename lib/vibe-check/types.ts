export type Verdict = "human" | "likely_human" | "likely_bot" | "bot";
export type SignalCategory = "automation" | "fingerprint" | "behavior";
export type SignalStatus = "pending" | "complete" | "error";

export interface SignalResult {
  id: string;
  rawValue: unknown;
  score: number;
  detail?: string;
  status: SignalStatus;
}

export interface SignalDefinition {
  id: string;
  name: string;
  description: string;
  category: SignalCategory;
  layer: 1 | 2 | 4;
  weight: number;
  collect: (prior?: SignalResult[]) => Promise<SignalResult> | SignalResult;
}

export interface LayerScore {
  layer: number;
  name: string;
  score: number;
  signals: SignalResult[];
}

export interface VibeCheckScorecard {
  version: "1.0";
  timestamp: string;
  userAgent: string;
  composite: number;
  verdict: Verdict;
  layers: LayerScore[];
}
