import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
}

export const Select = ({ className, label, children, ...props }: SelectProps) => (
  <label className={['ui-select', className].filter(Boolean).join(' ')}>
    <span className="sr-only">{label}</span>
    <select {...props}>{children}</select>
    <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
  </label>
)
