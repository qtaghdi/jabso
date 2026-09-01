const hasControlCharacters = (value: string) => Array.from(value)
  .some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)

const isSafeInternalPath = (value: string) => value.startsWith('/')
  && !value.startsWith('//')
  && !value.includes('\\')
  && !hasControlCharacters(value)

export const getSafeAuthRedirect = (value: string | null | undefined, fallback: string) =>
  value && isSafeInternalPath(value) ? value : fallback

export const getAuthRoute = (path: '/sign-in' | '/sign-up', redirect: string) => {
  const params = new URLSearchParams({ redirect })
  return `${path}?${params.toString()}`
}
