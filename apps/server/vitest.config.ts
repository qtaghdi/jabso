import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const serverRoot = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^src\/(.*)$/, replacement: `${serverRoot}src/$1` },
      { find: /^@domains\/(.*)$/, replacement: `${repositoryRoot}/domains/$1` },
    ],
  },
})
