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
