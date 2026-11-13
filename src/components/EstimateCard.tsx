import type { Estimate } from "@/lib/estimate";
import type { Design } from "@/lib/schemas";
import { money, monthsText, plain } from "@/lib/format";

export function EstimateCard({ estimate, design }: { estimate: Estimate; design: Design }) {
  const s = estimate.config.symbol;
  const range = (r: { low: number; high: number }, f: (n: number) => string) => `${f(r.low)} to ${f(r.high)}`;
  const caveats = estimate.caveats ?? [];
  return (
    <div className="stack-sm">
      <div className="kpis">
        <div className="kpi"><b>{range(estimate.effortDays, plain)} days</b><span>Build effort, likely {plain(estimate.effortDays.likely)}</span></div>
        <div className="kpi"><b>{range(estimate.buildCost, (n) => money(n, s))}</b><span>Build cost</span></div>
        <div className="kpi"><b>{range(estimate.annualSavings, (n) => money(n, s))}</b><span>Staff time saved per year</span></div>
        <div className="kpi">
          <b>{monthsText(estimate.paybackMonths.optimistic)} to {monthsText(estimate.paybackMonths.pessimistic)} months</b>
          <span>Payback, likely {monthsText(estimate.paybackMonths.likely)}</span>
        </div>
      </div>
      <p className="small muted">
        First-year net: {estimate.firstYearNet.pessimistic === null ? "n/a" : money(estimate.firstYearNet.pessimistic, s)} worst case,{" "}
        {estimate.firstYearNet.likely === null ? "n/a" : money(estimate.firstYearNet.likely, s)} likely,{" "}
        {estimate.firstYearNet.optimistic === null ? "n/a" : money(estimate.firstYearNet.optimistic, s)} best case.
        Rates: {s}{estimate.config.dayRate.toLocaleString("en-IN")} per build day, {s}{estimate.config.staffHourlyCost} per staff hour, {Math.round(estimate.config.contingency * 100)}% contingency.
      </p>
      <h3>Where the savings come from</h3>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Driver</th><th className="num">Per month</th><th className="num">Minutes saved (low / likely / high)</th><th>Volume</th><th>Minutes</th></tr></thead>
          <tbody>
            {design.savings_drivers.map((d, n) => (
              <tr key={n}>
                <td>{d.name}{estimate.skippedDrivers.includes(d.name) ? <span className="muted small"> (not counted: no volume given)</span> : null}</td>
                <td className="num">{d.items_per_month ?? "none given"}</td>
                <td className="num">{d.minutes_saved_low} / {d.minutes_saved_likely} / {d.minutes_saved_high}</td>
                <td>{d.volume_source}</td>
                <td>{d.minutes_source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caveats.length > 0 && (
        <div className="note">
          <b>Read before quoting these numbers</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{caveats.map((c, n) => <li key={n}>{c}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
