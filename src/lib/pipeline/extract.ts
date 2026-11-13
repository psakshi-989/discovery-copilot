import { RequirementsReport } from "../schemas";
import type { LLMProvider, StructuredResult } from "../providers/types";
import { EXTRACT_SYSTEM, extractUserPrompt } from "./prompts";
import { verifyEvidence, type EvidenceCheck } from "./verifyEvidence";

export interface ExtractionResult {
  report: RequirementsReport;
  evidence: EvidenceCheck;
  meta: Pick<StructuredResult<unknown>, "usage" | "latencyMs" | "model" | "attempts">;
}

/** Stage 1: transcript -> grounded requirements report. */
export async function extractRequirements(
  provider: LLMProvider,
  transcript: string,
): Promise<ExtractionResult> {
  const result = await provider.generateStructured({
    system: EXTRACT_SYSTEM,
    user: extractUserPrompt(transcript),
    toolName: "submit_requirements_report",
    toolDescription: "Submit the structured requirements report for this discovery call.",
    schema: RequirementsReport,
  });

  const report = result.data;
  const evidence = verifyEvidence(
    [
      ...report.requirements,
      ...report.stated_metrics.map((m) => ({ id: m.name, evidence: [m.evidence] })),
    ],
    transcript,
  );

  return {
    report,
    evidence,
    meta: {
      usage: result.usage,
      latencyMs: result.latencyMs,
      model: result.model,
      attempts: result.attempts,
    },
  };
}
