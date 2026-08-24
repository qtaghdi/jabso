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
  dist: z.string().nullable(),
  occurredAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime(),
  stacktrace: z.array(stackFrameSchema).max(200),
  originalStacktrace: z.array(stackFrameSchema).max(200),
  symbolication: z.object({
    status: z.enum(['not_applicable', 'pending', 'completed', 'missing', 'failed']),
    errorCode: z.string().nullable(),
    mappedAt: z.iso.datetime().nullable(),
  }),
  tags: z.record(z.string(), z.string()),
  breadcrumbs: z.array(z.object({
    timestamp: z.iso.datetime().optional(),
    category: z.string(),
    level: z.string().optional(),
    message: z.string().optional(),
  })),
  context: z.record(z.string(), z.string()),
});

const occurrenceSchema = z.object({
  eventId: z.string(),
  level: z.string(),
  environment: z.string().nullable(),
  release: z.string().nullable(),
  occurredAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime(),
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
  statusChangedAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().nullable(),
  regressedAt: z.iso.datetime().nullable(),
  latestEvent: latestEventSchema.nullable(),
  occurrences: z.array(occurrenceSchema).max(25),
  releaseHistory: z.array(z.object({
    release: z.string(),
    dist: z.string(),
    eventCount: z.number().int().nonnegative(),
    firstSeenAt: z.iso.datetime(),
    lastSeenAt: z.iso.datetime(),
    previousResolvedAt: z.iso.datetime().nullable(),
    regressedAt: z.iso.datetime().nullable(),
  })).max(25),
}).nullable();

export type GetIssueQueryInput = InferSchema<typeof getIssueInputSchema>;
export type GetIssueQueryResult = InferSchema<typeof getIssueResultSchema>;

export const getIssueQuery = defineQuery({
  name: "get-issue",
  input: getIssueInputSchema,
  result: getIssueResultSchema,
});
