import React, { Component, ErrorInfo } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'
import { Button } from './Button'
import styles from './ErrorBoundary.module.css'

interface Props {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    handleReload = () => {
        window.location.reload()
    }

    handleHome = () => {
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className={styles.container}>
                    <div className={styles.icon}>
                        <AlertOctagon size={48} aria-hidden="true" />
                    </div>
                    <h2 className={styles.title}>Something went wrong</h2>
                    <p className={styles.message}>
                        An unexpected error occurred in this part of the application.
                        Our team has been notified.
                    </p>
                    <div className={styles.actions}>
                        <Button variant="ghost" onClick={this.handleReload} className="flex items-center gap-2 justify-center">
                            <RotateCcw size={18} />
                            <span>Try Again</span>
                        </Button>
                        <Button variant="primary" onClick={this.handleHome} className="flex items-center gap-2 justify-center">
                            <Home size={18} />
                            <span>Return Home</span>
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
