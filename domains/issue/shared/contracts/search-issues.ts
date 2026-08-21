import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

const issueSummarySchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  exceptionType: z.string().nullable(),
  level: z.string(),
  status: z.enum(["unresolved", "resolved", "ignored"]),
  eventCount: z.number().int().nonnegative(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  environment: z.string().nullable(),
  release: z.string().nullable(),
});

export const searchIssuesInputSchema = z.object({
  projectId: z.uuid(),
  query: z.string().max(500).optional(),
  status: z.enum(["unresolved", "resolved", "ignored"]).optional(),
  environment: z.string().max(128).optional(),
  release: z.string().max(250).optional(),
  cursor: z.iso.datetime().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
export const searchIssuesResultSchema = z.object({
  items: z.array(issueSummarySchema),
  nextCursor: z.string().nullable(),
});

export type SearchIssuesQueryInput = InferSchema<typeof searchIssuesInputSchema>;
export type SearchIssuesQueryResult = InferSchema<typeof searchIssuesResultSchema>;

export const searchIssuesQuery = defineQuery({
  name: "search-issues",
  input: searchIssuesInputSchema,
  result: searchIssuesResultSchema,
});
