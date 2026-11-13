export interface EvidenceCheck {
  total: number;
  valid: number;
  /** valid / total, or 1 when there are no quotes */
  rate: number;
  invalid: { id: string; quote: string }[];
}

/** Lowercase, unify quotes/dashes, collapse whitespace so harmless formatting differences don't fail a quote. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteInTranscript(quote: string, transcript: string): boolean {
  const q = normalize(quote);
  return q.length > 0 && normalize(transcript).includes(q);
}

export function verifyEvidence(
  items: { id: string; evidence: { quote: string }[] }[],
  transcript: string,
): EvidenceCheck {
  const invalid: EvidenceCheck["invalid"] = [];
  let total = 0;
  for (const item of items) {
    for (const e of item.evidence) {
      total++;
      if (!quoteInTranscript(e.quote, transcript)) invalid.push({ id: item.id, quote: e.quote });
    }
  }
  const valid = total - invalid.length;
  return { total, valid, rate: total === 0 ? 1 : valid / total, invalid };
}
