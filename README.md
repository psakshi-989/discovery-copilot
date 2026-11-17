# Discovery Copilot

**Live demo: https://discovery-copilot-topaz.vercel.app**

Paste a customer discovery call and get back:

- **Requirements**, each tied to the customer's exact words, which are highlighted in the transcript as proof
- **A proposed architecture** with a diagram, components, integrations and trade-offs
- **An effort and savings estimate as ranges**, with the assumptions and caveats shown next to the numbers
- **A clickable demo prototype** built from the requirements

It is built for forward deployed engineers, solutions engineers and technical consultants, who turn a messy first call into something a customer can react to.

<!-- Add screenshots here after you take them on the live site:
![Report page with highlighted quotes](docs/report.png)
![Demo prototype](docs/demo.png)
-->

## How it works

A call goes through three AI stages. Each stage returns structured data that is validated against a schema, with one automatic repair retry.

1. **Requirements.** Extracts requirements, stakeholders, stated metrics, risks and open questions. A separate check confirms that every quote really appears in the transcript.
2. **Architecture.** Designs components, integrations and savings drivers, then plain code (not the AI) turns component sizes into effort ranges and cost, and savings drivers into payback ranges.
3. **Demo.** Produces a screen-by-screen prototype spec that the website renders.

The estimate is deterministic code on purpose. The AI proposes sizes and drivers, and the arithmetic, ranges and caveats are reproducible and inspectable.

## Evaluation

The pipeline was scored against hand-written answer keys for 4 customer cases (streaming operations, creator marketplace, design template marketplace, insurance claims). A second AI model, different from the one that generates, judges each result.

Baseline v1 (7 scored runs on the free Groq model `openai/gpt-oss-120b`):

| Measure | Result |
|---|---|
| Requirement recall (weighted) | about 85% on average, 65% to 96% across runs |
| Risk-flag recall | about 73% |
| Planted traps hit (things a good analyst should not claim) | 0 of 28 |
| Quotes found word for word in the transcript | 100% |
| Requirements with no support in the call | about 7% |

Caveats: the answer keys were drafted with AI assistance and then reviewed, the set is small, and run-to-run variance is large, so results are given as ranges. Risk flagging is the weakest area.

## Tech

- Next.js (App Router), React, TypeScript
- Postgres (Neon) for saved runs, with a local file store for development
- Zod for schemas and validation
- A thin LLM provider layer over OpenAI-compatible APIs (Groq, Gemini, OpenRouter), so providers can be swapped and compared
- Free-tier only: per-visitor and site-wide daily limits protect the quota

## Run it locally

```bash
npm install
cp .env.example .env    # add GROQ_API_KEY (free key from console.groq.com)
npm run dev             # open http://localhost:3000
```

Without `DATABASE_URL`, runs are saved in `.data/`.

Other commands:

```bash
npm run typecheck
npm run pipeline -- samples/streaming-ops.txt   # run the full pipeline in the terminal
npm run eval -- streaming-ops                   # score one case against its answer key
npm run export-examples eval/baseline-v1        # refresh the example runs on the site
```

## Deploy on Vercel

1. Create a free Postgres database at neon.tech and copy its connection string.
2. Import this repository in Vercel.
3. Add environment variables: `PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL`, `DATABASE_URL`, `IP_HASH_SALT` (any long random text), and optionally `RUNS_PER_IP_PER_DAY`, `DAILY_RUN_CAP`, `STAGE_PAUSE_MS`.
4. Deploy. The `runs` table is created on first use.

## Notes

- Free AI tiers may use inputs to improve their models. Use synthetic transcripts, never real customer data.
- The demo shows made-up sample data. It is a mock-up to react to, not working software.
- Estimates use editable defaults (INR, day rate, staff hourly cost, contingency) in `src/lib/estimate.ts`.