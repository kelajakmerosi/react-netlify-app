import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, CheckCircle2, XCircle, Clock3, BarChart2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { useApp, useLang } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import { Alert, ProgressBar } from '../components/ui'
import { GlassCard } from '../components/ui/GlassCard'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import styles from './MyResultsPage.module.css'

/* ── helpers ─────────────────────────────────────────────── */
const fmtDate = (ts: number, lang: string) =>
  new Intl.DateTimeFormat(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))

const scoreColor = (pct: number) =>
  pct >= 80 ? 'var(--color-success, #22c55e)' : pct >= 50 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)'

const scoreEmoji = (pct: number) => (pct >= 80 ? '🏆' : pct >= 50 ? '📈' : '🔁')

/* ── types ───────────────────────────────────────────────── */
interface AttemptRow {
  subjectId: string
  topicId: string
  subjectName: string
  topicName: string
  score: number
  totalQuestions: number
  masteryScore: number
  attemptedAt: number
  pct: number
}

interface TopicGroup {
  subjectId: string
  topicId: string
  subjectName: string
  topicName: string
  attempts: AttemptRow[]
  bestPct: number
  latestAt: number
}

/* ── component ───────────────────────────────────────────── */
export function MyResultsPage() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  const { topicProgress, learningSummary, loadError, retryLoad, isHydrating } = useApp()
  const { byId } = useLearnerSubjects()

  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'topic'>('date')

  const toggle = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key))
  }, [])

  const topicLabel = useCallback((subjectId: string, topicId: string) => {
    const subject = byId.get(subjectId)
    const topic = subject?.topics.find((e) => e.id === topicId)
    return {
      subjectName: subject?.title || SUBJECT_NAMES[lang]?.[subjectId] || SUBJECT_NAMES.uz?.[subjectId] || subjectId,
      topicName: topic?.title || TOPIC_NAMES[lang]?.[topicId] || TOPIC_NAMES.uz?.[topicId] || topicId,
    }
  }, [byId, lang])

  /* Flatten all quizAttemptHistory records from topicProgress */
  const topicGroups = useMemo<TopicGroup[]>(() => {
    const map = new Map<string, TopicGroup>()

    Object.entries(topicProgress).forEach(([key, data]) => {
      const history = data.quizAttemptHistory
      if (!history || history.length === 0) return

      const [subjectId, topicId] = key.split('_')
      if (!subjectId || !topicId) return

      const { subjectName, topicName } = topicLabel(subjectId, topicId)

      const attempts: AttemptRow[] = history.map((h) => {
        const pct = h.totalQuestions > 0 ? Math.round((h.score / h.totalQuestions) * 100) : 0
        return { subjectId, topicId, subjectName, topicName, score: h.score, totalQuestions: h.totalQuestions, masteryScore: Math.round(h.masteryScore), attemptedAt: h.attemptedAt, pct }
      }).sort((a, b) => b.attemptedAt - a.attemptedAt)

      const bestPct = Math.max(...attempts.map((a) => a.pct))
      const latestAt = attempts[0].attemptedAt

      map.set(key, { subjectId, topicId, subjectName, topicName, attempts, bestPct, latestAt })
    })

    const rows = Array.from(map.values())

    if (sortBy === 'date') return rows.sort((a, b) => b.latestAt - a.latestAt)
    if (sortBy === 'score') return rows.sort((a, b) => b.bestPct - a.bestPct)
    return rows.sort((a, b) => a.topicName.localeCompare(b.topicName))
  }, [topicProgress, topicLabel, sortBy])

  const totalAttempts = useMemo(
    () => topicGroups.reduce((sum, g) => sum + g.attempts.length, 0),
    [topicGroups],
  )

  const avgBestPct = useMemo(() => {
    if (!topicGroups.length) return 0
    return Math.round(topicGroups.reduce((sum, g) => sum + g.bestPct, 0) / topicGroups.length)
  }, [topicGroups])

  const topicsPassed = useMemo(
    () => topicGroups.filter((g) => g.bestPct >= 80).length,
    [topicGroups],
  )

  const isEmpty = !isHydrating && topicGroups.length === 0

  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[{ label: t('myResults') }]}
        title={t('myResults')}
        actions={
          <div className={styles.headerActions}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>{t('subjects')}</Button>
          </div>
        }
      />

      {isGuest && (
        <Alert variant="warning" className={styles.banner}>
          {t('myResultsGuestText')}
        </Alert>
      )}

      {loadError && (
        <Alert variant="warning" className={styles.banner}>
          <span>{loadError}</span>
          <Button variant="ghost" size="sm" onClick={retryLoad}>{t('retry')}</Button>
        </Alert>
      )}

      {/* ── Summary cards ──────────────────────────────── */}
      <section className={styles.summaryGrid}>
        <GlassCard className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'color-mix(in srgb, #6a5cf2 16%, transparent)', color: '#6a5cf2' }}>
            <BarChart2 size={18} />
          </div>
          <p className={styles.statLabel}>{t('myResultsTotalAttempts')}</p>
          <strong className={styles.statValue}>{totalAttempts}</strong>
          <p className={styles.statHint}>{topicGroups.length} {t('topics').toLowerCase()}</p>
        </GlassCard>

        <GlassCard className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'color-mix(in srgb, #22c55e 16%, transparent)', color: '#22c55e' }}>
            <Trophy size={18} />
          </div>
          <p className={styles.statLabel}>{t('myResultsAvgScore')}</p>
          <strong className={styles.statValue} style={{ color: scoreColor(avgBestPct) }}>{avgBestPct}%</strong>
          <p className={styles.statHint}>{t('myResultsBestPerTopic')}</p>
        </GlassCard>

        <GlassCard className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'color-mix(in srgb, #22c55e 16%, transparent)', color: '#22c55e' }}>
            <CheckCircle2 size={18} />
          </div>
          <p className={styles.statLabel}>{t('myResultsPassed')}</p>
          <strong className={styles.statValue}>{topicsPassed}</strong>
          <p className={styles.statHint}>≥ 80% {t('myResultsThreshold')}</p>
        </GlassCard>

        <GlassCard className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'color-mix(in srgb, #f59e0b 16%, transparent)', color: '#f59e0b' }}>
            <Clock3 size={18} />
          </div>
          <p className={styles.statLabel}>{t('streak')}</p>
          <strong className={styles.statValue}>{learningSummary.streakDays}</strong>
          <p className={styles.statHint}>{t('days')}</p>
        </GlassCard>
      </section>

      {/* ── Loading skeleton ────────────────────────────── */}
      {isHydrating && (
        <GlassCard className={styles.skeleton}><div /></GlassCard>
      )}

      {/* ── Empty state ─────────────────────────────────── */}
      {isEmpty && (
        <GlassCard className={styles.emptyWrap}>
          <div className={styles.emptyIconWrap}>
            <Trophy size={36} />
          </div>
          <h3 className={styles.emptyTitle}>
            {isGuest ? t('myResultsGuestTitle') : t('myResultsEmptyTitle')}
          </h3>
          <p className={styles.emptyText}>
            {isGuest ? t('myResultsGuestText') : t('myResultsEmptyText')}
          </p>
          <div className={styles.emptyActions}>
            <Button onClick={() => navigate('/subjects')}>{t('subjects')}</Button>
          </div>
        </GlassCard>
      )}

      {/* ── Results list ────────────────────────────────── */}
      {!isHydrating && !isEmpty && (
        <GlassCard className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{t('myResultsHistoryEyebrow')}</p>
              <h2 className={styles.panelTitle}>{t('myResultsHistoryTitle')}</h2>
            </div>

            {/* Sort controls */}
            <div className={styles.sortRow}>
              <span className={styles.sortLabel}>{t('myResultsSortBy')}</span>
              {(['date', 'score', 'topic'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.sortBtn} ${sortBy === opt ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortBy(opt)}
                >
                  {t(`myResultsSort_${opt}`)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.groupList}>
            {topicGroups.map((group) => {
              const key = `${group.subjectId}_${group.topicId}`
              const isOpen = expandedKey === key

              return (
                <div key={key} className={styles.groupRow}>
                  {/* ── Topic row (always visible) ── */}
                  <button
                    type="button"
                    className={styles.groupHead}
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                  >
                    <span className={styles.groupEmoji}>{scoreEmoji(group.bestPct)}</span>

                    <div className={styles.groupInfo}>
                      <strong className={styles.groupTopic}>{group.topicName}</strong>
                      <span className={styles.groupSubject}>{group.subjectName}</span>
                    </div>

                    <div className={styles.groupStats}>
                      <span className={styles.groupAttemptCount}>{group.attempts.length}×</span>
                      <span className={styles.groupBest} style={{ color: scoreColor(group.bestPct) }}>
                        {group.bestPct}%
                      </span>
                      <span className={styles.groupBar}><ProgressBar value={group.bestPct} height={5} /></span>
                    </div>

                    <span className={styles.groupDate}>{fmtDate(group.latestAt, lang)}</span>

                    <span className={styles.chevron}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {/* ── Attempt breakdown (expanded) ── */}
                  {isOpen && (
                    <div className={styles.attemptList}>
                      <div className={styles.attemptHeader}>
                        <span>{t('myResultsAttemptNo')}</span>
                        <span>{t('score')}</span>
                        <span>{t('myResultsMastery')}</span>
                        <span>{t('myResultsDate')}</span>
                        <span>{t('myResultsResult')}</span>
                      </div>

                      {group.attempts.map((attempt, idx) => (
                        <div key={attempt.attemptedAt} className={styles.attemptRow}>
                          <span className={styles.attemptNum}>#{group.attempts.length - idx}</span>
                          <span className={styles.attemptScore}>
                            {attempt.score}/{attempt.totalQuestions}
                            <em className={styles.attemptPct} style={{ color: scoreColor(attempt.pct) }}>
                              {attempt.pct}%
                            </em>
                          </span>
                          <span className={styles.attemptMastery}>
                            <ProgressBar value={attempt.masteryScore} height={5} />
                            <em>{attempt.masteryScore}%</em>
                          </span>
                          <span className={styles.attemptDate}>{fmtDate(attempt.attemptedAt, lang)}</span>
                          <span className={styles.attemptResult}>
                            {attempt.pct >= 80
                              ? <CheckCircle2 size={16} color="#22c55e" />
                              : <XCircle size={16} color="#ef4444" />}
                          </span>
                        </div>
                      ))}

                      <div className={styles.attemptActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/subjects/${group.subjectId}/topics/${group.topicId}`)}
                        >
                          <BookOpen size={14} />
                          {t('myResultsRetake')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
