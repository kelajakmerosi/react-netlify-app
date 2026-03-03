import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import styles from '../AdminWorkspace.module.css'

interface ConfirmActionModalProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  pendingLabel: string
  cancelLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps): JSX.Element | null {
  if (!open) return null

  return (
    <div className={styles.modalOverlay} onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirm-action-title">
        <h3 id="confirm-action-title" className={styles.modalTitle}>{title}</h3>
        <div className={styles.modalDescription}>{description}</div>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmActionModal
