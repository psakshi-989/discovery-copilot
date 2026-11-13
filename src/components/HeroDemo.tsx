"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Transcript } from "./Transcript";
import type { EvidenceItem } from "@/lib/runView";

interface Props {
  transcript: string;
  requirements: { id: string; statement: string; quote: string }[];
}

/** A small live version of the main feature for the home page. */
export function HeroDemo({ transcript, requirements }: Props) {
  const [active, setActive] = useState<string | null>(requirements[0]?.id ?? null);
  const items: EvidenceItem[] = useMemo(() => requirements.map((r) => ({ id: r.id, quote: r.quote })), [requirements]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const paper = box.current?.querySelector<HTMLElement>(".paper");
    const mark = active ? paper?.querySelector<HTMLElement>(`mark[data-ids~="${active}"]`) : null;
    if (paper && mark) paper.scrollTo({ top: Math.max(0, mark.offsetTop - 60), behavior: "smooth" });
  }, [active]);
  return (
    <div className="hero-demo" ref={box}>
      <Transcript transcript={transcript} items={items} activeId={active} label="Example call" />
      <ul>
        {requirements.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="req"
              aria-pressed={active === r.id}
              onMouseEnter={() => setActive(r.id)}
              onFocus={() => setActive(r.id)}
            >
              <span className="req-id">{r.id}</span> <span>{r.statement}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
