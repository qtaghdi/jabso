import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

export const getIssueFacetsInputSchema = z.object({
  projectId: z.uuid(),
});

export const getIssueFacetsResultSchema = z.object({
  levels: z.array(z.string()).max(50),
  environments: z.array(z.string()).max(100),
  releases: z.array(z.string()).max(100),
});

export type GetIssueFacetsQueryInput = InferSchema<typeof getIssueFacetsInputSchema>;
export type GetIssueFacetsQueryResult = InferSchema<typeof getIssueFacetsResultSchema>;

export const getIssueFacetsQuery = defineQuery({
  name: "get-issue-facets",
  input: getIssueFacetsInputSchema,
  result: getIssueFacetsResultSchema,
});
