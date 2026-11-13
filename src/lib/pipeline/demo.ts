import { DemoSpec, type Design, type RequirementsReport } from "../schemas";
import type { LLMProvider, StructuredResult } from "../providers/types";

export const DEMO_SYSTEM = `You design a clickable product prototype that a solutions engineer can show a customer in a follow-up meeting. You receive the customer's requirements and the proposed architecture, and you call the provided tool exactly once with a prototype specification.

Rules:
1. 3 or 4 screens, each with 1 to 3 blocks. Cover the customer's most important needs first (the "must" requirements), including any dashboard they asked for.
2. Block types and how to fill them: stat_row (columns = stat labels, one row of values); table (columns = headers, rows = records); form (columns = field labels, one row of example values); chart (exactly 2 columns, [category label, value label], one row per category with the number as text); kanban (columns = lane names, each row holds one card title per lane, using an empty string where a lane has no card); timeline (2 columns, [step, status], one row per step); card_grid (columns = field labels, one row per card).
3. Sample data must be realistic for the customer's industry and clearly fictional: invented titles, names and numbers. Never use real people or real brands.
4. At most 6 columns and 6 rows per block. Every row must have exactly as many entries as columns.
5. Use the customer's own vocabulary for labels. Show human approval steps wherever the requirements demand them. Only show process steps, systems and roles that appear in the requirements or architecture; do not invent extra steps such as legal sign-off.
6. Pick a primary colour as a 6-digit hex value and a tone that suits the customer's industry.`;

export function demoUserPrompt(report: RequirementsReport, design: Design): string {
  const payload = {
    customer: report.customer,
    requirements: report.requirements.map((r) => ({ id: r.id, statement: r.statement, priority: r.priority })),
    components: design.components.map((c) => ({ name: c.name, responsibility: c.responsibility })),
  };
  return `Context (JSON):\n${JSON.stringify(payload)}\n\nCall the tool with the prototype specification.`;
}

export async function buildDemoSpec(
  provider: LLMProvider,
  report: RequirementsReport,
  design: Design,
): Promise<StructuredResult<DemoSpec>> {
  return provider.generateStructured({
    system: DEMO_SYSTEM,
    user: demoUserPrompt(report, design),
    toolName: "submit_demo_spec",
    toolDescription: "Submit the prototype specification.",
    schema: DemoSpec,
    maxTokens: 5000,
  });
}
