import { useAuth } from '../hooks/useAuth'
import { useLang, useApp } from '../hooks'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/index'
import { SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { Clock3, Compass, Flame, PlayCircle, Target, Trophy } from 'lucide-react'
import type { CurrentTopic, PageId, ResumeTarget } from '../types'
import styles from './DashboardPage.module.css'

interface DashboardPageProps {
  onNavigate: (page: PageId, opts?: { subjectId?: string; topic?: CurrentTopic }) => void
}

const SUPPORT_EMAIL = 'support@kelajakmerosi.app'

const formatTimeOnTask = (sec: number) => {
  if (sec < 60) return `${sec}s`
  const mins = Math.round(sec / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, isGuest } = useAuth()
  const { t, lang } = useLang()
  const { byId } = useLearnerSubjects()
  const {
    learningSummary,
    isHydrating,
    loadError,
    retryLoad,
    lessonHistory,
  } = useApp()

  const topicLabel = (subjectId: string, topicId: string) => {
    const subject = byId.get(subjectId)
    const topic = subject?.topics.find((entry) => entry.id === topicId)
    const subjectName = subject?.title || SUBJECT_NAMES[lang]?.[subjectId] || subjectId
    const topicName = topic?.title || TOPIC_NAMES[lang]?.[topicId] || topicId
    return `${subjectName} · ${topicName}`
  }

  const openTarget = (target: { subjectId: string; topicId: string } | null) => {
    if (!target) {
      onNavigate('subjects')
      return
    }

    onNavigate('topic', {
      topic: { subjectId: target.subjectId, topicId: target.topicId },
    })
  }

  const toReasonText = (reason: ResumeTarget['reason']) => {
    if (reason === 'resume') return t('resumeReason')
    if (reason === 'weak') return t('weakReason')
    return t('nextReason')
  }

  const dueTop = learningSummary.dueToday[0] ?? null
  const weakTop = learningSummary.weakTopics[0] ?? null
  const continueTarget = learningSummary.resumeTarget ?? learningSummary.recommendedNext

  const cards = [
    {
      id: 'continue',
      icon: <PlayCircle size={20} />,
      title: t('continueLearning'),
      body: continueTarget
        ? topicLabel(continueTarget.subjectId, continueTarget.topicId)
        : t('noLessonToResume'),
      kicker: continueTarget ? toReasonText(continueTarget.reason) : t('startLearningNow'),
      action: continueTarget ? t('resume') : t('startLearningNow'),
      actionVariant: 'primary' as const,
      onClick: () => openTarget(continueTarget),
      disabled: false,
    },
    {
      id: 'due',
      icon: <Clock3 size={20} />,
      title: t('dueToday'),
      body: dueTop
        ? topicLabel(dueTop.subjectId, dueTop.topicId)
        : t('nothingDueToday'),
      kicker: dueTop ? t(`dueReason_${dueTop.reason}`) : t('browseLessons'),
      action: dueTop ? t('startDueLesson') : t('browseLessons'),
      actionVariant: 'primary' as const,
      onClick: () => openTarget(dueTop),
      disabled: false,
    },
    {
      id: 'weak',
      icon: <Target size={20} />,
      title: t('weakTopics'),
      body: weakTop
        ? topicLabel(weakTop.subjectId, weakTop.topicId)
        : t('noWeakTopics'),
      kicker: weakTop ? `${weakTop.score}%` : t('review'),
      action: weakTop ? t('reviewMistakes') : t('takeQuiz'),
      actionVariant: 'ghost' as const,
      onClick: () => openTarget(weakTop),
      disabled: false,
    },
    {
      id: 'recommended',
      icon: <Compass size={20} />,
      title: t('recommendedNext'),
      body: learningSummary.recommendedNext
        ? topicLabel(learningSummary.recommendedNext.subjectId, learningSummary.recommendedNext.topicId)
        : t('noRecommendationYet'),
      kicker: learningSummary.recommendedNext ? toReasonText(learningSummary.recommendedNext.reason) : t('browseLessons'),
      action: learningSummary.recommendedNext ? t('startLesson') : t('browseLessons'),
      actionVariant: 'ghost' as const,
      onClick: () => openTarget(learningSummary.recommendedNext),
      disabled: false,
    },
  ]

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {user ? `${t('welcome')}, ${user.name}!` : `${t('welcome')}!`}
        </h2>
        <p className={styles.subtitle}>{t('startLearning')}</p>
      </div>

      {isGuest && (
        <Alert variant="warning" className="mb-24">
          {t('guestWarning')} — <strong>{t('loginToSave')}</strong>
        </Alert>
      )}

      {loadError && (
        <GlassCard padding={20} className={styles.stateCard}>
          <h3 className={styles.stateTitle}>{t('progressSyncIssue')}</h3>
          <p className={styles.stateText}>{loadError}</p>
          <div className={styles.stateActions}>
            <Button onClick={retryLoad}>{t('retry')}</Button>
            <Button variant="ghost" onClick={() => onNavigate('subjects')}>{t('goBack')}</Button>
            <Button
              variant="ghost"
              onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}` }}
            >
              {t('contactSupport')}
            </Button>
          </div>
        </GlassCard>
      )}

      <div className={styles.metricsGrid}>
        <GlassCard padding={18} className={styles.metricCard}>
          <span className={styles.metricLabel}>{t('completion')}</span>
          <div className={styles.metricValue}><Trophy size={18} /> {learningSummary.completionPct}%</div>
          <span className={styles.metricMeta}>{learningSummary.completedTopics}/{learningSummary.totalTopics}</span>
        </GlassCard>

        <GlassCard padding={18} className={styles.metricCard}>
          <span className={styles.metricLabel}>{t('streak')}</span>
          <div className={styles.metricValue}><Flame size={18} /> {learningSummary.streakDays}</div>
          <span className={styles.metricMeta}>{t('days')}</span>
        </GlassCard>

        <GlassCard padding={18} className={styles.metricCard}>
          <span className={styles.metricLabel}>{t('timeOnTask')}</span>
          <div className={styles.metricValue}><Clock3 size={18} /> {formatTimeOnTask(learningSummary.timeOnTaskSec)}</div>
          <span className={styles.metricMeta}>
            {learningSummary.lastActivityAt ? new Date(learningSummary.lastActivityAt).toLocaleDateString() : t('noActivityYet')}
          </span>
        </GlassCard>
      </div>

      {isHydrating ? (
        <div className={styles.cardGrid}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className={styles.skeletonCard}>
              <div className={styles.skeletonLineLg} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineSm} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {cards.map(card => (
            <GlassCard key={card.id} padding={20} className={styles.actionCard}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>{card.icon}</span>
                <h3 className={styles.cardTitle}>{card.title}</h3>
              </div>
              <p className={styles.cardKicker}>{card.kicker}</p>
              <p className={styles.cardBody}>{card.body}</p>
              <Button variant={card.actionVariant} fullWidth onClick={card.onClick} disabled={card.disabled}>
                {card.action}
              </Button>
            </GlassCard>
          ))}
        </div>
      )}

      {!isHydrating && lessonHistory.length === 0 && (
        <GlassCard padding={20} className={`${styles.stateCard} ${styles.emptyStateCard}`}>
          <h3 className={styles.stateTitle}>{t('startWithFirstLesson')}</h3>
          <p className={styles.stateText}>{t('dashboardEmptyHint')}</p>
          <Button onClick={() => onNavigate('subjects')}>{t('browseLessons')}</Button>
        </GlassCard>
      )}
    </div>
  )
}
