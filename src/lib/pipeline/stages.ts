import type { LLMProvider, StructuredResult } from "../providers/types";
import type { RunRecord } from "../store/types";
import type { PipelineResult } from "./run";
import { extractRequirements } from "./extract";
import { designArchitecture } from "./design";
import { buildDemoSpec } from "./demo";
import { checkDemo, checkDesign, reconcileDrivers } from "./checks";
import { DEFAULT_CONFIG, estimate } from "../estimate";

type Meta = Pick<StructuredResult<unknown>, "usage" | "latencyMs" | "model" | "attempts">;

const metaOf = (r: StructuredResult<unknown>): Meta => ({
  usage: r.usage,
  latencyMs: r.latencyMs,
  model: r.model,
  attempts: r.attempts,
});

/**
 * Runs ONE stage of the pipeline and returns the part of the result it produced.
 * The web app calls these one at a time so each request stays short enough for serverless hosting.
 * The command-line pipeline (run.ts) does the same work in a single call.
 */
export async function runStage(
  provider: LLMProvider,
  run: RunRecord,
  stage: 1 | 2 | 3,
): Promise<Partial<PipelineResult>> {
  if (stage === 1) {
    const extraction = await extractRequirements(provider, run.transcript);
    return { provider: provider.name, model: provider.model, extraction };
  }

  const extraction = run.data.extraction;
  if (!extraction) throw new Error("Stage 1 has not finished for this run.");

  if (stage === 2) {
    const raw = await designArchitecture(provider, extraction.report);
    const reconciled = reconcileDrivers(extraction.report, raw.data);
    return {
      design: { data: reconciled.design, meta: metaOf(raw) },
      designChecks: checkDesign(extraction.report, reconciled.design),
      driverSourceFixes: reconciled.fixed,
      estimate: estimate(reconciled.design, DEFAULT_CONFIG),
    };
  }

  const design = run.data.design;
  if (!design) throw new Error("Stage 2 has not finished for this run.");
  const demo = await buildDemoSpec(provider, extraction.report, design.data);
  const metas = [extraction.meta, design.meta, metaOf(demo)];
  return {
    demo: { data: demo.data, meta: metaOf(demo) },
    demoChecks: checkDemo(demo.data),
    totals: {
      latencyMs: metas.reduce((s, m) => s + m.latencyMs, 0),
      inputTokens: metas.reduce((s, m) => s + m.usage.inputTokens, 0),
      outputTokens: metas.reduce((s, m) => s + m.usage.outputTokens, 0),
      repairsNeeded: metas.filter((m) => m.attempts > 1).length,
    },
  };
}
