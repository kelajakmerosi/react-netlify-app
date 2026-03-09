import { type CSSProperties, useMemo, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLang, useApp } from '../hooks'
import { Alert, ProgressBar } from '../components/ui/index'
import { Button } from '../components/ui/Button'
import { SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import type { CurrentTopic, PageId, ResumeTarget } from '../types'
import { getLearningVisual, getSubjectVisual } from '../utils/subjectVisuals'
import { cn } from '../utils'
import { ArrowRight, BookOpen, Flame, LibraryBig } from 'lucide-react'
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
    loadError,
    retryLoad,
    getTopicStatus,
    getTopicData,
  } = useApp()

  const topicLabel = useCallback((subjectId: string, topicId: string) => {
    const subject = byId.get(subjectId)
    const topic = subject?.topics.find((entry) => entry.id === topicId)
    const subjectName = subject?.title || SUBJECT_NAMES[lang]?.[subjectId] || subjectId
    const topicName = topic?.title || TOPIC_NAMES[lang]?.[topicId] || topicId
    return {
      subjectName,
      topicName,
      full: `${subjectName} · ${topicName}`,
    }
  }, [byId, lang])

  const openTarget = useCallback((target: { subjectId: string; topicId: string } | null) => {
    if (!target) {
      onNavigate('subjects')
      return
    }

    onNavigate('topic', {
      topic: { subjectId: target.subjectId, topicId: target.topicId },
    })
  }, [onNavigate])

  const toReasonText = useCallback((reason: ResumeTarget['reason']) => {
    if (reason === 'resume') return t('resumeReason')
    if (reason === 'weak') return t('weakReason')
    return t('nextReason')
  }, [t])

  const dueTop = learningSummary.dueToday[0] ?? null
  const weakTop = learningSummary.weakTopics[0] ?? null
  const continueTarget = learningSummary.resumeTarget ?? learningSummary.recommendedNext
  const continueCards = useMemo(() => {
    const candidates = [
      continueTarget
        ? {
          ...continueTarget,
          reasonLabel: toReasonText(continueTarget.reason),
          railTag: t('continueLearning'),
          score: null as number | null,
        }
        : null,
      dueTop
        ? {
          subjectId: dueTop.subjectId,
          topicId: dueTop.topicId,
          reasonLabel: t(`dueReason_${dueTop.reason}`),
          railTag: t('dueToday'),
          score: null as number | null,
        }
        : null,
      weakTop
        ? {
          subjectId: weakTop.subjectId,
          topicId: weakTop.topicId,
          reasonLabel: t('focusWeakQuestions'),
          railTag: t('weakTopics'),
          score: weakTop.score,
        }
        : null,
      learningSummary.recommendedNext
        ? {
          ...learningSummary.recommendedNext,
          reasonLabel: toReasonText(learningSummary.recommendedNext.reason),
          railTag: t('recommendedNext'),
          score: null as number | null,
        }
        : null,
    ].filter(Boolean) as Array<{
      subjectId: string
      topicId: string
      reasonLabel: string
      railTag: string
      score: number | null
    }>

    const seen = new Set<string>()
    return candidates
      .filter((candidate) => {
        const key = `${candidate.subjectId}_${candidate.topicId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 2)
      .map((candidate) => {
        const labels = topicLabel(candidate.subjectId, candidate.topicId)
        const topicData = getTopicData(candidate.subjectId, candidate.topicId)
        const status = getTopicStatus(candidate.subjectId, candidate.topicId)

        const progress = typeof topicData.masteryScore === 'number'
          ? topicData.masteryScore
          : (status === 'completed' ? 100 : status === 'inprogress' ? 55 : status === 'onhold' ? 38 : 18)

        return {
          ...candidate,
          ...labels,
          progress,
          visual: getLearningVisual(candidate.subjectId, candidate.topicId),
        }
      })
  }, [continueTarget, dueTop, weakTop, learningSummary.recommendedNext, topicLabel, getTopicData, getTopicStatus, toReasonText, t])

  const leadCard = continueCards[0]
  const leadVisual = leadCard?.visual ?? getSubjectVisual()
  const FocusIcon = leadVisual.Icon
  const supportCards = useMemo(() => {
    const candidates = [
      dueTop
        ? {
          subjectId: dueTop.subjectId,
          topicId: dueTop.topicId,
          title: t('dueToday'),
          detail: t(`dueReason_${dueTop.reason}`),
        }
        : null,
      weakTop
        ? {
          subjectId: weakTop.subjectId,
          topicId: weakTop.topicId,
          title: t('weakTopics'),
          detail: t('focusWeakQuestions'),
        }
        : null,
      learningSummary.recommendedNext
        ? {
          subjectId: learningSummary.recommendedNext.subjectId,
          topicId: learningSummary.recommendedNext.topicId,
          title: t('recommendedNext'),
          detail: toReasonText(learningSummary.recommendedNext.reason),
        }
        : null,
    ].filter(Boolean) as Array<{
      subjectId: string
      topicId: string
      title: string
      detail: string
      visual?: ReturnType<typeof getSubjectVisual>
    }>

    const seen = new Set<string>()

    return candidates
      .filter((candidate) => {
        const key = `${candidate.subjectId}_${candidate.topicId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 3)
      .map((candidate) => ({
        ...candidate,
        ...topicLabel(candidate.subjectId, candidate.topicId),
        visual: getLearningVisual(candidate.subjectId, candidate.topicId),
      }))
  }, [dueTop, weakTop, learningSummary.recommendedNext, t, toReasonText, topicLabel])

  return (
    <div className={`page-content fade-in ${styles.dashboardPage}`}>
      <main className={styles.mainColumn}>
        <section className={styles.pageHeader}>
          <div className={styles.headerCopy}>
            <p className={styles.headerEyebrow}>{t('myLearning')}</p>
            <h1 className={styles.headerTitle}>
              {user?.name ? `${t('welcomeBack')}, ${user.name}` : t('myLearning')}
            </h1>
            <p className={styles.headerSubtitle}>
              {leadCard ? leadCard.full : t('dashboardEmptyHint')}
            </p>
          </div>
        </section>

        {isGuest && (
          <Alert variant="warning" className="mb-24">
            {t('guestWarning')} - <strong>{t('loginToSave')}</strong>
          </Alert>
        )}

        {loadError && (
          <div className={styles.errorCard}>
            <h3>{t('progressSyncIssue')}</h3>
            <p>{loadError}</p>
            <div className={styles.errorActions}>
              <Button onClick={retryLoad}>{t('retry')}</Button>
              <Button variant="ghost" onClick={() => onNavigate('subjects')}>{t('browseLessons')}</Button>
              <Button variant="ghost" onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}` }}>
                {t('contactSupport')}
              </Button>
            </div>
          </div>
        )}

        <div
          className={styles.resumeCard}
          style={{ '--focus-media': leadVisual.media } as CSSProperties}
        >
          <div className={styles.resumeAccent} />
          <div className={styles.resumeContent}>
            <div className={styles.resumeMain}>
              <div className={styles.resumeBody}>
                <div className={styles.resumeTop}>
                  <span className={styles.resumeIcon} aria-hidden="true">
                    <FocusIcon size={20} />
                  </span>
                  <span className={styles.resumeTag}>{t('continueLearning')}</span>
                </div>

                <div className={styles.resumeHeading}>
                  <p className={styles.resumeEyebrow}>{leadCard?.subjectName || t('subjects')}</p>
                  <h2 className={styles.resumeTitle}>{leadCard?.topicName || t('startWithFirstLesson')}</h2>
                  <p className={styles.resumeMeta}>
                    {leadCard ? leadCard.reasonLabel : t('dashboardEmptyHint')}
                  </p>
                </div>

                {leadCard && (
                  <div className={styles.resumeProgress}>
                    <div className={styles.resumeProgressRow}>
                      <span>{t('progress')}</span>
                      <strong>{leadCard.progress}%</strong>
                    </div>
                    <ProgressBar value={leadCard.progress} height={5} />
                  </div>
                )}

                <div className={styles.resumeActions}>
                  <Button onClick={() => openTarget(leadCard ?? null)}>{t('continue')}</Button>
                  <Button variant="ghost" onClick={() => onNavigate('subjects')}>{t('browseLessons')}</Button>
                </div>
              </div>

              <div className={styles.resumePreview}>
                <img src={leadVisual.imageUrl} alt={leadVisual.imageAlt} className={styles.resumePreviewImage} />
              </div>
            </div>
          </div>
        </div>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}><span className={styles.summaryIcon} aria-hidden="true"><BookOpen size={14} /></span>{t('completion')}</span>
            <strong className={styles.summaryValue}>{learningSummary.completionPct}%</strong>
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}><span className={styles.summaryIcon} aria-hidden="true"><Flame size={14} /></span>{t('streak')}</span>
            <strong className={styles.summaryValue}>{learningSummary.streakDays}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}><span className={styles.summaryIcon} aria-hidden="true"><LibraryBig size={14} /></span>{t('timeOnTask')}</span>
            <strong className={styles.summaryValue}>{formatTimeOnTask(learningSummary.timeOnTaskSec)}</strong>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{t('dueToday')}</h2>
            </div>
          </div>

          <div className={styles.supportGrid}>
            {supportCards.length ? supportCards.map((card) => (
              <button
                key={`${card.title}-${card.subjectId}-${card.topicId}`}
                type="button"
                className={styles.supportCard}
                onClick={() => openTarget({ subjectId: card.subjectId, topicId: card.topicId })}
              >
                <span className={styles.supportAccent} />
                <div className={styles.supportBody}>
                  <div className={styles.supportCardHead}>
                    <div className={styles.supportCardLead}>
                      <span className={styles.supportThumb}>
                        <img src={card.visual?.imageUrl} alt={card.visual?.imageAlt || ''} className={styles.supportThumbImage} />
                      </span>
                      <span className={styles.supportCardTag}>{card.title}</span>
                    </div>
                    <ArrowRight size={14} />
                  </div>
                  <strong className={styles.supportCardTitle}>{card.topicName}</strong>
                  <div className={styles.supportCardBottom}>
                    <span className={styles.supportCardMeta}>{card.subjectName}</span>
                    <span className={styles.supportCardHint}>{card.detail}</span>
                  </div>
                </div>
              </button>
            )) : (
              <div className={styles.emptySupport}>
                <strong>{t('nothingDueToday')}</strong>
                <p>{t('dashboardEmptyHint')}</p>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{t('continueLearning')}</h2>
              <p className={styles.sectionHint}>
                {leadCard ? `${leadCard.subjectName} • ${leadCard.reasonLabel}` : t('dashboardEmptyHint')}
              </p>
            </div>
            <button type="button" className={styles.linkButton} onClick={() => onNavigate('subjects')}>
              {t('browseLessons')}
            </button>
          </div>

          <div className={styles.lessonGrid}>
            {continueCards.length ? continueCards.map((card, idx) => {
              const Icon = card.visual.Icon

              return (
                <button
                  key={`${card.subjectId}-${card.topicId}`}
                  type="button"
                  className={cn(styles.lessonCard, idx === 0 && styles.lessonCardPrimary)}
                  onClick={() => openTarget(card)}
                >
                  <span
                    className={styles.lessonCardStrip}
                    style={{ background: card.visual.media } as CSSProperties}
                  />
                  <div className={styles.lessonCardBody}>
                    <div className={styles.lessonCardTop}>
                      <span className={styles.lessonCardThumb}>
                        <img src={card.visual.imageUrl} alt={card.visual.imageAlt} className={styles.lessonCardThumbImage} />
                      </span>
                      <span className={styles.lessonCardIcon} aria-hidden="true" style={{ background: card.visual.media } as CSSProperties}>
                        <Icon size={14} />
                      </span>
                      <div className={styles.lessonCardMeta}>
                        <p className={styles.lessonCardSubject}>{card.subjectName}</p>
                        <h3 className={styles.lessonCardTitle}>{card.topicName}</h3>
                      </div>
                      <ArrowRight size={16} className={styles.lessonCardArrow} />
                    </div>
                    <p className={styles.lessonCardDescription}>{card.reasonLabel}</p>
                    <div className={styles.lessonCardStats}>
                      <span>{card.railTag}</span>
                      <span>{t('progress')}: {card.progress}%</span>
                    </div>
                  </div>
                </button>
              )
            }) : (
              <div className={styles.emptyWatchState}>
                <h3>{t('startWithFirstLesson')}</h3>
                <p>{t('dashboardEmptyHint')}</p>
                <Button onClick={() => onNavigate('subjects')}>{t('browseLessons')}</Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
