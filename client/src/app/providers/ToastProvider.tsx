import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { Toast, ToastProps } from '../../components/ui/Toast'
import styles from '../../components/ui/Toast.module.css'

type CreateToastParams = Omit<ToastProps, 'id' | 'onClose'>

interface ToastContextValue {
    toast: (params: CreateToastParams) => void
    success: (title: string, description?: string) => void
    error: (title: string, description?: string) => void
    info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastProps[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toast = useCallback((params: CreateToastParams) => {
        const id = crypto.randomUUID()
        setToasts((prev) => [...prev, { ...params, id, onClose: removeToast }])
    }, [removeToast])

    const success = useCallback((title: string, description?: string) => {
        toast({ title, description, type: 'success' })
    }, [toast])

    const error = useCallback((title: string, description?: string) => {
        toast({ title, description, type: 'error' })
    }, [toast])

    const info = useCallback((title: string, description?: string) => {
        toast({ title, description, type: 'info' })
    }, [toast])

    const value = useMemo(() => ({ toast, success, error, info }), [toast, success, error, info])

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ul className={styles.viewport} aria-label="Notifications">
                {toasts.map((t) => (
                    <Toast key={t.id} {...t} />
                ))}
            </ul>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
