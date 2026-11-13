import type { z } from "zod";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredRequest<T> {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export interface StructuredResult<T> {
  data: T;
  usage: Usage;
  latencyMs: number;
  model: string;
  /** 1 = valid on first try, 2 = needed one repair round */
  attempts: number;
}

export interface LLMProvider {
  name: string;
  model: string;
  generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

export class StructuredOutputError extends Error {
  constructor(
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "StructuredOutputError";
  }
}
