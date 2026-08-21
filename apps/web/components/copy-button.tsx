'use client'

import { useState } from 'react'

type CopyButtonProps = {
  label: string
  value: string
}

export const CopyButton = ({ label, value }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <button className="copy-button" type="button" onClick={copy} aria-label={label} title={copied ? 'Copied' : label}>
      <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="6" y="3" width="10" height="12" rx="1.5" /><path d="M13 17H5a2 2 0 0 1-2-2V7" /></svg>
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  )
}
