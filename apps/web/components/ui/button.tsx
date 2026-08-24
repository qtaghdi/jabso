import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export const buttonClassName = (variant: ButtonVariant = 'primary', className?: string) =>
  ['ui-button', `ui-button-${variant}`, className].filter(Boolean).join(' ')

export const Button = ({ className, variant = 'primary', ...props }: ButtonProps) => (
  <button className={buttonClassName(variant, className)} {...props} />
)
