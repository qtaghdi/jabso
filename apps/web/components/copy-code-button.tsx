'use client'

import { useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

type CopyCodeButtonProps = {
  label?: string
  value: string
  variant?: ButtonProps['variant']
}

export const CopyCodeButton = ({ label = 'Copy', value, variant = 'ghost' }: CopyCodeButtonProps) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return <Button variant={variant} type="button" onClick={copy}>{copied ? 'Copied' : label}</Button>
}
