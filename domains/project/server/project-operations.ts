import { implementMutation, implementQuery } from 'boundra'
import { randomBytes, randomInt } from 'node:crypto'
import {
  createProjectMutation,
  type CreateProjectMutationInput,
  type CreateProjectMutationResult,
} from '../shared/contracts/create-project.js'
import {
  deleteProjectMutation,
  type DeleteProjectMutationInput,
  type DeleteProjectMutationResult,
} from '../shared/contracts/delete-project.js'
import {
  listProjectsQuery,
  type ListProjectsQueryInput,
  type ListProjectsQueryResult,
} from '../shared/contracts/list-projects.js'

export type ProjectStore = {
  create(input: CreateProjectMutationInput & {
    dsnProjectId: string
    publicKey: string
    slug: string
  }): Promise<CreateProjectMutationResult>
  delete(input: DeleteProjectMutationInput): Promise<DeleteProjectMutationResult>
  list(input: ListProjectsQueryInput): Promise<ListProjectsQueryResult>
}

const projectSlug = (name: string, suffix: string) => {
  const base = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'project'
  return `${base}-${suffix}`
}

export const createListProjectsImplementation = (store: ProjectStore) =>
  implementQuery(listProjectsQuery, (input) => store.list(input))

export const createCreateProjectImplementation = (store: ProjectStore) =>
  implementMutation(createProjectMutation, (input) => {
    const dsnProjectId = randomInt(1_000_000_000, 9_999_999_999).toString()
    const publicKey = randomBytes(16).toString('hex')
    return store.create({
      ...input,
      dsnProjectId,
      publicKey,
      slug: projectSlug(input.name, dsnProjectId.slice(-6)),
    })
  })

export const createDeleteProjectImplementation = (store: ProjectStore) =>
  implementMutation(deleteProjectMutation, (input) => store.delete(input))
