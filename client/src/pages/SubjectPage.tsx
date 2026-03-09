import { useMemo } from 'react'
import { useLang, useApp } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { SUBJECT_NAMES, TOPIC_NAMES, MODULE_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Divider, Alert, PageHeader } from '../components/ui/index'
import { Skeleton } from '../components/ui/Skeleton'
import { TopicRow } from '../components/features/TopicRow'
import type { CurrentTopic, TopicProgressData, TopicStatus } from '../types'
import { renderSafeIcon } from '../utils/renderSafeIcon'
import styles from './SubjectPage.module.css'

interface SubjectPageProps {
  subjectId: string
  onBack: () => void
  onTopicSelect: (topic: CurrentTopic) => void
}

interface TopicAction {
  label: string
  hint: string
}

const toScorePct = (data: TopicProgressData, totalQuestions?: number) => {
  if (typeof data.masteryScore === 'number') return data.masteryScore
  if (typeof data.quizScore === 'number') {
    const fromHistory = data.quizAttemptHistory?.[0]?.totalQuestions
    const safeTotal = totalQuestions ?? data.quizTotalQuestions ?? fromHistory ?? 10
    if (!safeTotal || safeTotal <= 0) return 0
    return Math.round((data.quizScore / safeTotal) * 100)
  }
  return 0
}

export function SubjectPage({ subjectId, onBack, onTopicSelect }: SubjectPageProps) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { byId, loading: loadingSubject, error: subjectLoadError } = useLearnerSubjects()
  const {
    getTopicStatus,
    getTopicData,
    updateTopicProgress,
    isHydrating,
    loadError,
    retryLoad,
  } = useApp()

  const subject = byId.get(subjectId)
  const statusLabels = {
    completed: t('completed'),
    inprogress: t('inProgress'),
    onhold: t('onHold'),
    locked: t('locked'),
  } as const

  const buildAction = (status: TopicStatus, data: TopicProgressData, totalQuestions: number): TopicAction => {
    const scorePct = toScorePct(data, totalQuestions)

    if (status === 'completed' && scorePct < 85) {
      return { label: t('reviewMistakes'), hint: t('focusWeakQuestions') }
    }

    if (status === 'completed') {
      return { label: t('reviewLesson'), hint: t('lessonCompletedHint') }
    }

    if (data.videoWatched && !data.quizSubmitted) {
      return { label: t('startQuiz'), hint: t('quizPendingHint') }
    }

    if (status === 'inprogress' || status === 'onhold') {
      return { label: t('resume'), hint: t('resumeWhereLeft') }
    }

    return { label: t('startLesson'), hint: t('beginModule') }
  }

  const moduleBlocks = useMemo(() => {
    if (!subject) return []

    return subject.modules.map(module => {
      const lessons = module.topicIds
        .map(topicId => subject.topics.find(topic => topic.id === topicId))
        .filter((topic): topic is (typeof subject.topics)[number] => Boolean(topic))

      return {
        module,
        lessons,
      }
    })
  }, [subject])

  if (!subject && !loadingSubject) {
    return (
      <div className="page-content fade-in">
        <Alert variant="warning">Subject not found.</Alert>
        <Button variant="ghost" size="sm" onClick={onBack} style={{ marginTop: 12 }}>← {t('back')}</Button>
      </div>
    )
  }
  if (!subject) {
    return (
      <div className="page-content fade-in">
        <Skeleton width={180} height={18} borderRadius={6} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={80} borderRadius="var(--radius-md)" style={{ marginBottom: 24 }} />
        <GlassCard style={{ overflow: 'hidden' }}>
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} width="100%" height={62} borderRadius="var(--radius-md)" />
            ))}
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[
          { label: t('lessons'), onClick: onBack },
          { label: subject.title || SUBJECT_NAMES[lang]?.[subject.id] || subject.id }
        ]}
        title=""
      />

      <div className={styles.header}>
        <div className={styles.iconWrap} style={{ background: subject.gradient }}>
          <span className={styles.iconGlyph}>{renderSafeIcon(subject.icon)}</span>
        </div>
        <div>
          <h2 className={styles.title} style={{ color: subject.color }}>
            {subject.title || SUBJECT_NAMES[lang]?.[subject.id] || subject.id}
          </h2>
          <p className={styles.meta}>{subject.topics.length} {t('lessons')}</p>
        </div>
      </div>

      {subjectLoadError ? (
        <Alert variant="warning" className={styles.syncWarning}>
          {subjectLoadError}
        </Alert>
      ) : null}

      {loadError && (
        <Alert variant="info" className={styles.syncWarning}>
          {loadError}
          <Button variant="ghost" size="sm" onClick={retryLoad}>{t('retry')}</Button>
        </Alert>
      )}

      {isHydrating ? (
        <GlassCard style={{ padding: 20 }}>
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} width="100%" height={62} borderRadius="var(--radius-md)" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <div className={styles.moduleList}>
          {moduleBlocks.map(({ module, lessons }) => (
            <GlassCard key={module.id} style={{ overflow: 'hidden' }}>
              <div className={styles.moduleHeader}>
                <h3 className={styles.moduleTitle}>{MODULE_NAMES[lang]?.[module.track] || t('topics')}</h3>
                <p className={styles.moduleMeta}>{lessons.length} {t('lessons')}</p>
              </div>

              {lessons.map((topic, idx) => {
                const status = getTopicStatus(subject.id, topic.id)
                const data = getTopicData(subject.id, topic.id)
                const action = buildAction(status, data, topic.questions.length)

                const handleOpen = () => {
                  if (user && status === 'locked') {
                    updateTopicProgress(subject.id, topic.id, { status: 'inprogress' })
                  }

                  if (user && (status === 'inprogress' || status === 'onhold')) {
                    updateTopicProgress(subject.id, topic.id, { status: 'inprogress' })
                  }

                  onTopicSelect({ subjectId: subject.id, topicId: topic.id })
                }

                return (
                  <div key={topic.id}>
                    <TopicRow
                      name={topic.title || TOPIC_NAMES[lang]?.[topic.id] || topic.id}
                      status={status}
                      statusLabel={statusLabels[status]}
                      quizScore={data.quizScore ?? undefined}
                      masteryScore={data.masteryScore ?? undefined}
                      totalQuestions={topic.questions.length}
                      subjectColor={subject.color}
                      subjectGrad={subject.gradient}
                      actionLabel={action.label}
                      actionHint={action.hint}
                      onAction={handleOpen}
                    />
                    {idx < lessons.length - 1 && <Divider margin="0 20px" />}
                  </div>
                )
              })}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
