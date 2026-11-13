import type { Design } from "./schemas";

/** Editable assumptions. The defaults are placeholders: change them in one place. */
export interface EstimateConfig {
  currency: string;
  symbol: string;
  /** Cost of one build day (what you or a vendor would charge). */
  dayRate: number;
  /** Fully loaded hourly cost of the customer's staff whose time is saved. */
  staffHourlyCost: number;
  /** Extra effort added for integration surprises, reviews and testing (0.2 = 20%). */
  contingency: number;
}

export const DEFAULT_CONFIG: EstimateConfig = {
  currency: "INR",
  symbol: "₹",
  dayRate: 10000,
  staffHourlyCost: 600,
  contingency: 0.2,
};

export const SIZE_DAYS: Record<"S" | "M" | "L" | "XL", { low: number; high: number }> = {
  S: { low: 2, high: 4 },
  M: { low: 5, high: 10 },
  L: { low: 10, high: 20 },
  XL: { low: 20, high: 40 },
};

export interface Range {
  low: number;
  likely: number;
  high: number;
}

export interface Scenarios {
  pessimistic: number | null;
  likely: number | null;
  optimistic: number | null;
}

export interface Estimate {
  config: EstimateConfig;
  lines: { component: string; size: string; low: number; high: number }[];
  effortDays: Range;
  buildCost: Range;
  monthlyHoursSaved: Range;
  annualSavings: Range;
  /** pessimistic = low savings against high cost; optimistic = the reverse */
  firstYearNet: Scenarios;
  paybackMonths: Scenarios;
  quantifiedDrivers: string[];
  /** Drivers skipped because the customer gave no volume */
  skippedDrivers: string[];
  /** How many quantified drivers rely on an assumed volume or assumed minutes */
  assumedDriverCount: number;
  /** Things this estimate does not include or cannot claim. Always show these next to the numbers. */
  caveats: string[];
}

const round = (n: number, dp = 1): number => Math.round(n * 10 ** dp) / 10 ** dp;

export function estimate(design: Design, config: EstimateConfig = DEFAULT_CONFIG): Estimate {
  const lines = design.components.map((c) => ({
    component: c.name,
    size: c.size,
    low: SIZE_DAYS[c.size].low,
    high: SIZE_DAYS[c.size].high,
  }));
  const sumLow = lines.reduce((s, l) => s + l.low, 0);
  const sumHigh = lines.reduce((s, l) => s + l.high, 0);
  const k = 1 + config.contingency;

  const effortDays: Range = {
    low: round(sumLow),
    likely: round(((sumLow + sumHigh) / 2) * k),
    high: round(sumHigh * k),
  };
  const buildCost: Range = {
    low: Math.round(effortDays.low * config.dayRate),
    likely: Math.round(effortDays.likely * config.dayRate),
    high: Math.round(effortDays.high * config.dayRate),
  };

  let hLow = 0;
  let hLikely = 0;
  let hHigh = 0;
  let assumedDriverCount = 0;
  const quantifiedDrivers: string[] = [];
  const skippedDrivers: string[] = [];

  for (const d of design.savings_drivers) {
    if (d.items_per_month === null) {
      skippedDrivers.push(d.name);
      continue;
    }
    const hoursPerMinute = d.items_per_month / 60;
    hLow += hoursPerMinute * d.minutes_saved_low;
    hLikely += hoursPerMinute * d.minutes_saved_likely;
    hHigh += hoursPerMinute * d.minutes_saved_high;
    quantifiedDrivers.push(d.name);
    if (d.volume_source === "assumed" || d.minutes_source === "assumed") assumedDriverCount++;
  }

  const monthlyHoursSaved: Range = { low: round(hLow), likely: round(hLikely), high: round(hHigh) };
  const annualSavings: Range = {
    low: Math.round(hLow * config.staffHourlyCost * 12),
    likely: Math.round(hLikely * config.staffHourlyCost * 12),
    high: Math.round(hHigh * config.staffHourlyCost * 12),
  };

  const bought = design.components.filter((c) => c.build_or_buy !== "build").map((c) => c.name);
  const caveats: string[] = [];
  if (bought.length > 0) {
    caveats.push(
      `Build cost excludes recurring licence or hosting costs for ${bought.length} bought or integrated component(s): ${bought.join(", ")}.`,
    );
  }
  caveats.push("Savings count staff time only. The customer's cycle-time goal is not converted into money.");
  if (assumedDriverCount > 0) {
    caveats.push(`${assumedDriverCount} of ${quantifiedDrivers.length} savings drivers rely on assumed numbers.`);
  }

  const payback = (cost: number, annual: number): number | null =>
    annual > 0 ? round(cost / (annual / 12)) : null;

  return {
    config,
    lines,
    effortDays,
    buildCost,
    monthlyHoursSaved,
    annualSavings,
    firstYearNet: {
      pessimistic: annualSavings.low - buildCost.high,
      likely: annualSavings.likely - buildCost.likely,
      optimistic: annualSavings.high - buildCost.low,
    },
    paybackMonths: {
      pessimistic: payback(buildCost.high, annualSavings.low),
      likely: payback(buildCost.likely, annualSavings.likely),
      optimistic: payback(buildCost.low, annualSavings.high),
    },
    quantifiedDrivers,
    skippedDrivers,
    assumedDriverCount,
    caveats,
  };
}
