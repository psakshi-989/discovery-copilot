import type { LLMProvider } from "../providers/types";
import { estimate, DEFAULT_CONFIG, type EstimateConfig } from "../estimate";
import { extractRequirements } from "./extract";
import { designArchitecture } from "./design";
import { buildDemoSpec } from "./demo";
import { checkDesign, checkDemo, reconcileDrivers } from "./checks";

export interface PipelineOptions {
  /** Pause between stages, to stay under free-tier tokens-per-minute limits. */
  pauseMs?: number;
  log?: (message: string) => void;
  config?: EstimateConfig;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runPipeline(provider: LLMProvider, transcript: string, opts: PipelineOptions = {}) {
  const log = opts.log ?? (() => {});
  const pause = async () => {
    if (opts.pauseMs && opts.pauseMs > 0) {
      log(`  pausing ${Math.round(opts.pauseMs / 1000)}s to respect rate limits`);
      await sleep(opts.pauseMs);
    }
  };

  log("Stage 1/3: extracting requirements");
  const extraction = await extractRequirements(provider, transcript);
  await pause();

  log("Stage 2/3: designing architecture");
  const rawDesign = await designArchitecture(provider, extraction.report);
  const reconciled = reconcileDrivers(extraction.report, rawDesign.data);
  const design = { ...rawDesign, data: reconciled.design };
  const designChecks = checkDesign(extraction.report, design.data);
  const estimateResult = estimate(design.data, opts.config ?? DEFAULT_CONFIG);
  await pause();

  log("Stage 3/3: building demo spec");
  const demo = await buildDemoSpec(provider, extraction.report, design.data);
  const demoChecks = checkDemo(demo.data);

  const stages = [extraction.meta, design, demo];
  return {
    provider: provider.name,
    model: provider.model,
    extraction,
    design: { data: design.data, meta: stripData(design) },
    designChecks,
    driverSourceFixes: reconciled.fixed,
    estimate: estimateResult,
    demo: { data: demo.data, meta: stripData(demo) },
    demoChecks,
    totals: {
      latencyMs: stages.reduce((s, m) => s + m.latencyMs, 0),
      inputTokens: stages.reduce((s, m) => s + m.usage.inputTokens, 0),
      outputTokens: stages.reduce((s, m) => s + m.usage.outputTokens, 0),
      repairsNeeded: stages.filter((m) => m.attempts > 1).length,
    },
  };
}

function stripData<T extends { data: unknown }>(r: T) {
  const { data: _data, ...meta } = r;
  return meta;
}

export type PipelineResult = Awaited<ReturnType<typeof runPipeline>>;
