import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

export const getIssueInputSchema = z.object({
  projectId: z.uuid(),
  issueId: z.uuid(),
});
const stackFrameSchema = z.object({
  filename: z.string().optional(),
  function: z.string().optional(),
  line: z.number().int().nonnegative().optional(),
  column: z.number().int().nonnegative().optional(),
  inApp: z.boolean().optional(),
});

const latestEventSchema = z.object({
  eventId: z.string(),
  message: z.string().nullable(),
  exceptionType: z.string().nullable(),
  platform: z.string().nullable(),
  environment: z.string().nullable(),
  release: z.string().nullable(),
  occurredAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime(),
  stacktrace: z.array(stackFrameSchema),
  tags: z.record(z.string(), z.string()),
});

export const getIssueResultSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  fingerprint: z.string(),
  title: z.string(),
  exceptionType: z.string().nullable(),
  level: z.string(),
  status: z.enum(["unresolved", "resolved", "ignored"]),
  eventCount: z.number().int().nonnegative(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  latestEvent: latestEventSchema.nullable(),
}).nullable();

export type GetIssueQueryInput = InferSchema<typeof getIssueInputSchema>;
export type GetIssueQueryResult = InferSchema<typeof getIssueResultSchema>;

export const getIssueQuery = defineQuery({
  name: "get-issue",
  input: getIssueInputSchema,
  result: getIssueResultSchema,
});
