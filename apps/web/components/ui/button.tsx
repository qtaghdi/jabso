import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'danger' | 'primary' | 'secondary' | 'ghost'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean
  variant?: ButtonVariant
}

export const buttonClassName = (variant: ButtonVariant = 'primary', className?: string) =>
  ['ui-button', `ui-button-${variant}`, className].filter(Boolean).join(' ')

export const Button = ({ children, className, disabled, pending = false, variant = 'primary', ...props }: ButtonProps) => (
  <button
    aria-busy={pending || undefined}
    className={buttonClassName(variant, className)}
    disabled={disabled || pending}
    {...props}
  >
    {pending ? <span aria-hidden="true" className="ui-button-spinner" /> : null}
    {children}
  </button>
)
