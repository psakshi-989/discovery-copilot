"use client";

import { useMemo } from "react";
import { buildSegments } from "@/lib/highlight";
import type { EvidenceItem } from "@/lib/runView";

interface Props {
  transcript: string;
  items: EvidenceItem[];
  activeId: string | null;
  onPick?: (id: string) => void;
  label?: string;
}

/** The call transcript with the customer's quoted words highlighted. */
export function Transcript({ transcript, items, activeId, onPick, label = "Call transcript" }: Props) {
  const { segments } = useMemo(() => buildSegments(transcript, items), [transcript, items]);
  return (
    <div className="paper" role="region" aria-label={label}>
      {segments.map((s, i) => {
        if (s.ids.length === 0) return <span key={i}>{s.text}</span>;
        const active = activeId !== null && s.ids.includes(activeId);
        return (
          <mark
            key={i}
            className={`ev${active ? " ev--active" : ""}`}
            data-ids={s.ids.join(" ")}
            tabIndex={onPick ? 0 : undefined}
            title={`Evidence for ${s.ids.join(", ")}`}
            onClick={onPick ? () => onPick(s.ids[0]) : undefined}
            onKeyDown={
              onPick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick(s.ids[0]);
                    }
                  }
                : undefined
            }
          >
            {s.text}
          </mark>
        );
      })}
    </div>
  );
}
