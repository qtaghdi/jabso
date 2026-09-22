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
    <label className={['grid min-w-0 gap-2', className].filter(Boolean).join(' ')} htmlFor={fieldId}>
      <span className="text-xs font-semibold text-[#3f4650]">{label}</span>
      <input
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={[
          'min-h-11 w-full rounded-lg border bg-white px-3.5 text-[13px] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-[#8a939e] focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/15',
          error ? 'border-danger' : 'border-line-strong',
        ].join(' ')}
        id={fieldId}
        {...props}
      />
      {hint || error ? <small className={error ? 'text-[11px] leading-snug text-danger' : 'text-[11px] leading-snug text-muted'} id={descriptionId}>{error ?? hint}</small> : null}
    </label>
  )
}
