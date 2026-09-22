'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

type DialogProps = {
  children: ReactNode
  close: () => void
  closeLabel: string
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

const sizeClassNames = {
  lg: 'w-[min(720px,calc(100%-32px))]',
  md: 'w-[min(560px,calc(100%-32px))]',
  sm: 'w-[min(460px,calc(100%-32px))]',
} as const

export const Dialog = ({ children, close, closeLabel, description, eyebrow, icon, size = 'md', title }: DialogProps) => {
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
      className={`${sizeClassNames[size]} max-h-[calc(100dvh-32px)] overflow-auto overscroll-contain rounded-2xl border border-line-strong bg-white p-0 text-ink shadow-raised backdrop:bg-[#111316]/55 backdrop:backdrop-blur-[2px]`}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) close()
      }}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-7">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          {icon ? <span className="grid size-10 place-items-center rounded-xl bg-ink text-white [&_svg]:size-[22px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.7] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]">{icon}</span> : null}
          <div className="min-w-0">
            {eyebrow ? <p className="mb-0.5 text-[10px] font-bold tracking-[0.08em] text-muted uppercase">{eyebrow}</p> : null}
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.03em] text-balance" id={titleId}>{title}</h2>
          </div>
          <button aria-label={closeLabel} className="grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-muted hover:bg-subtle hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus/30 [&_svg]:size-4.5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.5]" onClick={close} type="button">
            <CloseIcon />
          </button>
        </header>
        {description ? <p className="my-5 text-[13px] leading-relaxed text-muted text-pretty" id={descriptionId}>{description}</p> : null}
        {children}
      </div>
    </dialog>
  )
}
