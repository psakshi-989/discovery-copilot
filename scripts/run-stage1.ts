import { readFileSync } from "node:fs";
import { createProvider } from "../src/lib/providers";
import { extractRequirements } from "../src/lib/pipeline/extract";

// Usage: npm run stage1 -- samples/streaming-ops.txt
const file = process.argv[2] ?? "samples/streaming-ops.txt";
const transcript = readFileSync(file, "utf8");

const provider = await createProvider();
console.error(`Provider: ${provider.name} (${provider.model}) | transcript: ${file}`);

const { report, evidence, meta } = await extractRequirements(provider, transcript);

console.log(JSON.stringify(report, null, 2));
console.error("\n--- run summary ---");
console.error(`requirements: ${report.requirements.length}`);
console.error(
  `evidence quotes verified: ${evidence.valid}/${evidence.total} (${(evidence.rate * 100).toFixed(0)}%)`,
);
for (const bad of evidence.invalid) console.error(`  NOT FOUND [${bad.id}]: "${bad.quote}"`);
console.error(`attempts: ${meta.attempts} | latency: ${meta.latencyMs}ms`);
console.error(`tokens in/out: ${meta.usage.inputTokens}/${meta.usage.outputTokens}`);
