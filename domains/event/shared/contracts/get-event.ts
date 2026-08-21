import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

export const getEventInputSchema = z.object({
  projectId: z.uuid(),
  eventId: z.string().min(1).max(64),
});
export const getEventResultSchema = z.object({
  id: z.uuid(),
  eventId: z.string(),
  issueId: z.uuid(),
  message: z.string().nullable(),
  level: z.string(),
  platform: z.string().nullable(),
  environment: z.string().nullable(),
  release: z.string().nullable(),
  occurredAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime(),
  stacktrace: z.array(z.object({
    filename: z.string().optional(),
    function: z.string().optional(),
    line: z.number().int().nonnegative().optional(),
    column: z.number().int().nonnegative().optional(),
    inApp: z.boolean().optional(),
  })),
  tags: z.record(z.string(), z.string()),
});

export type GetEventQueryInput = InferSchema<typeof getEventInputSchema>;
export type GetEventQueryResult = InferSchema<typeof getEventResultSchema>;

export const getEventQuery = defineQuery({
  name: "get-event",
  input: getEventInputSchema,
  result: getEventResultSchema,
});
