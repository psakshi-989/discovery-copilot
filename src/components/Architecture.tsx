"use client";

import { useEffect, useRef, useState } from "react";
import type { Design } from "@/lib/schemas";
import { SIZE_DAYS } from "@/lib/estimate";

function DiagramView({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const { svg } = await mermaid.render(`m${Math.random().toString(36).slice(2, 9)}`, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (failed) {
    return (
      <div>
        <p className="muted small">The diagram could not be drawn. Here is its source:</p>
        <pre className="diagram small">{code}</pre>
      </div>
    );
  }
  return <div className="diagram" ref={ref} role="img" aria-label="Architecture diagram">Drawing diagram…</div>;
}

export function Architecture({ design }: { design: Design }) {
  const assumptions = design.assumptions ?? [];
  return (
    <div className="stack-sm">
      <DiagramView code={design.mermaid_diagram} />
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>Component</th><th>Technology</th><th>Approach</th><th>Covers</th><th className="num">Size</th></tr>
          </thead>
          <tbody>
            {design.components.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b><br /><span className="muted small">{c.responsibility}</span></td>
                <td>{c.tech}</td>
                <td>{c.build_or_buy}</td>
                <td>{c.satisfies.join(", ")}</td>
                <td className="num" title={c.size_rationale}>
                  {c.size} ({SIZE_DAYS[c.size].low}–{SIZE_DAYS[c.size].high} days)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {design.integrations.length > 0 && (
        <>
          <h3>Integrations</h3>
          <div className="tablewrap">
            <table>
              <thead><tr><th>System</th><th>How</th><th>Risk</th></tr></thead>
              <tbody>
                {design.integrations.map((i, n) => (
                  <tr key={n}><td>{i.system}</td><td>{i.method}</td><td>{i.risk}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {design.tradeoffs.length > 0 && (
        <>
          <h3>Decisions and trade-offs</h3>
          <ul>
            {design.tradeoffs.map((t, n) => (
              <li key={n}><b>{t.decision}</b> instead of {t.alternative}. {t.reason}</li>
            ))}
          </ul>
        </>
      )}
      {assumptions.length > 0 && (
        <>
          <h3>Assumptions the customer has not confirmed</h3>
          <ul>{assumptions.map((a, n) => <li key={n}>{a}</li>)}</ul>
        </>
      )}
    </div>
  );
}
