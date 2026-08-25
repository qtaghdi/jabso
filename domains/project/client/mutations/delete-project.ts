import type { BoundraCallOptions, BoundraClient } from 'boundra'
import {
  deleteProjectMutation,
  type DeleteProjectMutationInput,
} from '../../shared/contracts/delete-project.js'

export const deleteProject = (
  client: BoundraClient,
  input: DeleteProjectMutationInput,
  options?: BoundraCallOptions,
) => client.mutation(deleteProjectMutation, input, options)
