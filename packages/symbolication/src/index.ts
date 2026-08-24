import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'

export type StackFrame = {
  filename?: string
  function?: string
  line?: number
  column?: number
  inApp?: boolean
}

export type SourceMapArtifact = {
  path: string
  content: string
}

export type SymbolicationResult = {
  frames: StackFrame[]
  mappedFrameCount: number
  matchedArtifactCount: number
}

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:\/\//i

const sanitizeOriginalSource = (value: string) => {
  let source = value.replaceAll('\\', '/')
  if (absoluteUrlPattern.test(source)) {
    try {
      source = new URL(source).pathname
    } catch {
      source = source.slice(source.indexOf('://') + 3)
    }
  }
  source = source
    .replace(/^[A-Za-z]:\/Users\/[^/]+\//, '~/')
    .replace(/^\/[A-Za-z]:\/Users\/[^/]+\//, '~/')
    .replace(/^\/(?:Users|home)\/[^/]+\//, '~/')
  return source.slice(0, 2_000)
}

export const normalizeArtifactPath = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('\0') || trimmed.includes('\\')) return null

  let pathname: string
  if (absoluteUrlPattern.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname
    } catch {
      return null
    }
  } else {
    pathname = trimmed.split(/[?#]/, 1)[0] ?? ''
  }

  if (pathname.startsWith('~/')) pathname = pathname.slice(1)
  if (!pathname.startsWith('/')) pathname = `/${pathname}`

  const segments = pathname.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..' || segment === '.')) return null
  return `/${segments.join('/')}`
}

export const sourceMapPathForFrame = (filename: string): string | null => {
  const normalized = normalizeArtifactPath(filename)
  return normalized ? `${normalized}.map` : null
}

export const validateSourceMap = (content: string) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
    new TraceMap(parsed as ConstructorParameters<typeof TraceMap>[0])
  } catch {
    throw new Error('Source map must be valid JSON with a valid mappings payload')
  }
}

export const symbolicateStacktrace = (
  frames: StackFrame[],
  artifacts: SourceMapArtifact[],
): SymbolicationResult => {
  const maps = new Map(
    artifacts.map((artifact) => [artifact.path, new TraceMap(JSON.parse(artifact.content))]),
  )
  const matchedPaths = new Set<string>()
  let mappedFrameCount = 0

  const mappedFrames = frames.map((frame) => {
    if (!frame.filename || frame.line === undefined) return frame
    const artifactPath = sourceMapPathForFrame(frame.filename)
    if (!artifactPath) return frame
    const sourceMap = maps.get(artifactPath)
    if (!sourceMap) return frame
    matchedPaths.add(artifactPath)

    const original = originalPositionFor(sourceMap, {
      line: frame.line,
      column: frame.column ?? 0,
    })
    if (!original.source || original.line === null || original.column === null) return frame
    mappedFrameCount += 1
    return {
      ...frame,
      filename: sanitizeOriginalSource(original.source),
      function: original.name ?? frame.function,
      line: original.line,
      column: original.column,
    }
  })

  return {
    frames: mappedFrames,
    mappedFrameCount,
    matchedArtifactCount: matchedPaths.size,
  }
}
