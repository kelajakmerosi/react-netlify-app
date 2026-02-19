import { StatusBadge, ProgressBar } from '../ui/index'
import { Button }                   from '../ui/Button'
import type { TopicStatus }         from '../../types'
import styles                       from './TopicRow.module.css'

interface TopicRowProps {
  name:         string
  status:       TopicStatus
  statusLabel:  string
  quizScore?:   number
  subjectColor: string
  subjectGrad:  string
  isCompleted:  boolean
  onOpen:       () => void
  onMarkInProgress: () => void
  onMarkOnHold:     () => void
  isLoggedIn:       boolean
}

export function TopicRow({
  name, status, statusLabel, quizScore,
  subjectColor, subjectGrad, isCompleted,
  onOpen, onMarkInProgress, onMarkOnHold, isLoggedIn,
}: TopicRowProps) {
  const pct = quizScore !== undefined ? Math.round((quizScore / 10) * 100) : 0

  return (
    <div className={styles.row}>
      {/* Status dot */}
      <div
        className={styles.dot}
        style={{ background: status === 'completed' ? '#6366f1'
          : status === 'inprogress' ? '#10b981'
          : status === 'onhold' ? '#f59e0b' : '#8892b0' }}
      />

      {/* Info */}
      <div className={styles.info}>
        <button
          className={`${styles.name} ${isCompleted ? styles.completed : ''}`}
          onClick={onOpen}
        >
          {name}
        </button>
        {quizScore !== undefined && (
          <div className={styles.bar}>
            <ProgressBar value={pct} color={subjectGrad} height={4} />
          </div>
        )}
      </div>

      {/* Score */}
      {quizScore !== undefined && (
        <span className={styles.score} style={{ color: subjectColor }}>
          {quizScore}/10
        </span>
      )}

      {/* Badge */}
      <StatusBadge status={status} label={statusLabel} />

      {/* Status actions */}
      {isLoggedIn && status !== 'completed' && (
        <div className={`${styles.actions} hide-mobile`}>
          {status !== 'inprogress' && (
            <Button variant="ghost" size="sm" onClick={onMarkInProgress}
              title="Mark in progress"
              style={{ width:32, height:32, padding:0, justifyContent:'center' }}>
              🟢
            </Button>
          )}
          {status !== 'onhold' && (
            <Button variant="ghost" size="sm" onClick={onMarkOnHold}
              title="Put on hold"
              style={{ width:32, height:32, padding:0, justifyContent:'center' }}>
              🟡
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
