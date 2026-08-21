import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

export const getIssueInputSchema = z.object({
  projectId: z.uuid(),
  issueId: z.uuid(),
});
export const getIssueResultSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  fingerprint: z.string(),
  title: z.string(),
  level: z.string(),
  status: z.enum(["unresolved", "resolved", "ignored"]),
  eventCount: z.number().int().nonnegative(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
});

export type GetIssueQueryInput = InferSchema<typeof getIssueInputSchema>;
export type GetIssueQueryResult = InferSchema<typeof getIssueResultSchema>;

export const getIssueQuery = defineQuery({
  name: "get-issue",
  input: getIssueInputSchema,
  result: getIssueResultSchema,
});
