import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createProvider } from "../src/lib/providers";
import { runPipeline, type PipelineResult } from "../src/lib/pipeline/run";
import { Truth } from "../src/lib/eval/truth";
import { judgeCase } from "../src/lib/eval/judge";
import { scoreCase, aggregate, type CaseScore } from "../src/lib/eval/score";

// Usage: npm run eval                  (all cases in eval/cases)
//        npm run eval -- streaming-ops (one case)
// Env:   EVAL_REPEATS=1  STAGE_PAUSE_MS=20000  JUDGE_PROVIDER  JUDGE_MODEL
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const pauseMs = Number(process.env.STAGE_PAUSE_MS ?? 20000);
const repeats = Number(process.env.EVAL_REPEATS ?? 1);
const only = process.argv[2];

/** The judge can fail on a bad day. Retry it, so a judge hiccup never throws away a finished pipeline run. */
async function judgeWithRetry(...args: Parameters<typeof judgeCase>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await judgeCase(...args);
    } catch (e) {
      lastError = e;
      console.error(`  judge attempt ${attempt}/3 failed: ${String(e)}`);
      if (attempt < 3) await sleep(30_000);
    }
  }
  throw lastError;
}

const provider = await createProvider();
const judgeName = process.env.JUDGE_PROVIDER ?? provider.name;
const judgeModel = process.env.JUDGE_MODEL ?? (judgeName === "groq" ? "qwen/qwen3.8-27b" : undefined);
const judge = await createProvider(judgeName, judgeModel);
if (judge.name === provider.name && judge.model === provider.model) {
  console.error("WARNING: the judge is the same model as the generator. Scores will be biased upwards.");
}
console.error(`Generator: ${provider.name} (${provider.model}) | Judge: ${judge.name} (${judge.model}) | repeats: ${repeats}`);

const dir = "eval/cases";
const names = readdirSync(dir)
  .filter((f) => f.endsWith(".truth.json"))
  .map((f) => f.replace(/\.truth\.json$/, ""))
  .filter((n) => !only || n === only);
if (names.length === 0) {
  console.error(`No *.truth.json files found in ${dir}`);
  process.exit(1);
}

mkdirSync("eval/results", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = `eval/results/${provider.name}_${provider.model.replace(/[^a-z0-9]+/gi, "-")}_${stamp}.json`;

const pct = (n: number | null) => (n === null ? "n/a" : `${Math.round(n * 100)}%`);
const runs: Record<string, unknown>[] = [];
const scores: CaseScore[] = [];
const byCase = new Map<string, CaseScore[]>();
let consecutiveFailures = 0;

outer: for (const name of names) {
  const truth = Truth.parse(JSON.parse(readFileSync(`${dir}/${name}.truth.json`, "utf8")));
  const transcriptPath = existsSync(`${dir}/${name}.txt`) ? `${dir}/${name}.txt` : `samples/${name}.txt`;
  const transcript = readFileSync(transcriptPath, "utf8");

  for (let i = 1; i <= repeats; i++) {
    console.error(`\n[${name} #${i}] running pipeline`);
    let result: PipelineResult | undefined;
    try {
      result = await runPipeline(provider, transcript, { pauseMs, log: (m) => console.error(m) });
      await sleep(pauseMs);
      console.error("  judging");
      const judged = await judgeWithRetry(judge, transcript, truth, result);
      const score = scoreCase(truth, judged.data, result);
      scores.push(score);
      byCase.set(name, [...(byCase.get(name) ?? []), score]);
      runs.push({ case: name, repeat: i, score, judged: judged.data, result });
      consecutiveFailures = 0;
      console.error(
        `  recall ${pct(score.weightedRecall)} | flags ${pct(score.flagRecall)} | traps hit ${score.trapHits}/${score.trapCount} | unsupported ${score.unsupportedClaims}/${score.requirementCount} | design issues ${score.designIssues} | quotes ${pct(score.evidenceRate)} | estimate overlaps key: ${score.estimateOverlaps}`,
      );
    } catch (e) {
      // Keep the finished pipeline output so it is not lost when only the judge failed.
      runs.push({ case: name, repeat: i, error: String(e), result });
      console.error(`  FAILED: ${String(e)}`);
      consecutiveFailures++;
    }
    writeFileSync(outPath, JSON.stringify({ provider: provider.name, model: provider.model, judge: judge.model, runs }, null, 2));
    if (consecutiveFailures >= 2) {
      console.error("\nStopping: two runs in a row failed. Fix the error above before spending more tokens.");
      break outer;
    }
    await sleep(pauseMs);
  }
}

const agg = aggregate(scores);
const perCase: Record<string, ReturnType<typeof aggregate>> = {};
for (const [name, s] of byCase) perCase[name] = aggregate(s);
writeFileSync(
  outPath,
  JSON.stringify({ provider: provider.name, model: provider.model, judge: judge.model, aggregate: agg, perCase, runs }, null, 2),
);

console.error("\n=== PER CASE ===");
for (const [name, s] of byCase) {
  const a = perCase[name];
  const recalls = s.map((x) => x.weightedRecall);
  const range = s.length > 1 ? ` (range ${pct(Math.min(...recalls))}-${pct(Math.max(...recalls))})` : "";
  console.error(
    `${name}: ${s.length} run(s) | recall ${pct(a.weightedRecall)}${range} | flags ${pct(a.flagRecall)} | trap hits ${pct(a.trapHitRate)} | unsupported ${pct(a.unsupportedRate)} | design issues ${a.meanDesignIssues.toFixed(1)}`,
  );
}

console.error("\n=== AGGREGATE ===");
console.error(`runs scored: ${agg.runs} of ${runs.length}`);
console.error(`weighted recall: ${pct(agg.weightedRecall)} | flag recall: ${pct(agg.flagRecall)}`);
console.error(`trap hit rate: ${pct(agg.trapHitRate)} | unsupported requirements: ${pct(agg.unsupportedRate)} | invented design facts per run: ${agg.meanDesignIssues.toFixed(1)}`);
console.error(`quotes verified: ${pct(agg.evidenceRate)} | estimate overlaps key: ${pct(agg.estimateOverlapRate)} | likely inside key: ${pct(agg.likelyInsideRate)}`);
console.error(`runs with uncovered must-haves: ${agg.runsWithUncoveredMust} | runs needing repair: ${agg.runsNeedingRepair}`);
console.error(`mean latency: ${agg.meanLatencyMs}ms | mean tokens/run: ${agg.meanTokens} | judge gaps: ${agg.judgeGaps}`);
console.error(`saved: ${outPath}`);
