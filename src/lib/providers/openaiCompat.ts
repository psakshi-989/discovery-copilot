import { toToolSchema } from "../jsonSchema";
import {
  StructuredOutputError,
  type LLMProvider,
  type StructuredRequest,
  type StructuredResult,
} from "./types";

export interface OpenAICompatConfig {
  /** Label used in logs and eval results, e.g. "groq" */
  name: string;
  /** e.g. https://api.groq.com/openai/v1 (no trailing slash) */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** How many times to retry a 429/5xx before giving up. */
  maxRetries?: number;
  /** Optional pause before each request, to stay under tokens-per-minute limits. */
  minDelayMs?: number;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ChatResponse {
  choices: { message: { role: "assistant"; content: string | null; tool_calls?: ToolCall[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One provider class for every OpenAI-compatible chat API: Groq, Gemini (OpenAI-compat endpoint),
 * OpenRouter, and OpenAI itself. Structured output = forced function call + Zod validation.
 */
export class OpenAICompatProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;

  constructor(private cfg: OpenAICompatConfig) {
    this.name = cfg.name;
    this.model = cfg.model;
  }

  private async post(body: unknown): Promise<ChatResponse> {
    const maxRetries = this.cfg.maxRetries ?? 5;
    for (let attempt = 0; ; attempt++) {
      if (this.cfg.minDelayMs) await sleep(this.cfg.minDelayMs);
      const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) return (await res.json()) as ChatResponse;

      const text = await res.text().catch(() => "");
      // Groq answers 400 "tool_use_failed" when the model wrote a malformed function call.
      // Sampling is random, so a retry often works.
      const toolFailed = res.status === 400 && text.includes("tool_use_failed");
      const retryable = res.status === 429 || res.status >= 500 || toolFailed;
      if (!retryable || attempt >= maxRetries) {
        throw new StructuredOutputError(
          `${this.cfg.name} API error ${res.status}: ${text.replace(/\s+/g, " ").slice(0, 300)}`,
          text.slice(0, 800),
        );
      }
      if (toolFailed) {
        await sleep(1000);
        continue;
      }
      // Free tiers rate-limit hard. Honour Retry-After if present, else exponential backoff (max 60s).
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter >= 0
        ? retryAfter * 1000
        : Math.min(60_000, 2000 * 2 ** attempt);
      await sleep(waitMs);
    }
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const tools = [
      {
        type: "function",
        function: {
          name: req.toolName,
          description: req.toolDescription,
          parameters: toToolSchema(req.schema),
        },
      },
    ];

    const messages: Record<string, unknown>[] = [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ];

    const started = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await this.post({
        model: this.model,
        messages,
        tools,
        tool_choice: { type: "function", function: { name: req.toolName } },
        max_tokens: req.maxTokens ?? 6000,
        temperature: 0.2,
      });

      inputTokens += response.usage?.prompt_tokens ?? 0;
      outputTokens += response.usage?.completion_tokens ?? 0;

      const message = response.choices?.[0]?.message;
      const call = message?.tool_calls?.find((c) => c.function.name === req.toolName);
      if (!message || !call) {
        throw new StructuredOutputError("Model did not call the required tool", message);
      }

      let problem: string | null = null;
      try {
        const parsed = req.schema.safeParse(JSON.parse(call.function.arguments));
        if (parsed.success) {
          return {
            data: parsed.data,
            usage: { inputTokens, outputTokens },
            latencyMs: Date.now() - started,
            model: this.model,
            attempts: attempt,
          };
        }
        problem = parsed.error.issues
          .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");
      } catch {
        problem = "- the arguments were not valid JSON";
      }

      if (attempt === 2) {
        throw new StructuredOutputError("Output failed validation after one repair attempt", problem);
      }

      messages.push({ role: "assistant", content: message.content, tool_calls: message.tool_calls });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: `Your output failed validation. Call the tool again with these problems fixed:\n${problem}`,
      });
    }

    throw new StructuredOutputError("Unreachable");
  }
}
