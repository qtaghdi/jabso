import { defineQuery, type InferSchema } from "boundra";
import { z } from "zod";
import { repositoryConnectionSchema } from './repository-connection.js'

export const listProjectsInputSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
export const listProjectsResultSchema = z.object({
  items: z.array(z.object({
    id: z.uuid(),
    name: z.string().min(1).max(80),
    slug: z.string().min(1).max(120),
    dsnProjectId: z.string().min(1).max(64),
    publicKey: z.string().min(1).max(128),
    createdAt: z.iso.datetime(),
    repository: repositoryConnectionSchema.nullable(),
  })).max(100),
  nextCursor: z.string().nullable(),
});

export type ListProjectsQueryInput = InferSchema<typeof listProjectsInputSchema>;
export type ListProjectsQueryResult = InferSchema<typeof listProjectsResultSchema>;

export const listProjectsQuery = defineQuery({
  name: "list-projects",
  input: listProjectsInputSchema,
  result: listProjectsResultSchema,
});
