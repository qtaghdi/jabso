type AuthTransitionProps = {
  label: string
}

export const AuthTransition = ({ label }: AuthTransitionProps) => (
  <div className="auth-transition" role="status" aria-live="polite">
    <span className="auth-transition-spinner" aria-hidden="true" />
    <strong>{label}</strong>
    <span>Preparing your Jabso workspace.</span>
  </div>
)
