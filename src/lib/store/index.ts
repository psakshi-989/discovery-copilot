import { FileStore } from "./fileStore";
import { PgStore } from "./pgStore";
import type { RunStore } from "./types";

let store: RunStore | undefined;

/** Postgres when DATABASE_URL is set, local files in development, otherwise an error. */
export function getStore(): RunStore {
  if (store) return store;
  if (process.env.DATABASE_URL) {
    store = new PgStore();
  } else if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set, so live runs cannot be saved on this deployment.");
  } else {
    store = new FileStore();
  }
  return store;
}
