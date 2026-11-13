"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ExampleInput {
  id: string;
  title: string;
  transcript: string;
}

const STEPS = ["Reading the call and pulling out requirements", "Designing the architecture and estimate", "Building the demo"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function RunForm({ examples }: { examples: ExampleInput[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong. Try again.");
    return data;
  }

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const { id } = (await post("/api/runs", { transcript: text })) as { id: string };
      for (const stage of [1, 2, 3]) {
        setStep(stage);
        setWaiting(false);
        const r = await post(`/api/runs/${id}/step`, { stage });
        if (stage < 3) {
          setWaiting(true);
          await sleep(Number(r.waitMs ?? 15000));
        }
      }
      router.push(`/runs/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
      setStep(0);
      setWaiting(false);
    }
  }

  return (
    <div className="runform">
      <label htmlFor="transcript"><b>Customer call transcript</b></label>
      <textarea
        id="transcript"
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a call transcript here (300 to 12,000 characters)."
      />
      <div className="row">
        <button className="btn" type="button" disabled={busy || text.trim().length < 300} onClick={start}>
          {busy ? "Working…" : "Analyse this call"}
        </button>
        {examples.length > 0 && (
          <label className="small muted">
            Or start from an example{" "}
            <select
              disabled={busy}
              value=""
              onChange={(e) => {
                const ex = examples.find((x) => x.id === e.target.value);
                if (ex) setText(ex.transcript);
              }}
            >
              <option value="">Choose…</option>
              {examples.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </label>
        )}
      </div>
      <p className="small muted">
        Your transcript is sent to a free AI service (Groq) and saved so you can reopen the result by its link.
        Do not paste anything private or confidential. Each visitor gets a few runs a day. A run takes about a minute.
      </p>
      {busy && (
        <ol className="steps" aria-live="polite">
          {STEPS.map((label, i) => (
            <li key={i} data-state={i + 1 < step || (i + 1 === step && waiting) ? "done" : i + 1 === step ? "active" : "todo"}>
              {label}
              {i + 1 === step && waiting && i < 2 ? " (done, pausing for the free quota)" : ""}
            </li>
          ))}
        </ol>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
