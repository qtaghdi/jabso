type AuthClientError = {
  code?: string
  message?: string
  status?: number
}

export const isEmailNotVerifiedError = (error: AuthClientError | null | undefined) =>
  error?.code === 'EMAIL_NOT_VERIFIED'

export const getAuthErrorMessage = (
  error: AuthClientError | null | undefined,
  fallback: string,
) => error?.status === 429
  ? 'Too many attempts. Wait a few minutes and try again.'
  : error?.message ?? fallback

export const rememberPendingEmail = (email: string) => {
  window.sessionStorage.setItem('jabso-pending-email', email)
}

export const readPendingEmail = () => window.sessionStorage.getItem('jabso-pending-email') ?? ''

export const rememberPendingAuthRedirect = (redirect: string) => {
  window.sessionStorage.setItem('jabso-pending-auth-redirect', redirect)
}

export const readPendingAuthRedirect = (fallback: string) =>
  window.sessionStorage.getItem('jabso-pending-auth-redirect') ?? fallback

export const clearPendingAuth = () => {
  window.sessionStorage.removeItem('jabso-pending-email')
  window.sessionStorage.removeItem('jabso-pending-auth-redirect')
}
