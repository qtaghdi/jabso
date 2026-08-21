import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

export const getReleaseRegressionsInputSchema = z.object({
  projectId: z.uuid(),
  release: z.string().min(1).max(250),
  limit: z.number().int().min(1).max(100).default(25),
});
export const getReleaseRegressionsResultSchema = z.object({
  items: z.array(z.object({
    issueId: z.uuid(),
    title: z.string(),
    previousResolvedAt: z.iso.datetime(),
    regressedAt: z.iso.datetime(),
  })),
});

export type GetReleaseRegressionsQueryInput = InferSchema<typeof getReleaseRegressionsInputSchema>;
export type GetReleaseRegressionsQueryResult = InferSchema<typeof getReleaseRegressionsResultSchema>;

export const getReleaseRegressionsQuery = defineQuery({
  name: "get-release-regressions",
  input: getReleaseRegressionsInputSchema,
  result: getReleaseRegressionsResultSchema,
});
