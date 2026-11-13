import { Pool } from "pg";
import type { PipelineResult } from "../pipeline/run";
import type { RunPatch, RunRecord, RunStatus, RunStore } from "./types";

interface Row {
  id: string;
  created_at: Date;
  title: string;
  transcript: string;
  status: string;
  stage: number;
  error: string | null;
  ip_hash: string | null;
  data: Partial<PipelineResult>;
}

let pool: Pool | undefined;
let ready: Promise<void> | undefined;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    const local = !url || /localhost|127\.0\.0\.1/.test(url);
    // Hosted databases (Neon, Supabase, Render) need TLS; a local one usually does not.
    pool = new Pool({ connectionString: url, max: 3, ssl: local ? false : { rejectUnauthorized: false } });
  }
  return pool;
}

async function db(): Promise<Pool> {
  const p = getPool();
  if (!ready) {
    ready = p
      .query(
        `CREATE TABLE IF NOT EXISTS runs (
           id text PRIMARY KEY,
           created_at timestamptz NOT NULL DEFAULT now(),
           title text NOT NULL,
           transcript text NOT NULL,
           status text NOT NULL,
           stage integer NOT NULL DEFAULT 0,
           error text,
           ip_hash text,
           data jsonb NOT NULL DEFAULT '{}'::jsonb
         )`,
      )
      .then(() => undefined);
    ready.catch(() => {
      ready = undefined; // try again on the next request
    });
  }
  await ready;
  return p;
}

const fromRow = (r: Row): RunRecord => ({
  id: r.id,
  createdAt: r.created_at.toISOString(),
  title: r.title,
  transcript: r.transcript,
  status: r.status as RunStatus,
  stage: r.stage,
  error: r.error,
  ipHash: r.ip_hash,
  data: r.data,
});

export class PgStore implements RunStore {
  async create(rec: RunRecord): Promise<void> {
    const p = await db();
    await p.query(
      `INSERT INTO runs (id, created_at, title, transcript, status, stage, error, ip_hash, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [rec.id, rec.createdAt, rec.title, rec.transcript, rec.status, rec.stage, rec.error, rec.ipHash, JSON.stringify(rec.data)],
    );
  }

  async get(id: string): Promise<RunRecord | null> {
    const p = await db();
    const res = await p.query<Row>(`SELECT * FROM runs WHERE id = $1`, [id]);
    return res.rows[0] ? fromRow(res.rows[0]) : null;
  }

  async update(id: string, patch: RunPatch): Promise<void> {
    const current = await this.get(id);
    if (!current) throw new Error("Run not found");
    const next = { ...current, ...patch };
    const p = await db();
    await p.query(`UPDATE runs SET status = $2, stage = $3, error = $4, data = $5 WHERE id = $1`, [
      id,
      next.status,
      next.stage,
      next.error,
      JSON.stringify(next.data),
    ]);
  }

  async countSince(sinceIso: string, ipHash?: string): Promise<number> {
    const p = await db();
    const res = await p.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM runs WHERE created_at >= $1 AND ($2::text IS NULL OR ip_hash = $2)`,
      [sinceIso, ipHash ?? null],
    );
    return res.rows[0]?.n ?? 0;
  }
}
