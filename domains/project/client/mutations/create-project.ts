import type { BoundraCallOptions, BoundraClient } from 'boundra'
import {
  createProjectMutation,
  type CreateProjectMutationInput,
} from '../../shared/contracts/create-project.js'

export const createProject = (
  client: BoundraClient,
  input: CreateProjectMutationInput,
  options?: BoundraCallOptions,
) => client.mutation(createProjectMutation, input, options)
