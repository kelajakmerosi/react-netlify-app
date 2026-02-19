import { useMemo } from 'react'
import { useAuth }          from '../hooks/useAuth'
import { useLang, useApp }  from '../hooks'
import { useSubjectStats }  from '../hooks/useSubjectStats'
import { GlassCard }        from '../components/ui/GlassCard'
import { ProgressBar, Alert, StatCard } from '../components/ui/index'
import { SUBJECTS, SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import { relativeTime }     from '../utils'
import type { PageId }      from '../types'
import styles               from './DashboardPage.module.css'

interface DashboardPageProps {
  onNavigate: (page: PageId, opts?: { subjectId?: string }) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, isGuest } = useAuth()
  const { t, lang }       = useLang()
  const { lessonHistory } = useApp()
  const subjectStats      = useSubjectStats()

  const totals = useMemo(() => subjectStats.reduce(
    (acc, s) => ({
      tests:     acc.tests     + s.tests,
      correct:   acc.correct   + s.correct,
      incorrect: acc.incorrect + s.incorrect,
      completed: acc.completed + s.completed,
      total:     acc.total     + s.total,
    }),
    { tests:0, correct:0, incorrect:0, completed:0, total:0 },
  ), [subjectStats])

  return (
    <div className={`page-content fade-in`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          {user ? `${t('welcome')}, ${user.name}!` : `${t('welcome')}! 👋`}
        </h2>
        <p className={styles.subtitle}>{t('startLearning')}</p>
      </div>

      {isGuest && (
        <Alert variant="warning" className="mb-24">
          {t('guestWarning')} — <strong>{t('loginToSave')}</strong>
        </Alert>
      )}

      {/* Stats row */}
      <div className={styles.statsGrid}>
        {([
          { icon:'📝', value: totals.tests,     label: t('totalTests')    },
          { icon:'✅', value: totals.correct,   label: t('correct')       },
          { icon:'❌', value: totals.incorrect, label: t('incorrect')     },
          { icon:'🏆', value: `${totals.completed}/${totals.total}`, label: t('completed') },
        ] as const).map(s => (
          <GlassCard key={s.label}>
            <StatCard icon={s.icon} value={s.value} label={s.label} />
          </GlassCard>
        ))}
      </div>

      {/* Subject progress */}
      <GlassCard padding={24} style={{ marginBottom: 24 }}>
        <h3 className={styles.sectionTitle}>📊 {t('progress')}</h3>
        <div className={styles.progressList}>
          {subjectStats.map(({ subject, completionPct }) => (
            <div key={subject.id}>
              <div className={`flex justify-between items-center mb-8`}>
                <div className={`flex items-center gap-8`}>
                  <span style={{ fontSize: 20 }}>{subject.icon}</span>
                  <span style={{ fontWeight: 600 }}>{SUBJECT_NAMES[lang][subject.id]}</span>
                </div>
                <span style={{ fontFamily:'var(--font-mono)', color:'var(--accent)', fontSize: 13 }}>
                  {completionPct}%
                </span>
              </div>
              <ProgressBar value={completionPct} color={subject.gradient} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent history */}
      {user && (
        <GlassCard padding={24}>
          <h3 className={styles.sectionTitle}>🕑 {t('recentLessons')}</h3>
          {lessonHistory.length === 0 ? (
            <p className="text-light text-sm">{t('noHistory')}</p>
          ) : (
            <div className={styles.historyList}>
              {lessonHistory.slice(0, 6).map(h => {
                const sub = SUBJECTS.find(s => s.id === h.subjectId)
                return (
                  <div key={`${h.topicId}_${h.timestamp}`} className={styles.historyItem}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{sub?.icon}</span>
                    <div className={styles.historyInfo}>
                      <span className={styles.historyTopic}>{TOPIC_NAMES[lang][h.topicId]}</span>
                      <span className={styles.historyMeta}>
                        {SUBJECT_NAMES[lang][h.subjectId]} · {relativeTime(h.timestamp, lang)}
                      </span>
                    </div>
                    {h.quizScore !== undefined && (
                      <span className={styles.historyScore}>{h.quizScore}/10</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
