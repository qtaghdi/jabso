import { useId, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  hint?: string
  label: string
}

export const Input = ({ className, error, hint, id, label, ...props }: InputProps) => {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = hint || error ? `${fieldId}-description` : undefined

  return (
    <label className={['ui-input', error && 'ui-input-error', className].filter(Boolean).join(' ')} htmlFor={fieldId}>
      <span className="ui-field-label">{label}</span>
      <input
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        id={fieldId}
        {...props}
      />
      {hint || error ? <small className="ui-field-message" id={descriptionId}>{error ?? hint}</small> : null}
    </label>
  )
}
