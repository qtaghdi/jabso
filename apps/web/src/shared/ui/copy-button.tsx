'use client'

import { useState } from 'react'

type CopyButtonProps = {
  copiedLabel?: string
  label: string
  value: string
}

export const CopyButton = ({ copiedLabel = 'Copied', label, value }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <button className="grid size-8.5 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-[#4e5864] hover:bg-subtle-strong hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus/30" type="button" onClick={copy} aria-label={label} title={copied ? copiedLabel : label}>
      <svg aria-hidden="true" className="size-4.5 fill-none stroke-current stroke-[1.6]" viewBox="0 0 20 20"><rect x="6" y="3" width="10" height="12" rx="1.5" /><path d="M13 17H5a2 2 0 0 1-2-2V7" /></svg>
      <span className="sr-only" aria-live="polite">{copied ? copiedLabel : ''}</span>
    </button>
  )
}
