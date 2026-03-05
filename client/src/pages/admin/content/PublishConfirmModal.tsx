import { AlertTriangle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui'
import { useLang } from '../../../hooks'
import styles from './ContentBuilder.module.css'

interface PublishConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  busyLabel?: string
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}

export default function PublishConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy = false,
  busyLabel,
  onCancel,
  onConfirm,
}: PublishConfirmModalProps): JSX.Element | null {
  const { t } = useLang()
  if (!open) return null

  return (
    <Modal
      open={open}
      title={title}
      dismissible={!busy}
      onClose={onCancel}
      footer={(
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={() => void onConfirm()} disabled={busy}>
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      )}
    >
      <p className={styles.modalBody}>
        <AlertTriangle size={14} aria-hidden="true" />
        {message}
      </p>
    </Modal>
  )
}
