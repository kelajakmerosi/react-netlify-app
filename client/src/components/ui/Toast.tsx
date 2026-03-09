import { useEffect, useState } from 'react'
import {
    CheckCircle2,
    AlertCircle,
    Info,
    X,
} from 'lucide-react'
import styles from './Toast.module.css'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
    id: string
    title: string
    description?: string
    type?: ToastType
    duration?: number
    onClose: (id: string) => void
}

const icons = {
    success: <CheckCircle2 size={20} aria-hidden="true" />,
    error: <AlertCircle size={20} aria-hidden="true" />,
    info: <Info size={20} aria-hidden="true" />,
}

export function Toast({
    id,
    title,
    description,
    type = 'info',
    duration = 5000,
    onClose,
}: ToastProps) {
    const [isRemoving, setIsRemoving] = useState(false)

    useEffect(() => {
        if (duration === Infinity) return

        const timer = setTimeout(() => {
            handleClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration])

    const handleClose = () => {
        setIsRemoving(true)
        setTimeout(() => {
            onClose(id)
        }, 200) // matches animation duration
    }

    return (
        <li
            className={`${styles.toast} ${styles[type]} ${isRemoving ? styles.removing : ''
                }`}
            role={type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
        >
            <div className={styles.icon}>{icons[type]}</div>
            <div className={styles.content}>
                <p className={styles.title}>{title}</p>
                {description ? <p className={styles.description}>{description}</p> : null}
            </div>
            <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close toast"
            >
                <X size={16} />
            </button>
        </li>
    )
}
