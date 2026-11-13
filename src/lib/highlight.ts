/**
 * Finds the customer's exact words inside the transcript so the page can highlight them.
 * Matching ignores case, curly versus straight quotes, dash styles and extra whitespace,
 * the same normalisation the evidence check uses.
 */

export interface Span {
  start: number;
  end: number;
}

export interface EvidenceRef {
  id: string;
  quote: string;
}

export interface Segment {
  text: string;
  /** Requirement ids whose evidence covers this stretch of text. Empty for plain text. */
  ids: string[];
}

function normalizeChar(ch: string): string {
  if (ch === "‘" || ch === "’") return "'";
  if (ch === "“" || ch === "”") return '"';
  if (/[‐-―−]/.test(ch)) return "-";
  return ch.toLowerCase();
}

/** Normalises text and keeps a map from each normalised character back to its original index. */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  let lastWasSpace = true; // drops leading whitespace
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        out.push(" ");
        map.push(i);
        lastWasSpace = true;
      }
      continue;
    }
    lastWasSpace = false;
    for (const n of normalizeChar(ch)) {
      out.push(n);
      map.push(i);
    }
  }
  while (out.length > 0 && out[out.length - 1] === " ") {
    out.pop();
    map.pop();
  }
  return { norm: out.join(""), map };
}

export function locateQuote(transcript: string, quote: string): Span | null {
  const needle = normalizeWithMap(quote).norm;
  if (needle.length === 0) return null;
  const { norm, map } = normalizeWithMap(transcript);
  const at = norm.indexOf(needle);
  if (at < 0) return null;
  return { start: map[at], end: map[at + needle.length - 1] + 1 };
}

/** Splits the transcript into plain and highlighted stretches. Overlapping quotes share a stretch. */
export function buildSegments(
  transcript: string,
  items: EvidenceRef[],
): { segments: Segment[]; missing: string[] } {
  const spans: { id: string; start: number; end: number }[] = [];
  const missing: string[] = [];
  for (const item of items) {
    const span = locateQuote(transcript, item.quote);
    if (span) spans.push({ id: item.id, ...span });
    else missing.push(item.id);
  }

  const cuts = new Set<number>([0, transcript.length]);
  for (const s of spans) {
    cuts.add(s.start);
    cuts.add(s.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a === b) continue;
    const ids = [...new Set(spans.filter((s) => s.start <= a && s.end >= b).map((s) => s.id))];
    segments.push({ text: transcript.slice(a, b), ids });
  }
  return { segments, missing };
}
