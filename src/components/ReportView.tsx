"use client";

import { useCallback, useMemo, useState } from "react";
import type { RunView } from "@/lib/runView";
import { evidenceItems } from "@/lib/runView";
import { percent } from "@/lib/format";
import { Transcript } from "./Transcript";
import { RequirementList } from "./RequirementList";
import { Architecture } from "./Architecture";
import { EstimateCard } from "./EstimateCard";

export function ReportView({ run }: { run: RunView }) {
  const { result } = run;
  const report = result.extraction.report;
  const items = useMemo(() => evidenceItems(result), [result]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? selected;

  const select = useCallback((id: string) => {
    setSelected((cur) => (cur === id ? null : id));
    const el = document.querySelector(`.paper mark[data-ids~="${id}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const quotes = result.extraction.evidence;
  const verifiedNote =
    quotes && typeof quotes.total === "number"
      ? `${quotes.valid} of ${quotes.total} quotes were found word for word in the transcript.`
      : null;

  return (
    <div className="wrap section">
      <p className="muted small">
        {run.isExample ? "Example run" : "Your run"} · {new Date(run.createdAt).toISOString().slice(0, 10)} · model {result.model}
      </p>
      <h1 style={{ margin: "6px 0 10px" }}>{report.customer.name}</h1>
      <p style={{ maxWidth: "46em" }}>{report.customer.summary}</p>
      <div className="row" style={{ margin: "10px 0 28px" }}>
        <span className="badge">{report.customer.industry}</span>
        {run.evalBadge && (
          <span className="badge" title="Scored against a hand-written answer key">
            Scored: {percent(run.evalBadge.weightedRecall)} of the key's requirements captured
          </span>
        )}
        <a className="btn" href={`/runs/${run.id}/demo`}>Open the demo</a>
      </div>

      <div className="report">
        <div className="sticky">
          <h2 style={{ marginBottom: 10 }}>The call</h2>
          <Transcript transcript={run.transcript} items={items} activeId={active} onPick={select} />
        </div>
        <div className="stack">
          <section>
            <h2 style={{ marginBottom: 6 }}>Requirements</h2>
            <p className="muted small">Hover or select one to see the customer's words highlighted on the left.</p>
            {verifiedNote && <p className="note note--ok small">{verifiedNote}</p>}
            <RequirementList
              requirements={report.requirements}
              activeId={active}
              selectedId={selected}
              onHover={setHovered}
              onSelect={select}
            />
          </section>

          {report.risks.length > 0 && (
            <section className="panel">
              <h2>Risks</h2>
              <ul>{report.risks.map((r, i) => <li key={i}><b>{r.severity}:</b> {r.risk}</li>)}</ul>
            </section>
          )}
          {report.open_questions.length > 0 && (
            <section className="panel">
              <h2>Questions to ask next</h2>
              <ul>{report.open_questions.map((q, i) => <li key={i}>{q.question} <span className="muted">{q.why_it_matters}</span></li>)}</ul>
            </section>
          )}
        </div>
      </div>

      <section className="section">
        <h2 style={{ marginBottom: 12 }}>Proposed architecture</h2>
        <Architecture design={result.design.data} />
      </section>
      <section>
        <h2 style={{ marginBottom: 12 }}>Effort and return</h2>
        <EstimateCard estimate={result.estimate} design={result.design.data} />
      </section>
    </div>
  );
}
