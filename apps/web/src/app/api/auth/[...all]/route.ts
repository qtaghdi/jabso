import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from 'src/shared/auth/auth'

export const { GET, POST } = toNextJsHandler(auth)
