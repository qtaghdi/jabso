import type { BoundraCallOptions, BoundraClient } from 'boundra'
import {
  disconnectProjectRepositoryMutation,
  type DisconnectProjectRepositoryMutationInput,
} from '../../shared/contracts/disconnect-project-repository.js'

export const disconnectProjectRepository = (
  client: BoundraClient,
  input: DisconnectProjectRepositoryMutationInput,
  options?: BoundraCallOptions,
) => client.mutation(disconnectProjectRepositoryMutation, input, options)
