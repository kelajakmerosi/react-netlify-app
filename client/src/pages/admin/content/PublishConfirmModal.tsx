import { AlertTriangle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
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
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalBody}>
          <AlertTriangle size={14} aria-hidden="true" />
          {message}
        </p>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => void onConfirm()} disabled={busy}>
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
