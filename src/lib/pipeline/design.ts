import { Design, type RequirementsReport } from "../schemas";
import type { LLMProvider, StructuredResult } from "../providers/types";

export const DESIGN_SYSTEM = `You are a pragmatic solutions architect. You receive a structured requirements report from a customer discovery call and propose an architecture by calling the provided tool exactly once.

Rules:
1. Respect constraints. If the customer cannot replace a system, integrate with it.
2. Propose at most 8 components. Each component's "satisfies" list may only contain requirement ids that appear in the report. Every "must" requirement should be satisfied by at least one component.
3. Prefer simple, standard technology. Use "buy" or "integrate" where building would be wasteful. The customer's cloud provider, office suite and tooling are unknown unless the report names them: do not assume them. Prefer vendor-neutral descriptions (for example "managed image-resizing service", "workflow tool with email intake") and list every stack choice that depends on an unconfirmed assumption in the "assumptions" field.
4. Size each component honestly: S = a small, well-understood piece (about 2-4 days); M = a normal feature with some integration (5-10 days); L = a substantial subsystem or risky integration (10-20 days); XL = large, uncertain or multi-team work (20-40 days). Give a one-sentence size_rationale. Do not output day numbers.
5. integrations lists only external systems the customer actually mentioned.
6. mermaid_diagram must be valid Mermaid starting with "flowchart LR". Use simple node ids (A, B, C...) and plain-word labels in square brackets, with no parentheses, quotes or special characters. Maximum 12 nodes. Draw arrows in the order the work really flows (for example request, processing, approval, publish). Show the customer's existing systems as separate nodes. Every arrow must be a real handoff of data or approval, never just "related to".
7. Give 2-4 tradeoffs that an engineer would genuinely debate.
8. savings_drivers: one entry per place the solution saves human time. items_per_month must come only from numbers the customer stated, otherwise null. minutes_saved_* are your estimates: be conservative, keep low <= likely <= high, and mark minutes_source "assumed" unless the customer stated the time.
9. Every dashboard or report component must have a data source. If no component stores the workflow state it needs to display, add one.
10. Each savings driver must be causally linked to a component you proposed. Do not claim a benefit the component cannot deliver (for example, normalising file formats does not reduce metadata corrections).
11. Do not invent a specific monetary price for any tool.`;

/** Compact view of Stage 1 output: keeps the prompt small for free-tier token limits. */
function summarize(report: RequirementsReport): string {
  return JSON.stringify({
    customer: report.customer,
    requirements: report.requirements.map((r) => ({
      id: r.id,
      type: r.type,
      statement: r.statement,
      priority: r.priority,
    })),
    stated_metrics: report.stated_metrics.map((m) => ({ name: m.name, value: m.value, unit: m.unit })),
    risks: report.risks.map((r) => r.risk),
    open_questions: report.open_questions.map((q) => q.question),
  });
}

export function designUserPrompt(report: RequirementsReport): string {
  return `Requirements report (JSON):\n${summarize(report)}\n\nCall the tool with the proposed architecture.`;
}

export async function designArchitecture(
  provider: LLMProvider,
  report: RequirementsReport,
): Promise<StructuredResult<Design>> {
  return provider.generateStructured({
    system: DESIGN_SYSTEM,
    user: designUserPrompt(report),
    toolName: "submit_architecture",
    toolDescription: "Submit the proposed architecture, sizing and savings drivers.",
    schema: Design,
    maxTokens: 5000,
  });
}
