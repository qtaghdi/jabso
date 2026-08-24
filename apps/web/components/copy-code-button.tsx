'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type CopyCodeButtonProps = { value: string }

export const CopyCodeButton = ({ value }: CopyCodeButtonProps) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return <Button variant="ghost" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
}
