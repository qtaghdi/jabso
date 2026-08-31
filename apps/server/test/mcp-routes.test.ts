import { BoundraRuntimeError } from 'boundra'
import { describe, expect, it } from 'vitest'
import { runProjectTool } from '../src/adapters/mcp/mcp-routes.js'

const connection = {
  id: 'connection-id',
  projectIds: ['project-id'],
  workspaceId: 'workspace-id',
}

describe('runProjectTool', () => {
  it('records a safe Boundra contract failure before returning the MCP-safe error', async () => {
    const audits: string[] = []
    const recorded: BoundraRuntimeError[] = []
    const store = {
      authenticate: async () => null,
      listAllowedProjects: async () => [],
      recordAudit: async ({ outcome }: { outcome: string }) => { audits.push(outcome) },
    }
    const error = new BoundraRuntimeError({
      code: 'RUNTIME-003',
      contract: 'search-issues',
      phase: 'handler',
      message: 'handler failed with private details',
      suggestion: 'inspect the handler',
    })

    const result = await runProjectTool(
      store,
      connection,
      'project-id',
      'search_issues',
      async () => { throw error },
      async (runtimeError) => { recorded.push(runtimeError) },
    )

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Jabso could not complete this read-only query.' }],
      isError: true,
    })
    expect(recorded).toEqual([error])
    expect(audits).toEqual(['error'])
  })

  it('does not let diagnostic recording failure alter the MCP-safe error response', async () => {
    const store = {
      authenticate: async () => null,
      listAllowedProjects: async () => [],
      recordAudit: async () => undefined,
    }
    const error = new BoundraRuntimeError({
      code: 'RUNTIME-003',
      contract: 'get-issue',
      phase: 'handler',
      message: 'handler failed',
      suggestion: 'inspect the handler',
    })

    const result = await runProjectTool(
      store,
      connection,
      'project-id',
      'get_issue',
      async () => { throw error },
      async () => { throw new Error('diagnostic sink unavailable') },
    )

    expect(result).toMatchObject({ isError: true })
  })
})
