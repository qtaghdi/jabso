import { AcceptInvitation } from 'src/screens/auth/accept-invitation'
import { AuthPageShell } from 'src/screens/auth/auth-page-shell'

type AcceptInvitationPageProps = {
  searchParams: Promise<{ invitationId?: string }>
}

const AcceptInvitationPage = async ({ searchParams }: AcceptInvitationPageProps) => {
  const { invitationId = '' } = await searchParams

  return (
    <AuthPageShell description="Confirm the workspace invitation associated with your email." title="Join a Jabso workspace">
      {invitationId ? (
        <AcceptInvitation invitationId={invitationId} />
      ) : (
        <div className="auth-callout auth-callout-error" role="alert">
          <strong>Invitation unavailable</strong>
          <p>This invitation link is incomplete. Ask a workspace administrator to send a new invitation.</p>
        </div>
      )}
    </AuthPageShell>
  )
}

export default AcceptInvitationPage
