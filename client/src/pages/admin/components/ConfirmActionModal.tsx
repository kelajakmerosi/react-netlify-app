import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui'
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
    <Modal
      open={open}
      title={title}
      labelledBy="confirm-action-title"
      onClose={onCancel}
      footer={(
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      )}
    >
      <div className={styles.modalDescription}>{description}</div>
    </Modal>
  )
}

export default ConfirmActionModal
