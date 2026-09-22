'use client'

import { Button } from 'src/shared/ui/button'
import { Dialog } from 'src/shared/ui/dialog'

type AlertDialogProps = {
  cancel: () => void
  cancelLabel: string
  closeLabel: string
  confirm: () => void
  description: string
  confirmLabel: string
  error?: string
  pending?: boolean
  title: string
}

const WarningIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3 2.8 20h18.4L12 3Z" />
    <path d="M12 9v5m0 3h.01" />
  </svg>
)

export const AlertDialog = ({
  cancel,
  cancelLabel,
  closeLabel,
  confirm,
  confirmLabel,
  description,
  error,
  pending = false,
  title,
}: AlertDialogProps) => (
  <Dialog close={cancel} closeLabel={closeLabel} description={description} icon={<WarningIcon />} size="sm" title={title}>
    {error ? <p className="m-0 text-xs text-danger" role="alert">{error}</p> : null}
    <div className="mt-1 flex justify-end gap-2.5">
      <Button data-dialog-initial-focus disabled={pending} onClick={cancel} type="button" variant="secondary">{cancelLabel}</Button>
      <Button onClick={confirm} pending={pending} type="button" variant="danger">{confirmLabel}</Button>
    </div>
  </Dialog>
)
