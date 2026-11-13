import { z } from "zod";
import type { LLMProvider, StructuredResult } from "../providers/types";
import type { PipelineResult } from "../pipeline/run";
import type { Truth } from "./truth";

const Status = z.enum(["captured", "partial", "missed"]);

export const JudgeResult = z.object({
  capture: z.array(
    z.object({
      id: z.string().describe("The must_capture id"),
      status: Status,
      matched_ref: z.string().describe('Best matching output ref such as "R4" or "risk:2", or "" if missed'),
      reason: z.string().describe("At most 20 words"),
    }),
  ),
  flags: z.array(
    z.object({ index: z.number(), status: Status, reason: z.string().describe("At most 20 words") }),
  ),
  traps: z.array(
    z.object({ index: z.number(), asserted: z.boolean(), reason: z.string().describe("At most 20 words") }),
  ),
  unsupported_claims: z.array(
    z.object({ ref: z.string().describe('Requirement id such as "R2"'), reason: z.string() }),
  ),
  design_issues: z.array(
    z.object({
      ref: z.string().describe('Component id such as "C2", or "integration", or "diagram"'),
      issue: z.string().describe("At most 20 words"),
    }),
  ),
});

export type JudgeResult = z.infer<typeof JudgeResult>;

export const JUDGE_SYSTEM = `You are a strict, fair evaluator of an AI system that turns customer discovery-call transcripts into requirements and an architecture. You are given the transcript, a human-written answer key and the system's output. Call the provided tool exactly once.

Rules:
1. For EVERY must_capture item, decide "captured" (the output clearly contains the same idea, wording may differ), "partial" (mentioned vaguely or only in part) or "missed". Look in requirements, risks, open_questions, assumptions and the architecture. Set matched_ref to the best matching id or ref, or "" if missed.
2. For EVERY must_flag item, decide captured, partial or missed. It counts as captured only if raised in risks or open_questions (or clearly in requirements).
3. For EVERY trap, set asserted = true only if the output states that fact as true, including in architecture choices or assumptions presented as fact. Raising it as a question, or listing it explicitly as an unconfirmed assumption, is not asserting it.
4. unsupported_claims: list requirements whose statement goes beyond the transcript or is not supported by its own quotes (inventing needs, turning a description of today's process into a request to automate it, quotes that do not support the claim). Be strict but fair. An empty list is fine. Only requirement ids (R1, R2...) belong here; problems in the architecture go in design_issues instead.
5. Judge each item independently. Do not give credit for effort or length. Keep every reason to 20 words or fewer.
6. Your output must contain one entry for every must_capture id, every must_flag index and every trap index.
7. design_issues: list facts the architecture or integrations assert about the customer's world that the transcript never stated (for example an authentication method, a cloud provider the customer already uses, or a user count presented as fact). Proposing a technology for a component the system will build is NOT an issue, as long as it is not presented as the customer's existing stack. An empty list is fine.`;

function compactOutput(r: PipelineResult) {
  const rep = r.extraction.report;
  return {
    customer_summary: rep.customer.summary,
    requirements: rep.requirements.map((q) => ({
      id: q.id,
      statement: q.statement,
      priority: q.priority,
      quotes: q.evidence.map((e) => e.quote),
    })),
    stated_metrics: rep.stated_metrics.map((m) => ({ name: m.name, value: m.value, unit: m.unit })),
    risks: rep.risks.map((x, i) => ({ ref: `risk:${i + 1}`, text: x.risk })),
    open_questions: rep.open_questions.map((x, i) => ({ ref: `question:${i + 1}`, text: x.question })),
    assumptions: rep.assumptions.map((x, i) => ({ ref: `assumption:${i + 1}`, text: x })),
    architecture: {
      components: r.design.data.components.map((c) => ({ id: c.id, name: c.name, tech: c.tech })),
      assumptions: r.design.data.assumptions,
      integrations: r.design.data.integrations,
    },
  };
}

export async function judgeCase(
  judge: LLMProvider,
  transcript: string,
  truth: Truth,
  result: PipelineResult,
): Promise<StructuredResult<JudgeResult>> {
  const payload = {
    transcript,
    answer_key: {
      must_capture: truth.must_capture.map((m) => ({ id: m.id, what: m.what })),
      must_flag: truth.must_flag.map((text, index) => ({ index, text })),
      traps: truth.traps.map((text, index) => ({ index, text })),
    },
    system_output: compactOutput(result),
  };
  return judge.generateStructured({
    system: JUDGE_SYSTEM,
    user: `${JSON.stringify(payload)}\n\nCall the tool with your evaluation.`,
    toolName: "submit_evaluation",
    toolDescription: "Submit the evaluation of the system output against the answer key.",
    schema: JudgeResult,
    maxTokens: 2500,
  });
}
