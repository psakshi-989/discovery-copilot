"use client";

import type { RequirementsReport } from "@/lib/schemas";

interface Props {
  requirements: RequirementsReport["requirements"];
  activeId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  functional: "Functional",
  non_functional: "Non-functional",
  integration: "Integration",
  constraint: "Constraint",
  success_metric: "Success metric",
};

export function RequirementList({ requirements, activeId, selectedId, onHover, onSelect }: Props) {
  return (
    <div className="stack-sm">
      {requirements.map((r) => (
        <button
          key={r.id}
          type="button"
          className="req"
          aria-pressed={selectedId === r.id}
          data-active={activeId === r.id}
          onMouseEnter={() => onHover(r.id)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(r.id)}
          onBlur={() => onHover(null)}
          onClick={() => onSelect(r.id)}
        >
          <span className="req-head">
            <span className="req-id">{r.id}</span>
            <span className={`tag${r.priority === "must" ? " tag--must" : ""}`}>{r.priority}</span>
            <span className="tag">{TYPE_LABEL[r.type] ?? r.type}</span>
            <span className={`tag${r.confidence === "low" ? " tag--low" : ""}`}>{r.confidence} confidence</span>
          </span>
          <span style={{ display: "block" }}>{r.statement}</span>
          {r.evidence.map((e, i) => (
            <span key={i} className="quote" style={{ display: "block" }}>“{e.quote}”</span>
          ))}
        </button>
      ))}
    </div>
  );
}
