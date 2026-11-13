import { z } from "zod";

/** Your hand-written answer key for one transcript. */
export const Truth = z.object({
  case: z.string(),
  must_capture: z
    .array(
      z.object({
        id: z.string(),
        what: z.string(),
        /** 3 = customer said it is required, 2 = clearly wanted, 1 = nice to have */
        weight: z.number().min(1).max(3),
      }),
    )
    .min(1),
  must_flag: z.array(z.string()),
  /** Facts that were NOT said in the transcript and a careless model might invent */
  traps: z.array(z.string()),
  hand_estimate_days: z.object({ low: z.number(), high: z.number() }),
});

export type Truth = z.infer<typeof Truth>;
