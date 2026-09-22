import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'danger' | 'primary' | 'secondary' | 'ghost'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean
  variant?: ButtonVariant
}

const baseClassName = 'inline-flex min-h-10.5 touch-manipulation items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-semibold leading-none no-underline shadow-xs transition-[background-color,border-color,box-shadow,color,transform] duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus/35 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none'

const variantClassNames: Record<ButtonVariant, string> = {
  danger: 'border-danger bg-danger text-white hover:border-[#a72a1a] hover:bg-[#a72a1a]',
  ghost: 'min-h-8.5 border-transparent bg-transparent px-2.5 text-[#4e5864] shadow-none hover:bg-subtle-strong hover:text-ink',
  primary: 'border-[#171b21] bg-[#171b21] text-white hover:-translate-y-px hover:border-black hover:bg-black hover:shadow-md',
  secondary: 'border-line-strong bg-white text-ink hover:border-[#949ca6] hover:bg-subtle',
}

export const buttonClassName = (variant: ButtonVariant = 'primary', className?: string) =>
  [baseClassName, variantClassNames[variant], className].filter(Boolean).join(' ')

export const Button = ({ children, className, disabled, pending = false, variant = 'primary', ...props }: ButtonProps) => (
  <button
    aria-busy={pending || undefined}
    className={buttonClassName(variant, className)}
    disabled={disabled || pending}
    {...props}
  >
    {pending ? <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" /> : null}
    {children}
  </button>
)
