import { examples } from "../data/examples";
import type { PipelineResult } from "./pipeline/run";
import type { RunView } from "./runView";
import { getStore } from "./store";

export type RunLookup =
  | { kind: "ready"; run: RunView }
  | { kind: "pending" }
  | { kind: "failed"; message: string }
  | { kind: "missing" };

/** Finds a finished run: a bundled example first, then a saved live run. */
export async function getRunView(id: string): Promise<RunLookup> {
  const example = examples.find((e) => e.id === id);
  if (example) return { kind: "ready", run: example };

  if (!/^[a-z0-9]{6,32}$/.test(id)) return { kind: "missing" };
  let record;
  try {
    record = await getStore().get(id);
  } catch {
    return { kind: "missing" };
  }
  if (!record) return { kind: "missing" };
  if (record.status === "failed") return { kind: "failed", message: record.error ?? "This run did not finish." };
  if (record.status !== "complete") return { kind: "pending" };

  return {
    kind: "ready",
    run: {
      id: record.id,
      title: record.title,
      createdAt: record.createdAt,
      transcript: record.transcript,
      result: record.data as PipelineResult,
    },
  };
}
