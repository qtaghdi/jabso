import type { BoundraCallOptions, BoundraClient } from 'boundra'
import {
  setProjectRepositoryMutation,
  type SetProjectRepositoryMutationInput,
} from '../../shared/contracts/set-project-repository.js'

export const setProjectRepository = (
  client: BoundraClient,
  input: SetProjectRepositoryMutationInput,
  options?: BoundraCallOptions,
) => client.mutation(setProjectRepositoryMutation, input, options)
