import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  controlSize?: 'sm' | 'md'
  error?: string
  hideLabel?: boolean
  hint?: string
  label: string
}

export const Select = ({
  className,
  error,
  hideLabel = false,
  hint,
  label,
  controlSize = 'md',
  children,
  ...props
}: SelectProps) => {
  const fieldId = useId()
  const descriptionId = hint || error ? `${fieldId}-description` : undefined

  return (
    <label className={['ui-select', `ui-select-${controlSize}`, error && 'ui-select-error', className].filter(Boolean).join(' ')}>
      <span className={hideLabel ? 'sr-only' : 'ui-field-label'}>{label}</span>
      <span className="ui-select-control">
        <select aria-describedby={descriptionId} aria-invalid={error ? true : undefined} {...props}>{children}</select>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
      </span>
      {hint || error ? <small className="ui-field-message" id={descriptionId}>{error ?? hint}</small> : null}
    </label>
  )
}
