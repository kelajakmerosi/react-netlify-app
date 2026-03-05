import { useEffect, useState } from 'react'
import { useLang, useApp } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { Button } from '../components/ui/Button'
import { Tabs, Alert } from '../components/ui/index'
import { VideoPlayer } from '../components/features/VideoPlayer'
import { QuizPanel } from '../components/features/QuizPanel'
import styles from './TopicPage.module.css'

interface TopicPageProps {
  subjectId: string
  topicId:   string
  onBack:    () => void
}

export function TopicPage({ subjectId, topicId, onBack }: TopicPageProps) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { byId, loading: loadingSubject, error: subjectLoadError } = useLearnerSubjects()
  const {
    getTopicData,
    updateTopicProgress,
    recordTimeOnTask,
    loadError,
    retryLoad,
  } = useApp()

  const subject = byId.get(subjectId)
  const topic = subject?.topics.find(tp => tp.id === topicId)

  const data = getTopicData(subjectId, topicId)
  const [tab, setTab] = useState<'video' | 'quiz'>('video')
  const [videoWatched, setVideoWatched] = useState(data.videoWatched ?? false)

  useEffect(() => {
    setVideoWatched(data.videoWatched ?? false)
  }, [data.videoWatched])

  useEffect(() => {
    if (!user || !subject || !topic) return

    const currentStatus = data.status
    if (currentStatus !== 'completed') {
      updateTopicProgress(subjectId, topicId, {
        status: currentStatus && currentStatus !== 'locked' ? currentStatus : 'inprogress',
        lastActivityAt: Date.now(),
      })
    }

    let lastTick = Date.now()

    const interval = window.setInterval(() => {
      const now = Date.now()
      const delta = Math.floor((now - lastTick) / 1000)
      lastTick = now
      if (delta > 0) recordTimeOnTask(subjectId, topicId, delta)
    }, 15_000)

    return () => {
      window.clearInterval(interval)
      const now = Date.now()
      const delta = Math.floor((now - lastTick) / 1000)
      if (delta > 0) recordTimeOnTask(subjectId, topicId, delta)
    }
  // Keep the timer session stable for this topic + user lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, topicId, user?.id, subject, topic])

  if ((!subject || !topic) && !loadingSubject) {
    return (
      <div className="page-content fade-in">
        <Alert variant="warning">Topic not found.</Alert>
      </div>
    )
  }
  if (!subject || !topic) {
    return (
      <div className="page-content fade-in">
        <Alert variant="info">Loading topic...</Alert>
      </div>
    )
  }

  const handleMarkVideoWatched = () => {
    setVideoWatched(true)
    if (user) {
      updateTopicProgress(subjectId, topicId, {
        videoWatched: true,
        status: data.status === 'locked' || !data.status ? 'inprogress' : data.status,
        lastActivityAt: Date.now(),
      })
    }

    setTab('quiz')
  }

  const quizLabel = data.quizSubmitted
    ? `${t('quiz')} (${data.masteryScore ?? data.quizScore ?? 0}%)`
    : t('quiz')

  const tabs = [
    { id: 'video', label: videoWatched ? `${t('video')} • ${t('videoWatched')}` : t('video') },
    { id: 'quiz',  label: quizLabel },
  ]

  return (
    <div className="page-content fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} className={styles.backButton}>
        ← {t('back')}
      </Button>

      <div className={styles.header}>
        <h2 className={styles.title}>{topic.title || TOPIC_NAMES[lang]?.[topicId] || topicId}</h2>
        <p className={styles.subtitle}>{subject.title || SUBJECT_NAMES[lang]?.[subjectId] || subjectId}</p>
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

      <div className="mb-24">
        <Tabs tabs={tabs} active={tab} onChange={id => setTab(id as typeof tab)} />
      </div>

      {tab === 'video' && (
        <div id="tab-panel-video" role="tabpanel" aria-label="Video lesson">
          <VideoPlayer
            videoId={topic.videoId}
            title={topic.title || TOPIC_NAMES[lang]?.[topicId] || topicId}
            watched={videoWatched}
            onMarkWatched={handleMarkVideoWatched}
          />
        </div>
      )}

      {tab === 'quiz' && (
        <div id="tab-panel-quiz" role="tabpanel" aria-label="Quiz">
          <QuizPanel
            topic={topic}
            subjectId={subjectId}
            videoWatched={videoWatched}
          />
        </div>
      )}
    </div>
  )
}
