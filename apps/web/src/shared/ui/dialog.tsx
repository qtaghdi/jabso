'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

type DialogProps = {
  children: ReactNode
  close: () => void
  description?: string
  eyebrow?: string
  icon?: ReactNode
  size?: 'lg' | 'sm' | 'md'
  title: string
}

const CloseIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
)

export const Dialog = ({ children, close, description, eyebrow, icon, size = 'md', title }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    dialog?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`ui-dialog ui-dialog-${size}`}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) close()
      }}
      ref={dialogRef}
    >
      <div className="ui-dialog-surface">
        <header className="ui-dialog-header">
          {icon ? <span className="ui-dialog-icon">{icon}</span> : null}
          <div>
            {eyebrow ? <p>{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button aria-label="Close dialog" className="ui-dialog-close" onClick={close} type="button">
            <CloseIcon />
          </button>
        </header>
        {description ? <p className="ui-dialog-description" id={descriptionId}>{description}</p> : null}
        {children}
      </div>
    </dialog>
  )
}
