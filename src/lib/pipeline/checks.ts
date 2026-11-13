import type { DemoSpec, Design, RequirementsReport } from "../schemas";

export interface DesignChecks {
  componentCount: number;
  /** Component refers to a requirement id that does not exist */
  danglingRefs: { component: string; ref: string }[];
  /** "must" requirements (other than metrics) that no component satisfies */
  uncoveredMust: string[];
  mermaidLooksValid: boolean;
  /** Savings drivers whose low <= likely <= high does not hold */
  unorderedDrivers: string[];
}

export function checkDesign(report: RequirementsReport, design: Design): DesignChecks {
  const ids = new Set(report.requirements.map((r) => r.id));
  const danglingRefs: DesignChecks["danglingRefs"] = [];
  const covered = new Set<string>();
  for (const c of design.components) {
    for (const ref of c.satisfies) {
      if (ids.has(ref)) covered.add(ref);
      else danglingRefs.push({ component: c.id, ref });
    }
  }
  const uncoveredMust = report.requirements
    .filter((r) => r.priority === "must" && r.type !== "success_metric" && !covered.has(r.id))
    .map((r) => r.id);

  return {
    componentCount: design.components.length,
    danglingRefs,
    uncoveredMust,
    mermaidLooksValid: /^\s*(flowchart|graph)\s+(LR|TD|TB|RL|BT)\b/i.test(design.mermaid_diagram),
    unorderedDrivers: design.savings_drivers
      .filter((d) => !(d.minutes_saved_low <= d.minutes_saved_likely && d.minutes_saved_likely <= d.minutes_saved_high))
      .map((d) => d.name),
  };
}

/**
 * The model labels where each number came from, and it can get that wrong. This overrides the label by
 * rule: a volume is "stated" only if it equals a number in the requirements report's stated_metrics.
 */
export function reconcileDrivers(
  report: RequirementsReport,
  design: Design,
): { design: Design; fixed: string[] } {
  const stated = new Set(
    report.stated_metrics.map((m) => m.value).filter((v): v is number => v !== null),
  );
  const fixed: string[] = [];
  const drivers = design.savings_drivers.map((d) => {
    if (d.items_per_month === null) return d;
    const expected: "stated" | "assumed" = stated.has(d.items_per_month) ? "stated" : "assumed";
    if (d.volume_source === expected) return d;
    fixed.push(`${d.name}: volume ${d.volume_source} -> ${expected}`);
    return { ...d, volume_source: expected };
  });
  return { design: { ...design, savings_drivers: drivers }, fixed };
}

export interface DemoChecks {
  screenCount: number;
  primaryIsHex: boolean;
  /** Blocks where a row has a different number of cells than columns */
  raggedBlocks: string[];
}

export function checkDemo(demo: DemoSpec): DemoChecks {
  const raggedBlocks: string[] = [];
  for (const s of demo.screens) {
    for (const b of s.blocks) {
      if (b.rows.some((r) => r.length !== b.columns.length)) raggedBlocks.push(`${s.id}: ${b.title}`);
    }
  }
  return {
    screenCount: demo.screens.length,
    primaryIsHex: /^#[0-9a-fA-F]{6}$/.test(demo.theme.primary),
    raggedBlocks,
  };
}
