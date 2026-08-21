import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";

export const listProjectsInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
export const listProjectsResultSchema = z.object({
  items: z.array(z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
  })),
  nextCursor: z.string().nullable(),
});

export type ListProjectsQueryInput = InferSchema<typeof listProjectsInputSchema>;
export type ListProjectsQueryResult = InferSchema<typeof listProjectsResultSchema>;

export const listProjectsQuery = defineQuery({
  name: "list-projects",
  input: listProjectsInputSchema,
  result: listProjectsResultSchema,
});
