import { describe, expect, it } from 'vitest'
import {
  normalizeArtifactPath,
  sourceMapPathForFrame,
  symbolicateStacktrace,
  validateSourceMap,
} from '../src/index.js'

const sourceMap = JSON.stringify({
  version: 3,
  file: 'app.min.js',
  sources: ['src/app.ts'],
  names: ['explode'],
  mappings: 'AAAAA',
})

describe('source map symbolication', () => {
  it('normalizes URL and tilde artifact paths without allowing traversal', () => {
    expect(normalizeArtifactPath('https://example.com/assets/app.min.js?build=1')).toBe('/assets/app.min.js')
    expect(normalizeArtifactPath('~/assets/app.min.js.map')).toBe('/assets/app.min.js.map')
    expect(normalizeArtifactPath('../private.map')).toBeNull()
    expect(sourceMapPathForFrame('https://example.com/assets/app.min.js')).toBe('/assets/app.min.js.map')
  })

  it('maps a generated frame and preserves unmatched frames', () => {
    const result = symbolicateStacktrace(
      [
        { filename: 'https://example.com/assets/app.min.js', function: 'a', line: 1, column: 0, inApp: true },
        { filename: 'https://example.com/assets/vendor.js', line: 1, column: 0 },
      ],
      [{ path: '/assets/app.min.js.map', content: sourceMap }],
    )
    expect(result).toMatchObject({ mappedFrameCount: 1, matchedArtifactCount: 1 })
    expect(result.frames).toEqual([
      { filename: 'src/app.ts', function: 'explode', line: 1, column: 0, inApp: true },
      { filename: 'https://example.com/assets/vendor.js', line: 1, column: 0 },
    ])
  })

  it('rejects malformed source maps', () => {
    expect(() => validateSourceMap('{"version":3}')).toThrow('valid mappings payload')
    expect(() => validateSourceMap('not-json')).toThrow('valid mappings payload')
  })

  it('scrubs local home directory names from mapped source paths', () => {
    const privatePathMap = JSON.stringify({
      version: 3,
      file: 'app.min.js',
      sources: ['file:///Users/private-name/project/src/app.ts'],
      names: [],
      mappings: 'AAAA',
    })
    const result = symbolicateStacktrace(
      [{ filename: '/assets/app.min.js', line: 1, column: 0 }],
      [{ path: '/assets/app.min.js.map', content: privatePathMap }],
    )
    expect(result.frames[0]?.filename).toBe('~/project/src/app.ts')
  })
})
