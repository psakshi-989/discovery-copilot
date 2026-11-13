import type { Truth } from "./truth";
import type { JudgeResult } from "./judge";
import type { PipelineResult } from "../pipeline/run";

const CREDIT = { captured: 1, partial: 0.5, missed: 0 } as const;

export interface CaseScore {
  /** Weighted share of must_capture items captured (partial counts half). 0..1 */
  weightedRecall: number;
  /** Share of must_flag items captured. null when the key has none */
  flagRecall: number | null;
  trapHits: number;
  trapCount: number;
  unsupportedClaims: number;
  /** Facts the architecture asserts about the customer that the transcript never stated */
  designIssues: number;
  requirementCount: number;
  /** Share of evidence quotes found verbatim in the transcript. 0..1 */
  evidenceRate: number;
  /** The model's low-high effort range overlaps your hand estimate */
  estimateOverlaps: boolean;
  /** The model's "likely" effort falls inside your hand estimate */
  likelyInside: boolean;
  uncoveredMust: number;
  repairs: number;
  latencyMs: number;
  tokens: number;
  /** Items the judge skipped (counted as missed) */
  judgeGaps: number;
}

export function scoreCase(truth: Truth, judged: JudgeResult, result: PipelineResult): CaseScore {
  const byId = new Map(judged.capture.map((c) => [c.id, c.status]));
  let gaps = 0;
  let earned = 0;
  let total = 0;
  for (const m of truth.must_capture) {
    const status = byId.get(m.id);
    if (!status) gaps++;
    earned += m.weight * CREDIT[status ?? "missed"];
    total += m.weight;
  }

  const flagByIndex = new Map(judged.flags.map((f) => [f.index, f.status]));
  let flagEarned = 0;
  truth.must_flag.forEach((_, i) => {
    const status = flagByIndex.get(i);
    if (!status) gaps++;
    flagEarned += CREDIT[status ?? "missed"];
  });

  const trapByIndex = new Map(judged.traps.map((t) => [t.index, t.asserted]));
  let trapHits = 0;
  truth.traps.forEach((_, i) => {
    const asserted = trapByIndex.get(i);
    if (asserted === undefined) gaps++;
    if (asserted) trapHits++;
  });

  const est = result.estimate.effortDays;
  const key = truth.hand_estimate_days;
  const stages = [result.extraction.meta, result.design.meta, result.demo.meta];

  return {
    weightedRecall: total === 0 ? 0 : earned / total,
    flagRecall: truth.must_flag.length === 0 ? null : flagEarned / truth.must_flag.length,
    trapHits,
    trapCount: truth.traps.length,
    // Only claims about requirements (R1, R2...) count here; architecture problems are designIssues.
    unsupportedClaims: judged.unsupported_claims.filter((c) => /^R\d+$/i.test(c.ref.trim())).length,
    designIssues: judged.design_issues.length,
    requirementCount: result.extraction.report.requirements.length,
    evidenceRate: result.extraction.evidence.rate,
    estimateOverlaps: est.low <= key.high && est.high >= key.low,
    likelyInside: est.likely >= key.low && est.likely <= key.high,
    uncoveredMust: result.designChecks.uncoveredMust.length,
    repairs: stages.filter((m) => m.attempts > 1).length,
    latencyMs: result.totals.latencyMs,
    tokens: result.totals.inputTokens + result.totals.outputTokens,
    judgeGaps: gaps,
  };
}

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export interface Aggregate {
  runs: number;
  weightedRecall: number;
  flagRecall: number | null;
  trapHitRate: number;
  unsupportedRate: number;
  meanDesignIssues: number;
  evidenceRate: number;
  estimateOverlapRate: number;
  likelyInsideRate: number;
  runsWithUncoveredMust: number;
  runsNeedingRepair: number;
  meanLatencyMs: number;
  meanTokens: number;
  judgeGaps: number;
}

export function aggregate(scores: CaseScore[]): Aggregate {
  const flags = scores.map((s) => s.flagRecall).filter((v): v is number => v !== null);
  const traps = scores.reduce((a, s) => a + s.trapCount, 0);
  const hits = scores.reduce((a, s) => a + s.trapHits, 0);
  return {
    runs: scores.length,
    weightedRecall: mean(scores.map((s) => s.weightedRecall)),
    flagRecall: flags.length === 0 ? null : mean(flags),
    trapHitRate: traps === 0 ? 0 : hits / traps,
    unsupportedRate: mean(scores.map((s) => (s.requirementCount === 0 ? 0 : s.unsupportedClaims / s.requirementCount))),
    meanDesignIssues: mean(scores.map((s) => s.designIssues)),
    evidenceRate: mean(scores.map((s) => s.evidenceRate)),
    estimateOverlapRate: mean(scores.map((s) => (s.estimateOverlaps ? 1 : 0))),
    likelyInsideRate: mean(scores.map((s) => (s.likelyInside ? 1 : 0))),
    runsWithUncoveredMust: scores.filter((s) => s.uncoveredMust > 0).length,
    runsNeedingRepair: scores.filter((s) => s.repairs > 0).length,
    meanLatencyMs: Math.round(mean(scores.map((s) => s.latencyMs))),
    meanTokens: Math.round(mean(scores.map((s) => s.tokens))),
    judgeGaps: scores.reduce((a, s) => a + s.judgeGaps, 0),
  };
}
