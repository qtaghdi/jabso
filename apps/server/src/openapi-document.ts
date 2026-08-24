import type { OpenAPIV3 } from 'openapi-types'

const jsonContent = (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject) => ({
  'application/json': { schema },
})

const response = (
  description: string,
  schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
): OpenAPIV3.ResponseObject => ({
  description,
  ...(schema ? { content: jsonContent(schema) } : {}),
})

const projectIdParameter: OpenAPIV3.ParameterObject = {
  name: 'projectId',
  in: 'path',
  required: true,
  description: 'Public DSN project identifier.',
  schema: { type: 'string' },
}

const issueIdParameter: OpenAPIV3.ParameterObject = {
  name: 'issueId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
}

const releaseVersionParameter: OpenAPIV3.ParameterObject = {
  name: 'version',
  in: 'path',
  required: true,
  schema: { type: 'string', maxLength: 250 },
}

const projectKeySecurity = [{ projectKey: [] }]
const dashboardSecurity = [{ dashboardToken: [] }]
const administratorSecurity = [{ administratorToken: [] }]

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Jabso API',
    version: '0.1.0',
    description: [
      'Jabso collects Sentry-compatible envelopes and exposes issue and release workflows.',
      'Envelope ingestion uses the public DSN project key. Dashboard APIs and source-map administration use separate bearer tokens.',
    ].join('\n\n'),
  },
  servers: [{ url: '/', description: 'Current Jabso server' }],
  tags: [
    { name: 'System', description: 'Collector health and database readiness.' },
    { name: 'Ingestion', description: 'Sentry-compatible event ingestion.' },
    { name: 'Issues', description: 'Issue search, detail, facets, and status workflow.' },
    { name: 'Releases', description: 'Release visibility and source-map symbolication.' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Check process health',
        operationId: 'getHealth',
        responses: {
          '200': response('The collector process is running.', { $ref: '#/components/schemas/Health' }),
        },
      },
    },
    '/ready': {
      get: {
        tags: ['System'],
        summary: 'Check database readiness',
        operationId: 'getReadiness',
        responses: {
          '200': response('The collector can query PostgreSQL.', { $ref: '#/components/schemas/Readiness' }),
          '500': response('The database readiness check failed.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/envelope': {
      post: {
        tags: ['Ingestion'],
        summary: 'Ingest a Sentry envelope',
        description: 'Accepts a byte-safe Sentry envelope. gzip and deflate content encodings are supported.',
        operationId: 'ingestEnvelope',
        security: projectKeySecurity,
        parameters: [projectIdParameter, {
          name: 'Content-Encoding',
          in: 'header',
          schema: { type: 'string', enum: ['identity', 'gzip', 'deflate'] },
        }],
        requestBody: {
          required: true,
          content: {
            'application/x-sentry-envelope': { schema: { type: 'string', format: 'binary' } },
            'text/plain': { schema: { type: 'string', format: 'binary' } },
          },
        },
        responses: {
          '200': response('The envelope was accepted.', { $ref: '#/components/schemas/IngestResult' }),
          '400': response('The envelope is malformed or exceeds a decoded limit.', { $ref: '#/components/schemas/Error' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
          '415': response('The request body is not a supported envelope.', { $ref: '#/components/schemas/Error' }),
          '429': response('The request rate limit was exceeded.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/issues': {
      get: {
        tags: ['Issues'],
        summary: 'Search issues',
        operationId: 'searchIssues',
        security: dashboardSecurity,
        parameters: [
          projectIdParameter,
          { name: 'query', in: 'query', schema: { type: 'string', maxLength: 500 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/IssueStatus' } },
          { name: 'level', in: 'query', schema: { type: 'string', maxLength: 32 } },
          { name: 'environment', in: 'query', schema: { type: 'string', maxLength: 128 } },
          { name: 'release', in: 'query', schema: { type: 'string', maxLength: 250 } },
          { name: 'last_seen_after', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'cursor', in: 'query', schema: { type: 'string', maxLength: 500 } },
          { name: 'direction', in: 'query', schema: { type: 'string', enum: ['next', 'previous'], default: 'next' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        ],
        responses: {
          '200': response('A bounded page of issues.', { $ref: '#/components/schemas/IssueSearchResult' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/issues/facets': {
      get: {
        tags: ['Issues'],
        summary: 'List issue filter facets',
        operationId: 'getIssueFacets',
        security: dashboardSecurity,
        parameters: [projectIdParameter],
        responses: {
          '200': response('Available levels, environments, and releases.', { $ref: '#/components/schemas/IssueFacets' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/issues/{issueId}': {
      get: {
        tags: ['Issues'],
        summary: 'Get issue detail',
        operationId: 'getIssue',
        security: dashboardSecurity,
        parameters: [projectIdParameter, issueIdParameter],
        responses: {
          '200': response('Issue detail with bounded occurrence and release history.', { $ref: '#/components/schemas/IssueDetail' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
          '404': response('The issue does not exist in the project.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/issues/{issueId}/status': {
      patch: {
        tags: ['Issues'],
        summary: 'Update issue status',
        operationId: 'updateIssueStatus',
        security: dashboardSecurity,
        parameters: [projectIdParameter, issueIdParameter],
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['status'],
            properties: { status: { $ref: '#/components/schemas/IssueStatus' } },
            additionalProperties: false,
          }),
        },
        responses: {
          '200': response('The status change was recorded.', { $ref: '#/components/schemas/IssueStatusUpdate' }),
          '400': response('The requested status is invalid.', { $ref: '#/components/schemas/Error' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
          '404': response('The issue does not exist in the project.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/releases': {
      get: {
        tags: ['Releases'],
        summary: 'List releases',
        operationId: 'listReleases',
        security: dashboardSecurity,
        parameters: [projectIdParameter, {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        }],
        responses: {
          '200': response('A bounded list of project releases.', { $ref: '#/components/schemas/ReleaseList' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/releases/{version}/regressions': {
      get: {
        tags: ['Releases'],
        summary: 'List regressions for a release',
        operationId: 'getReleaseRegressions',
        security: dashboardSecurity,
        parameters: [
          projectIdParameter,
          releaseVersionParameter,
          { name: 'dist', in: 'query', schema: { type: 'string', maxLength: 128, default: '' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        ],
        responses: {
          '200': response('Issues that regressed in the release.', { $ref: '#/components/schemas/ReleaseRegressions' }),
          '403': response('The project credentials are invalid.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/releases/{version}/artifacts': {
      put: {
        tags: ['Releases'],
        summary: 'Upload a source map',
        description: 'Uploads one source map up to 5 MiB. Source maps are treated as private source code.',
        operationId: 'uploadSourceMap',
        security: administratorSecurity,
        parameters: [
          projectIdParameter,
          releaseVersionParameter,
          { name: 'artifact_path', in: 'query', required: true, schema: { type: 'string', maxLength: 2000 } },
          { name: 'dist', in: 'query', schema: { type: 'string', maxLength: 128, default: '' } },
          { name: 'deployed_at', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary', maxLength: 5242880 } } },
        },
        responses: {
          '200': response('The artifact was stored and pending events were processed.', { $ref: '#/components/schemas/SourceMapUploadResult' }),
          '400': response('The path or source map is invalid.', { $ref: '#/components/schemas/Error' }),
          '403': response('The administrator credentials are invalid.', { $ref: '#/components/schemas/Error' }),
          '404': response('The project does not exist.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
    '/api/{projectId}/releases/{version}/symbolicate': {
      post: {
        tags: ['Releases'],
        summary: 'Retry release symbolication',
        operationId: 'retryReleaseSymbolication',
        security: administratorSecurity,
        parameters: [
          projectIdParameter,
          releaseVersionParameter,
          { name: 'dist', in: 'query', schema: { type: 'string', maxLength: 128, default: '' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 100 } },
        ],
        responses: {
          '200': response('A bounded symbolication retry completed.', { $ref: '#/components/schemas/SymbolicationRetryResult' }),
          '403': response('The administrator credentials are invalid.', { $ref: '#/components/schemas/Error' }),
          '404': response('The project does not exist.', { $ref: '#/components/schemas/Error' }),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      projectKey: {
        type: 'apiKey',
        in: 'query',
        name: 'sentry_key',
        description: 'Public project key from the Jabso DSN.',
      },
      dashboardToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JABSO_DASHBOARD_TOKEN',
        description: 'Server-only token used by the authenticated Jabso dashboard.',
      },
      administratorToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JABSO_ADMIN_TOKEN',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['error'],
      },
      Health: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['ok'] } },
        required: ['status'],
      },
      Readiness: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['ready'] } },
        required: ['status'],
      },
      IngestResult: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      IssueStatus: {
        type: 'string',
        enum: ['unresolved', 'resolved', 'ignored'],
      },
      IssueSummary: {
        type: 'object',
        required: ['id', 'projectId', 'title', 'exceptionType', 'level', 'status', 'eventCount', 'firstSeenAt', 'lastSeenAt', 'regressedAt', 'environment', 'release'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          exceptionType: { type: 'string', nullable: true },
          level: { type: 'string' },
          status: { $ref: '#/components/schemas/IssueStatus' },
          eventCount: { type: 'integer', minimum: 0 },
          firstSeenAt: { type: 'string', format: 'date-time' },
          lastSeenAt: { type: 'string', format: 'date-time' },
          regressedAt: { type: 'string', format: 'date-time', nullable: true },
          environment: { type: 'string', nullable: true },
          release: { type: 'string', nullable: true },
        },
      },
      IssueSearchResult: {
        type: 'object',
        required: ['items', 'nextCursor', 'previousCursor'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/IssueSummary' } },
          nextCursor: { type: 'string', nullable: true },
          previousCursor: { type: 'string', nullable: true },
        },
      },
      IssueFacets: {
        type: 'object',
        required: ['levels', 'environments', 'releases'],
        properties: {
          levels: { type: 'array', items: { type: 'string' }, maxItems: 50 },
          environments: { type: 'array', items: { type: 'string' }, maxItems: 100 },
          releases: { type: 'array', items: { type: 'string' }, maxItems: 100 },
        },
      },
      IssueDetail: {
        type: 'object',
        required: ['id', 'projectId', 'fingerprint', 'title', 'exceptionType', 'level', 'status', 'eventCount', 'firstSeenAt', 'lastSeenAt', 'statusChangedAt', 'resolvedAt', 'regressedAt', 'occurrences', 'latestEvent', 'releaseHistory'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          fingerprint: { type: 'string' },
          title: { type: 'string' },
          exceptionType: { type: 'string', nullable: true },
          level: { type: 'string' },
          status: { $ref: '#/components/schemas/IssueStatus' },
          eventCount: { type: 'integer', minimum: 0 },
          firstSeenAt: { type: 'string', format: 'date-time' },
          lastSeenAt: { type: 'string', format: 'date-time' },
          statusChangedAt: { type: 'string', format: 'date-time' },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
          regressedAt: { type: 'string', format: 'date-time', nullable: true },
          occurrences: { type: 'array', maxItems: 25, items: { type: 'object', additionalProperties: true } },
          latestEvent: { type: 'object', nullable: true, additionalProperties: true },
          releaseHistory: { type: 'array', maxItems: 25, items: { type: 'object', additionalProperties: true } },
        },
      },
      IssueStatusUpdate: {
        type: 'object',
        required: ['issueId', 'status', 'changedAt'],
        properties: {
          issueId: { type: 'string', format: 'uuid' },
          status: { $ref: '#/components/schemas/IssueStatus' },
          changedAt: { type: 'string', format: 'date-time' },
        },
      },
      ReleaseList: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            maxItems: 100,
            items: {
              type: 'object',
              required: ['id', 'version', 'dist', 'deployedAt', 'createdAt', 'artifactCount', 'eventCount'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                version: { type: 'string' },
                dist: { type: 'string' },
                deployedAt: { type: 'string', format: 'date-time', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                artifactCount: { type: 'integer', minimum: 0 },
                eventCount: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
      ReleaseRegressions: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['issueId', 'title', 'dist', 'previousResolvedAt', 'regressedAt'],
              properties: {
                issueId: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                dist: { type: 'string' },
                previousResolvedAt: { type: 'string', format: 'date-time' },
                regressedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      SourceMapUploadResult: {
        type: 'object',
        required: ['releaseId', 'artifactId', 'artifactPath', 'checksum', 'byteSize', 'processedEventCount', 'completedEventCount', 'pendingEventCount'],
        properties: {
          releaseId: { type: 'string', format: 'uuid' },
          artifactId: { type: 'string', format: 'uuid' },
          artifactPath: { type: 'string' },
          checksum: { type: 'string' },
          byteSize: { type: 'integer', minimum: 1 },
          processedEventCount: { type: 'integer', minimum: 0 },
          completedEventCount: { type: 'integer', minimum: 0 },
          pendingEventCount: { type: 'integer', minimum: 0 },
        },
      },
      SymbolicationRetryResult: {
        type: 'object',
        required: ['releaseId', 'processedEventCount', 'completedEventCount', 'missingEventCount', 'failedEventCount', 'pendingEventCount'],
        properties: {
          releaseId: { type: 'string', format: 'uuid', nullable: true },
          processedEventCount: { type: 'integer', minimum: 0 },
          completedEventCount: { type: 'integer', minimum: 0 },
          missingEventCount: { type: 'integer', minimum: 0 },
          failedEventCount: { type: 'integer', minimum: 0 },
          pendingEventCount: { type: 'integer', minimum: 0 },
        },
      },
    },
  },
}
