import { defineMutation, type InferSchema } from "boundra";
import { z } from "zod";

const stackFrameSchema = z.object({
  filename: z.string().optional(),
  function: z.string().optional(),
  line: z.number().int().nonnegative().optional(),
  column: z.number().int().nonnegative().optional(),
  inApp: z.boolean().optional(),
});

export const ingestEventInputSchema = z.object({
  projectId: z.uuid(),
  eventId: z.string().min(1).max(64),
  message: z.string().max(4_000).optional(),
  exceptionType: z.string().max(500).optional(),
  level: z.string().min(1).max(32).default("error"),
  platform: z.string().max(64).optional(),
  environment: z.string().max(128).optional(),
  release: z.string().max(250).optional(),
  occurredAt: z.iso.datetime().optional(),
  stacktrace: z.array(stackFrameSchema).max(200).default([]),
  tags: z.record(z.string(), z.string().max(1_000)).default({}),
  customFingerprint: z.array(z.string().min(1).max(500)).max(20).optional(),
});
export const ingestEventResultSchema = z.object({
  eventId: z.string(),
  issueId: z.uuid(),
  isNewIssue: z.boolean(),
});

export type IngestEventMutationInput = InferSchema<typeof ingestEventInputSchema>;
export type IngestEventMutationResult = InferSchema<typeof ingestEventResultSchema>;

export const ingestEventMutation = defineMutation({
  name: "ingest-event",
  input: ingestEventInputSchema,
  result: ingestEventResultSchema,
});
