# Discovery Copilot

Customer call transcript → structured requirements → architecture → effort/ROI range → demo prototype.
Runs entirely on free-tier LLM APIs (Groq, Gemini). No paid credits needed.

## Status: M0 (Day 1)

- Zod schemas (`src/lib/schemas.ts`), converted to JSON Schema for tool/function calling
- `LLMProvider` interface with one implementation, `OpenAICompatProvider`, covering Groq, Gemini (OpenAI-compatible endpoint) and OpenRouter
- Forced function call, Zod validation, one repair retry, backoff on 429
- Stage 1: transcript → requirements report, with a check that every evidence quote appears verbatim in the transcript
- CLI: `npm run stage1 -- samples/streaming-ops.txt`

## Setup

```bash
npm install next react react-dom zod
npm install -D typescript tsx @types/node @types/react @types/react-dom
cp .env.example .env   # add GROQ_API_KEY (free key from console.groq.com)
npm run typecheck
npm run stage1 -- samples/streaming-ops.txt
```

## Free-tier notes

- Groq's free tier has a small tokens-per-minute cap, so runs may pause on 429 responses. That is expected.
- Free tiers may allow the provider to use your inputs. Use synthetic transcripts only, never real customer data.
- Check each provider's console for current limits before running the full eval.

## Next (M1)

Stage 2 (architecture + sizing), Stage 3 (demo spec), deterministic effort/ROI code, Postgres persistence.

## Website (Next.js)

Run locally: `npm install`, copy `.env.example` to `.env` and fill `GROQ_API_KEY`, then `npm run dev` and open http://localhost:3000. Without `DATABASE_URL`, runs are saved in `.data/`.

Deploy on Vercel:
1. Create a free Postgres database at neon.tech and copy its connection string.
2. Push the project to GitHub, import it in Vercel.
3. Add environment variables: `PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL`, `DATABASE_URL`, `IP_HASH_SALT` (any long random text), and optionally `RUNS_PER_IP_PER_DAY`, `DAILY_RUN_CAP`, `STAGE_PAUSE_MS`.
4. Deploy. The `runs` table is created on first use.

Refresh the example runs from saved eval results with `npm run export-examples eval/baseline-v1`.
