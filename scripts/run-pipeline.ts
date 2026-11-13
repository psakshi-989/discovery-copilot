import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { createProvider } from "../src/lib/providers";
import { runPipeline } from "../src/lib/pipeline/run";

// Usage: npm run pipeline -- samples/streaming-ops.txt
// Optional: STAGE_PAUSE_MS=20000 (default) pauses between stages for free-tier rate limits.
const file = process.argv[2] ?? "samples/streaming-ops.txt";
const transcript = readFileSync(file, "utf8");
const provider = await createProvider();
const pauseMs = Number(process.env.STAGE_PAUSE_MS ?? 20000);

console.error(`Provider: ${provider.name} (${provider.model}) | transcript: ${file}`);
const result = await runPipeline(provider, transcript, { pauseMs, log: (m) => console.error(m) });

mkdirSync("out", { recursive: true });
const outPath = `out/${basename(file).replace(/\.[^.]+$/, "")}.${provider.name}.json`;
writeFileSync(outPath, JSON.stringify(result, null, 2));

const { estimate: e, designChecks: dc, demoChecks: mc, extraction, totals } = result;
const money = (n: number | null) => (n === null ? "n/a" : `${e.config.symbol}${n.toLocaleString("en-IN")}`);

console.error("\n--- summary ---");
console.error(`requirements: ${extraction.report.requirements.length} | quotes verified: ${extraction.evidence.valid}/${extraction.evidence.total}`);
console.error(`components: ${dc.componentCount} | uncovered must-haves: ${dc.uncoveredMust.join(", ") || "none"} | dangling refs: ${dc.danglingRefs.length}`);
console.error(`effort: ${e.effortDays.low}-${e.effortDays.high} days (likely ${e.effortDays.likely})`);
console.error(`build cost: ${money(e.buildCost.low)} - ${money(e.buildCost.high)}`);
console.error(`annual savings: ${money(e.annualSavings.low)} - ${money(e.annualSavings.high)} (${e.assumedDriverCount}/${e.quantifiedDrivers.length} drivers use assumed numbers)`);
console.error(`payback (months): pessimistic ${e.paybackMonths.pessimistic ?? "n/a"} | likely ${e.paybackMonths.likely ?? "n/a"} | optimistic ${e.paybackMonths.optimistic ?? "n/a"}`);
for (const c of e.caveats) console.error(`note: ${c}`);
if (result.driverSourceFixes.length > 0) console.error(`corrected driver sources: ${result.driverSourceFixes.join("; ")}`);
console.error(`demo: ${mc.screenCount} screens | ragged blocks: ${mc.raggedBlocks.length} | colour ok: ${mc.primaryIsHex}`);
console.error(`tokens in/out: ${totals.inputTokens}/${totals.outputTokens} | repairs: ${totals.repairsNeeded} | latency: ${totals.latencyMs}ms`);
console.error(`saved: ${outPath}`);
