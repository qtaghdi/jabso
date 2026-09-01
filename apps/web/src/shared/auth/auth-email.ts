import 'server-only'

import { Resend } from 'resend'

type AuthEmailKind = 'password-reset' | 'verification'

type SendAuthEmailInput = {
  kind: AuthEmailKind
  to: string
  url: string
}

const getEmailConfiguration = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.JABSO_AUTH_EMAIL_FROM?.trim()

  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and JABSO_AUTH_EMAIL_FROM are required to send authentication email')
  }

  return { apiKey, from }
}

const escapeHtmlAttribute = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const getEmailContent = (kind: AuthEmailKind, url: string) => {
  const isVerification = kind === 'verification'
  const action = isVerification ? 'Verify email' : 'Reset password'
  const introduction = isVerification
    ? 'Verify this email address to finish creating your Jabso account.'
    : 'Use this link to choose a new password for your Jabso account.'
  const expiry = isVerification ? 'This link expires in one hour.' : 'This link expires in one hour and can only be used once.'

  const safeUrl = escapeHtmlAttribute(url)

  return {
    subject: isVerification ? 'Verify your Jabso email' : 'Reset your Jabso password',
    text: `${introduction}\n\n${action}: ${url}\n\n${expiry}\n\nIf you did not request this, you can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f6f8;color:#17191d;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:560px;margin:0 auto;padding:48px 24px"><div style="background:#fff;border:1px solid #dce1e7;border-radius:12px;padding:36px"><p style="margin:0 0 28px;font-size:22px;font-weight:750;letter-spacing:-0.04em">Jabso</p><h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;letter-spacing:-0.04em">${action}</h1><p style="margin:0 0 28px;color:#66707c;line-height:1.6">${introduction}</p><a href="${safeUrl}" style="display:inline-block;padding:13px 18px;border-radius:8px;background:#17191d;color:#fff;font-size:14px;font-weight:700;text-decoration:none">${action}</a><p style="margin:28px 0 0;color:#66707c;font-size:12px;line-height:1.6">${expiry}<br>If you did not request this, you can ignore this email.</p></div></div></body></html>`,
  }
}

export const sendAuthEmail = async ({ kind, to, url }: SendAuthEmailInput) => {
  const { apiKey, from } = getEmailConfiguration()
  const content = getEmailContent(kind, url)
  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    ...content,
  })

  if (error) throw new Error(`Authentication email delivery failed: ${error.name}`)
}
