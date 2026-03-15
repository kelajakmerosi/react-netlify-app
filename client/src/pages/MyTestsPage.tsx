import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Clock3, Flame, GraduationCap, Layers3 } from 'lucide-react'
import { useApp, useLang } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import { Alert, ProgressBar } from '../components/ui'
import { GlassCard } from '../components/ui/GlassCard'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { getLearningVisual, getSubjectVisual } from '../utils/subjectVisuals'
import styles from './MyTestsPage.module.css'

const formatTimeOnTask = (sec: number) => {
  if (sec < 60) return `${sec}s`
  const mins = Math.round(sec / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
}

const formatRelativeDate = (ts: number, lang: string) => {
  const value = new Intl.DateTimeFormat(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))

  return value
}

export function MyTestsPage() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const { isGuest } = useAuth()
  const { subjects, byId } = useLearnerSubjects()
  const {
    getTopicData,
    getTopicStatus,
    lessonHistory,
    learningSummary,
    loadError,
    retryLoad,
    isHydrating,
  } = useApp()

  const topicLabel = useCallback((subjectId: string, topicId: string) => {
    const subject = byId.get(subjectId)
    const topic = subject?.topics.find((entry) => entry.id === topicId)

    return {
      subjectName: subject?.title || SUBJECT_NAMES[lang]?.[subjectId] || SUBJECT_NAMES.uz?.[subjectId] || subjectId,
      topicName: topic?.title || TOPIC_NAMES[lang]?.[topicId] || TOPIC_NAMES.uz?.[topicId] || topicId,
    }
  }, [byId, lang])

  const statusLabel = useCallback((status: ReturnType<typeof getTopicStatus>) => {
    if (status === 'completed') return t('completed')
    if (status === 'inprogress') return t('inProgress')
    if (status === 'onhold') return t('onHold')
    return t('locked')
  }, [getTopicStatus, t])

  const openTopic = useCallback((subjectId: string, topicId: string) => {
    navigate(`/subjects/${subjectId}/topics/${topicId}`)
  }, [navigate])

  const subjectRows = useMemo(() => {
    return subjects
      .map((subject) => {
        let completed = 0
        let inProgress = 0
        let total = 0
        let lastActivityAt = 0

        subject.topics.forEach((topic) => {
          total += 1
          const data = getTopicData(subject.id, topic.id)
          const status = getTopicStatus(subject.id, topic.id)
          if (status === 'completed') completed += 1
          if (status === 'inprogress' || status === 'onhold') inProgress += 1
          lastActivityAt = Math.max(lastActivityAt, data.lastActivityAt ?? 0)
        })

        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
        return {
          subject,
          completed,
          inProgress,
          total,
          completionPct,
          lastActivityAt,
        }
      })
      .filter((entry) => entry.completed > 0 || entry.inProgress > 0 || entry.lastActivityAt > 0)
      .sort((a, b) => {
        if (b.lastActivityAt !== a.lastActivityAt) return b.lastActivityAt - a.lastActivityAt
        if (b.completionPct !== a.completionPct) return b.completionPct - a.completionPct
        return a.subject.id.localeCompare(b.subject.id)
      })
  }, [getTopicData, getTopicStatus, subjects])

  const focusItems = useMemo(() => {
    const seen = new Set<string>()

    return [
      ...learningSummary.dueToday.map((item) => ({
        subjectId: item.subjectId,
        topicId: item.topicId,
        eyebrow: t('dueToday'),
        detail: t(`dueReason_${item.reason}`),
      })),
      ...learningSummary.weakTopics.map((item) => ({
        subjectId: item.subjectId,
        topicId: item.topicId,
        eyebrow: t('weakTopics'),
        detail: `${item.score}% ${t('score').toLowerCase()}`,
      })),
    ]
      .filter((item) => {
        const key = `${item.subjectId}_${item.topicId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 4)
      .map((item) => {
        const labels = topicLabel(item.subjectId, item.topicId)
        const data = getTopicData(item.subjectId, item.topicId)
        const status = getTopicStatus(item.subjectId, item.topicId)
        const visual = getLearningVisual(item.subjectId, item.topicId)

        return {
          ...item,
          ...labels,
          statusLabel: statusLabel(status),
          progress: typeof data.masteryScore === 'number'
            ? data.masteryScore
            : status === 'completed'
              ? 100
              : status === 'inprogress'
                ? 55
                : status === 'onhold'
                  ? 34
                  : 12,
          visual,
        }
      })
  }, [getTopicData, getTopicStatus, learningSummary.dueToday, learningSummary.weakTopics, statusLabel, t, topicLabel])

  const recentHistory = useMemo(() => {
    const seen = new Set<string>()

    return lessonHistory
      .filter((entry) => {
        const key = `${entry.subjectId}_${entry.topicId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 6)
      .map((entry) => {
        const labels = topicLabel(entry.subjectId, entry.topicId)
        const data = getTopicData(entry.subjectId, entry.topicId)
        const status = getTopicStatus(entry.subjectId, entry.topicId)

        return {
          ...entry,
          ...labels,
          statusLabel: statusLabel(status),
          lastActivityAt: data.lastActivityAt ?? entry.timestamp,
          masteryScore: data.masteryScore,
        }
      })
  }, [getTopicData, getTopicStatus, lessonHistory, statusLabel, topicLabel])

  const summaryCards = useMemo(() => ([
    {
      icon: <GraduationCap size={18} />,
      label: t('completion'),
      value: `${learningSummary.completionPct}%`,
      hint: `${learningSummary.completedTopics}/${learningSummary.totalTopics} ${t('topics').toLowerCase()}`,
    },
    {
      icon: <Layers3 size={18} />,
      label: t('subjects'),
      value: subjectRows.length,
      hint: t('myTestsSubjectsHint'),
    },
    {
      icon: <Flame size={18} />,
      label: t('streak'),
      value: learningSummary.streakDays,
      hint: `${learningSummary.streakDays} ${t('days')}`,
    },
    {
      icon: <Clock3 size={18} />,
      label: t('timeOnTask'),
      value: formatTimeOnTask(learningSummary.timeOnTaskSec),
      hint: t('myTestsTimeHint'),
    },
  ]), [learningSummary.completedTopics, learningSummary.completionPct, learningSummary.streakDays, learningSummary.timeOnTaskSec, subjectRows.length, t])

  const showEmptyState = !isHydrating && !focusItems.length && !subjectRows.length && !recentHistory.length

  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[{ label: t('myTests') }]}
        title={t('myTests')}
        actions={
          <div className={styles.headerActions}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              {t('home')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>
              {t('subjects')}
            </Button>
          </div>
        }
      />

      {isGuest ? (
        <Alert variant="warning" className={styles.banner}>
          {t('myTestsGuestText')}
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="warning" className={styles.banner}>
          <span>{loadError}</span>
          <Button variant="ghost" size="sm" onClick={retryLoad}>{t('retry')}</Button>
        </Alert>
      ) : null}

      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <GlassCard key={card.label} className={styles.statCard}>
            <div className={styles.statIcon}>{card.icon}</div>
            <p className={styles.statLabel}>{card.label}</p>
            <strong className={styles.statValue}>{card.value}</strong>
            <p className={styles.statHint}>{card.hint}</p>
          </GlassCard>
        ))}
      </section>

      {isHydrating ? (
        <div className={styles.loadingGrid}>
          <GlassCard className={styles.loadingCard}><div /></GlassCard>
          <GlassCard className={styles.loadingCard}><div /></GlassCard>
        </div>
      ) : null}

      {showEmptyState ? (
        <GlassCard className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <BookOpenCheck size={34} />
          </div>
          <h3 className={styles.emptyTitle}>{isGuest ? t('myTestsGuestTitle') : t('myTestsEmptyTitle')}</h3>
          <p className={styles.emptyText}>{isGuest ? t('myTestsGuestText') : t('myTestsEmptyText')}</p>
          <div className={styles.emptyActions}>
            <Button onClick={() => navigate('/subjects')}>{t('subjects')}</Button>
          </div>
        </GlassCard>
      ) : null}

      {!isHydrating && !showEmptyState ? (
        <>
          <section className={styles.contentGrid}>
            <GlassCard className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>{t('myTestsFocusTitle')}</p>
                  <h2 className={styles.panelTitle}>{t('dueToday')}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>
                  {t('browseLessons')}
                </Button>
              </div>

              {focusItems.length ? (
                <div className={styles.cardList}>
                  {focusItems.map((item) => (
                    <button
                      key={`${item.eyebrow}-${item.subjectId}-${item.topicId}`}
                      type="button"
                      className={styles.topicCard}
                      onClick={() => openTopic(item.subjectId, item.topicId)}
                    >
                      <span className={styles.topicThumb}>
                        <img src={item.visual.imageUrl} alt={item.visual.imageAlt} className={styles.topicThumbImage} />
                      </span>
                      <div className={styles.topicBody}>
                        <div className={styles.topicTop}>
                          <span className={styles.topicEyebrow}>{item.eyebrow}</span>
                          <span className={styles.topicStatus}>{item.statusLabel}</span>
                        </div>
                        <strong className={styles.topicTitle}>{item.topicName}</strong>
                        <p className={styles.topicMeta}>{item.subjectName} • {item.detail}</p>
                        <div className={styles.topicProgressRow}>
                          <ProgressBar value={item.progress} height={5} />
                          <span>{item.progress}%</span>
                        </div>
                      </div>
                      <ArrowRight size={16} className={styles.topicArrow} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPanel}>
                  <strong>{t('nothingDueToday')}</strong>
                  <p>{t('dashboardEmptyHint')}</p>
                </div>
              )}
            </GlassCard>

            <GlassCard className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>{t('myTestsSubjectsTitle')}</p>
                  <h2 className={styles.panelTitle}>{t('subjects')}</h2>
                </div>
              </div>

              {subjectRows.length ? (
                <div className={styles.subjectList}>
                  {subjectRows.map((item) => {
                    const visual = getSubjectVisual(item.subject.id)

                    return (
                      <button
                        key={item.subject.id}
                        type="button"
                        className={styles.subjectRow}
                        onClick={() => navigate(`/subjects/${item.subject.id}`)}
                      >
                        <span className={styles.subjectIcon} style={{ background: visual.media }}>
                          <visual.Icon size={18} />
                        </span>
                        <div className={styles.subjectBody}>
                          <div className={styles.subjectTop}>
                            <strong className={styles.subjectTitle}>{item.subject.title || SUBJECT_NAMES[lang]?.[item.subject.id] || SUBJECT_NAMES.uz?.[item.subject.id] || item.subject.id}</strong>
                            <span className={styles.subjectPct}>{item.completionPct}%</span>
                          </div>
                          <p className={styles.subjectMeta}>
                            {item.completed}/{item.total} {t('completed').toLowerCase()} • {item.inProgress} {t('inProgress').toLowerCase()}
                          </p>
                          <ProgressBar value={item.completionPct} height={5} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className={styles.emptyPanel}>
                  <strong>{t('myTestsNoSubjects')}</strong>
                  <p>{t('dashboardEmptyHint')}</p>
                </div>
              )}
            </GlassCard>
          </section>

          <GlassCard className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>{t('myTestsRecentTitle')}</p>
                <h2 className={styles.panelTitle}>{t('recentLessons')}</h2>
              </div>
            </div>

            {recentHistory.length ? (
              <div className={styles.activityList}>
                {recentHistory.map((entry) => (
                  <button
                    key={`${entry.subjectId}-${entry.topicId}-${entry.timestamp}`}
                    type="button"
                    className={styles.activityRow}
                    onClick={() => openTopic(entry.subjectId, entry.topicId)}
                  >
                    <div className={styles.activityBody}>
                      <strong className={styles.activityTitle}>{entry.topicName}</strong>
                      <p className={styles.activityMeta}>
                        {entry.subjectName} • {entry.statusLabel}
                      </p>
                    </div>
                    <div className={styles.activityAside}>
                      <span className={styles.activityTime}>{formatRelativeDate(entry.lastActivityAt, lang)}</span>
                      <span className={styles.activityScore}>
                        {typeof entry.masteryScore === 'number' ? `${entry.masteryScore}%` : '--'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <strong>{t('myTestsNoRecent')}</strong>
                <p>{t('dashboardEmptyHint')}</p>
              </div>
            )}
          </GlassCard>
        </>
      ) : null}
    </div>
  )
}
