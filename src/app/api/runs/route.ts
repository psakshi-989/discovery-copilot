import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/store";
import { checkLimits, hashIp } from "@/lib/store/limits";

export const dynamic = "force-dynamic";

const MIN_CHARS = 300;
const MAX_CHARS = 12000;

const reply = (body: Record<string, unknown>, status = 200): Response => Response.json(body, { status });

/** Starts a run: validates the transcript, applies the daily limits and saves an empty run. */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Send the transcript as JSON." }, 400);
  }
  const raw = (body as { transcript?: unknown } | null)?.transcript;
  const transcript = typeof raw === "string" ? raw.trim() : "";

  if (transcript.length < MIN_CHARS) {
    return reply({ error: `Paste a longer transcript. It needs at least ${MIN_CHARS} characters to work with.` }, 400);
  }
  if (transcript.length > MAX_CHARS) {
    return reply({ error: `That transcript is too long. Keep it under ${MAX_CHARS.toLocaleString("en-US")} characters.` }, 400);
  }

  let store;
  try {
    store = getStore();
  } catch (e) {
    console.error(e);
    return reply({ error: "Live runs are not available on this site right now. The example runs still work." }, 503);
  }

  const ipHash = hashIp(req);
  try {
    const limit = await checkLimits(store, ipHash);
    if (!limit.ok) return reply({ error: limit.message }, 429);

    const id = randomUUID().replace(/-/g, "").slice(0, 12);
    const now = new Date();
    await store.create({
      id,
      createdAt: now.toISOString(),
      title: `Your call, ${now.toISOString().slice(0, 10)}`,
      transcript,
      status: "running",
      stage: 0,
      error: null,
      ipHash,
      data: {},
    });
    return reply({ id });
  } catch (e) {
    console.error(e);
    return reply({ error: "Could not save the run. Try again in a minute." }, 500);
  }
}
