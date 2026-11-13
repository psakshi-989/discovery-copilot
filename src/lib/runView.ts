import type { PipelineResult } from "./pipeline/run";

export interface EvalBadge {
  weightedRecall: number;
  flagRecall: number | null;
}

/** Everything the report and demo pages need to show one finished run. */
export interface RunView {
  id: string;
  title: string;
  createdAt: string;
  transcript: string;
  result: PipelineResult;
  /** Set on example runs that were scored against an answer key. */
  evalBadge?: EvalBadge;
  isExample?: boolean;
}

export interface EvidenceItem {
  id: string;
  quote: string;
}

/** Every quote the system used to justify a requirement, tagged with the requirement id. */
export function evidenceItems(result: PipelineResult): EvidenceItem[] {
  return result.extraction.report.requirements.flatMap((r) =>
    r.evidence.map((e) => ({ id: r.id, quote: e.quote })),
  );
}
