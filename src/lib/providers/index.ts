import { OpenAICompatProvider } from "./openaiCompat";
import type { LLMProvider } from "./types";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
}

/**
 * Free-tier providers all speak the OpenAI chat-completions format, so one class covers them.
 * Adding another provider later (including a paid one) is one more case here.
 */
export async function createProvider(
  name: string = process.env.PROVIDER ?? "groq",
  modelOverride?: string,
): Promise<LLMProvider> {
  switch (name) {
    case "groq":
      return new OpenAICompatProvider({
        name: "groq",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: need("GROQ_API_KEY"),
        model: modelOverride || process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      });
    case "gemini":
      return new OpenAICompatProvider({
        name: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: need("GEMINI_API_KEY"),
        model: modelOverride || need("GEMINI_MODEL"), // pick a free-tier model listed in Google AI Studio
      });
    case "openrouter":
      return new OpenAICompatProvider({
        name: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: need("OPENROUTER_API_KEY"),
        model: modelOverride || need("OPENROUTER_MODEL"), // a ":free" model
      });
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
