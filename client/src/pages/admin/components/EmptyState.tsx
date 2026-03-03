import styles from '../AdminWorkspace.module.css'

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps): JSX.Element {
  return <div className={styles.emptyState}>{message}</div>
}

export default EmptyState
