import { z } from "zod";

/**
 * Convert a Zod schema into the JSON Schema object a provider expects for a tool.
 * Zod 4 ships z.toJSONSchema. The "$schema" key is dropped because tool input
 * schemas should be a plain object schema.
 */
export function toToolSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  if (json.type !== "object") {
    throw new Error("Tool input schemas must be objects at the top level");
  }
  return json;
}
