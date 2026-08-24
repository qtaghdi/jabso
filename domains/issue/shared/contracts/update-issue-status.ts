import { defineMutation, type InferSchema } from "boundra";
import { z } from "zod";

export const updateIssueStatusInputSchema = z.object({
  projectId: z.uuid(),
  issueId: z.uuid(),
  status: z.enum(["unresolved", "resolved", "ignored"]),
});

export const updateIssueStatusResultSchema = z.object({
  issueId: z.uuid(),
  status: z.enum(["unresolved", "resolved", "ignored"]),
  changedAt: z.iso.datetime(),
}).nullable();

export type UpdateIssueStatusMutationInput = InferSchema<typeof updateIssueStatusInputSchema>;
export type UpdateIssueStatusMutationResult = InferSchema<typeof updateIssueStatusResultSchema>;

export const updateIssueStatusMutation = defineMutation({
  name: "update-issue-status",
  input: updateIssueStatusInputSchema,
  result: updateIssueStatusResultSchema,
});
