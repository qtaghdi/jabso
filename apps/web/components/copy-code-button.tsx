'use client'

import { useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

type CopyCodeButtonProps = {
  iconOnly?: boolean
  label?: string
  value: string
  variant?: ButtonProps['variant']
}

const CopyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <rect x="6.5" y="6.5" width="9" height="9" rx="1.5" />
    <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
  </svg>
)

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <path d="m4.5 10.5 3.4 3.4 7.6-8" />
  </svg>
)

export const CopyCodeButton = ({ iconOnly = false, label = 'Copy', value, variant = 'ghost' }: CopyCodeButtonProps) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  const buttonLabel = copied ? 'Copied' : label
  const buttonContent = iconOnly ? (copied ? <CheckIcon /> : <CopyIcon />) : buttonLabel

  return (
    <Button
      className={iconOnly ? 'copy-icon-button' : undefined}
      variant={variant}
      type="button"
      aria-label={buttonLabel}
      title={buttonLabel}
      onClick={copy}
    >
      {buttonContent}
    </Button>
  )
}
