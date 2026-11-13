import { createProvider } from "@/lib/providers";
import { runStage } from "@/lib/pipeline/stages";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const reply = (body: Record<string, unknown>, status = 200): Response => Response.json(body, { status });
const waitMs = (): number => Number(process.env.STAGE_PAUSE_MS ?? 15000);

function friendly(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  if (/429|rate.?limit/i.test(text)) {
    return "The free AI quota is busy right now. Wait a minute and run it again.";
  }
  return "The AI provider returned an error. Try again in a minute.";
}

/** Runs one stage (1, 2 or 3) of a saved run. The browser calls these in order. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { stage?: unknown } | null;
  const stage = body?.stage;
  if (stage !== 1 && stage !== 2 && stage !== 3) return reply({ error: "Stage must be 1, 2 or 3." }, 400);

  let store;
  try {
    store = getStore();
  } catch (e) {
    console.error(e);
    return reply({ error: "Live runs are not available on this site right now." }, 503);
  }

  const run = await store.get(id);
  if (!run) return reply({ error: "That run does not exist." }, 404);
  if (run.status === "failed") return reply({ error: run.error ?? "This run failed." }, 409);
  if (run.stage >= stage) return reply({ stage: run.stage, status: run.status, waitMs: waitMs() }); // already done
  if (run.stage !== stage - 1) return reply({ error: "Stages must run in order." }, 409);

  try {
    const provider = await createProvider();
    const part = await runStage(provider, run, stage);
    const status = stage === 3 ? "complete" : "running";
    await store.update(id, { data: { ...run.data, ...part }, stage, status });
    return reply({ stage, status, waitMs: waitMs() });
  } catch (e) {
    console.error(`Stage ${stage} failed for run ${id}:`, e);
    const message = friendly(e);
    await store.update(id, { status: "failed", error: message }).catch(() => undefined);
    return reply({ error: message }, 502);
  }
}
