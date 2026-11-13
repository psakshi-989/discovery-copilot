import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RunPatch, RunRecord, RunStore } from "./types";

/** Local development only: one JSON file per run in .data/runs. Not used on Vercel. */
const DIR = path.join(process.cwd(), ".data", "runs");
const validId = (id: string): boolean => /^[a-z0-9]{6,32}$/.test(id);

export class FileStore implements RunStore {
  async create(record: RunRecord): Promise<void> {
    await mkdir(DIR, { recursive: true });
    await writeFile(path.join(DIR, `${record.id}.json`), JSON.stringify(record));
  }

  async get(id: string): Promise<RunRecord | null> {
    if (!validId(id)) return null;
    try {
      return JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")) as RunRecord;
    } catch {
      return null;
    }
  }

  async update(id: string, patch: RunPatch): Promise<void> {
    const current = await this.get(id);
    if (!current) throw new Error("Run not found");
    await writeFile(path.join(DIR, `${id}.json`), JSON.stringify({ ...current, ...patch }));
  }

  async countSince(sinceIso: string, ipHash?: string): Promise<number> {
    let files: string[];
    try {
      files = await readdir(DIR);
    } catch {
      return 0;
    }
    let n = 0;
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const rec = await this.get(f.slice(0, -5));
      if (rec && rec.createdAt >= sinceIso && (!ipHash || rec.ipHash === ipHash)) n++;
    }
    return n;
  }
}
