'use client'

import { useEffect, useRef } from 'react'

export const useDisableClerkNativeValidation = () => {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const disableNativeValidation = () => {
      root.querySelectorAll('form').forEach((form) => {
        form.noValidate = true
      })
    }

    disableNativeValidation()
    const observer = new MutationObserver(disableNativeValidation)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return rootRef
}
