import { z } from "zod";

/** A verbatim span from the transcript. Checked programmatically (see verifyEvidence). */
export const Evidence = z.object({
  quote: z.string().describe("Exact words copied from the transcript, no paraphrasing"),
});

export const Requirement = z.object({
  id: z.string().describe('Short id such as "R1"'),
  type: z.enum(["functional", "non_functional", "integration", "constraint", "success_metric"]),
  statement: z.string().describe("One clear sentence describing what the customer needs"),
  priority: z.enum(["must", "should", "could"]),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(Evidence).min(1),
});

/** Stage 1 output. Flat objects, enums and nullables only, so it ports to OpenAI strict mode. */
export const RequirementsReport = z.object({
  customer: z.object({
    name: z.string(),
    industry: z.string(),
    summary: z.string(),
  }),
  requirements: z.array(Requirement),
  stakeholders: z.array(
    z.object({ name: z.string(), role: z.string(), concern: z.string() }),
  ),
  stated_metrics: z.array(
    z.object({
      name: z.string(),
      value: z.number().nullable(),
      unit: z.string(),
      evidence: Evidence,
    }),
  ),
  open_questions: z.array(z.object({ question: z.string(), why_it_matters: z.string() })),
  risks: z.array(z.object({ risk: z.string(), severity: z.enum(["low", "medium", "high"]) })),
  assumptions: z.array(z.string()),
});

export type RequirementsReport = z.infer<typeof RequirementsReport>;

/* ---------------- Stage 2: architecture, sizing, savings drivers ---------------- */

export const Component = z.object({
  id: z.string().describe('Short id such as "C1"'),
  name: z.string(),
  responsibility: z.string(),
  tech: z.string().describe("Concrete technology or service, e.g. 'Next.js + Postgres'"),
  build_or_buy: z.enum(["build", "buy", "integrate"]),
  satisfies: z.array(z.string()).describe("Requirement ids this component delivers, e.g. ['R1','R3']"),
  size: z.enum(["S", "M", "L", "XL"]),
  size_rationale: z.string(),
});

export const SavingsDriver = z.object({
  name: z.string().describe("What work gets faster, e.g. 'Artwork resizing'"),
  items_per_month: z.number().nullable().describe("Volume per month. Only from numbers the customer stated, else null"),
  minutes_saved_low: z.number(),
  minutes_saved_likely: z.number(),
  minutes_saved_high: z.number(),
  volume_source: z.enum(["stated", "assumed"]),
  minutes_source: z.enum(["stated", "assumed"]),
  note: z.string(),
});

export const Design = z.object({
  components: z.array(Component),
  integrations: z.array(z.object({ system: z.string(), method: z.string(), risk: z.string() })),
  mermaid_diagram: z.string().describe("A Mermaid 'flowchart LR' diagram, max 12 nodes"),
  tradeoffs: z.array(z.object({ decision: z.string(), alternative: z.string(), reason: z.string() })),
  savings_drivers: z.array(SavingsDriver),
  assumptions: z
    .array(z.string())
    .describe("Stack or scope assumptions the customer has not confirmed, e.g. cloud provider, office suite, user count"),
});

export type Design = z.infer<typeof Design>;

/* ---------------- Stage 3: demo prototype spec ---------------- */

export const DemoBlock = z.object({
  type: z.enum(["stat_row", "table", "form", "chart", "kanban", "timeline", "card_grid"]),
  title: z.string(),
  columns: z.array(z.string()).describe("Column or field labels"),
  rows: z.array(z.array(z.string())).describe("Sample data rows, each the same length as columns"),
});

export const DemoSpec = z.object({
  app_name: z.string(),
  tagline: z.string(),
  theme: z.object({
    primary: z.string().describe("Hex colour such as #6D28D9"),
    tone: z.enum(["playful", "corporate", "minimal", "bold"]),
  }),
  screens: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      purpose: z.string(),
      blocks: z.array(DemoBlock),
    }),
  ),
});

export type DemoSpec = z.infer<typeof DemoSpec>;
