import { createHash } from "node:crypto";
import type { RunStore } from "./types";

/** One-way hash of the visitor's address. The address itself is never stored. */
export function hashIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip");
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export type LimitCheck = { ok: true } | { ok: false; message: string };

/** Protects the free AI quota: a daily cap per visitor and one for the whole site. */
export async function checkLimits(store: RunStore, ipHash: string | null): Promise<LimitCheck> {
  const perVisitor = Number(process.env.RUNS_PER_IP_PER_DAY ?? 3);
  const siteWide = Number(process.env.DAILY_RUN_CAP ?? 25);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if ((await store.countSince(since)) >= siteWide) {
    return { ok: false, message: "Today's free AI quota is used up. Try again tomorrow, or open one of the example runs." };
  }
  if (ipHash && (await store.countSince(since, ipHash)) >= perVisitor) {
    return { ok: false, message: `You have used your ${perVisitor} runs for today. Try again tomorrow, or open one of the example runs.` };
  }
  return { ok: true };
}
