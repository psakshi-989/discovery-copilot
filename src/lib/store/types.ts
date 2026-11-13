import type { PipelineResult } from "../pipeline/run";

export type RunStatus = "running" | "complete" | "failed";

export interface RunRecord {
  id: string;
  createdAt: string;
  title: string;
  transcript: string;
  status: RunStatus;
  /** How many stages have finished: 0 to 3. */
  stage: number;
  error: string | null;
  /** One-way hash of the visitor's address, used only for the daily run limit. */
  ipHash: string | null;
  /** Filled in stage by stage; complete once stage 3 is done. */
  data: Partial<PipelineResult>;
}

export type RunPatch = Partial<Pick<RunRecord, "status" | "stage" | "error" | "data">>;

export interface RunStore {
  create(record: RunRecord): Promise<void>;
  get(id: string): Promise<RunRecord | null>;
  update(id: string, patch: RunPatch): Promise<void>;
  /** Runs created since the given time, optionally only from one visitor. */
  countSince(sinceIso: string, ipHash?: string): Promise<number>;
}
