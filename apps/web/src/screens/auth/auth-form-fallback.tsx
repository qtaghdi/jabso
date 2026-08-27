type AuthFormFallbackProps = {
  label: string
}

export const AuthFormFallback = ({ label }: AuthFormFallbackProps) => (
  <div className="auth-sign-in-fallback" role="status" aria-label={label}>
    <div className="auth-fallback-button" />
    <div className="auth-fallback-divider" />
    <div className="auth-fallback-label" />
    <div className="auth-fallback-input" />
    <div className="auth-fallback-button auth-fallback-button-secondary" />
    <span className="sr-only">{label}</span>
  </div>
)
