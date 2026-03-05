import { useMemo } from 'react'
import { useLang, useApp } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { SUBJECT_NAMES, TOPIC_NAMES, MODULE_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Divider, Alert } from '../components/ui/index'
import { TopicRow } from '../components/features/TopicRow'
import type { CurrentTopic, TopicProgressData, TopicStatus } from '../types'
import { renderSafeIcon } from '../utils/renderSafeIcon'
import styles from './SubjectPage.module.css'

interface SubjectPageProps {
  subjectId:      string
  onBack:         () => void
  onTopicSelect:  (topic: CurrentTopic) => void
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
    completed:  t('completed'),
    inprogress: t('inProgress'),
    onhold:     t('onHold'),
    locked:     t('locked'),
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
      </div>
    )
  }
  if (!subject) {
    return (
      <div className="page-content fade-in">
        <Alert variant="info">Loading subject...</Alert>
      </div>
    )
  }

  return (
    <div className="page-content fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} className={styles.backButton}>
        ← {t('back')}
      </Button>

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
              <div key={idx} className={styles.skeletonRow} />
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
                      quizScore={data.quizScore}
                      masteryScore={data.masteryScore}
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
