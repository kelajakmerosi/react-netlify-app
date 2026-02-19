import { useState } from 'react'
import { useLang, useApp }   from '../hooks'
import { useAuth }           from '../hooks/useAuth'
import { SUBJECTS, SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import { Button }            from '../components/ui/Button'
import { Tabs }              from '../components/ui/index'
import { VideoPlayer }       from '../components/features/VideoPlayer'
import { QuizPanel }         from '../components/features/QuizPanel'
import styles                from './TopicPage.module.css'

interface TopicPageProps {
  subjectId: string
  topicId:   string
  onBack:    () => void
}

export function TopicPage({ subjectId, topicId, onBack }: TopicPageProps) {
  const { t, lang }                                   = useLang()
  const { user }                                      = useAuth()
  const { getTopicData, updateTopicProgress }         = useApp()

  const subject = SUBJECTS.find(s => s.id === subjectId)
  const topic   = subject?.topics.find(tp => tp.id === topicId)
  if (!subject || !topic) return null

  const data         = getTopicData(subjectId, topicId)
  const [tab, setTab] = useState<'video' | 'quiz'>('video')
  const [videoWatched, setVideoWatched] = useState(data.videoWatched ?? false)

  const handleMarkVideoWatched = () => {
    setVideoWatched(true)
    if (user) {
      updateTopicProgress(subjectId, topicId, {
        videoWatched: true,
        status: data.status === 'locked' || !data.status ? 'inprogress' : data.status,
      })
    }
  }

  const quizLabel = data.quizScore !== undefined
    ? `📝 ${t('quiz')} (${data.quizScore}/10)`
    : `📝 ${t('quiz')}`

  const tabs = [
    { id: 'video', label: `🎬 ${t('video')}${videoWatched ? ' ✓' : ''}` },
    { id: 'quiz',  label: quizLabel },
  ]

  return (
    <div className="page-content fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 20 }}>
        ← {t('back')}
      </Button>

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{TOPIC_NAMES[lang][topicId]}</h2>
        <p className={styles.subtitle}>{SUBJECT_NAMES[lang][subjectId]}</p>
      </div>

      <div className="mb-24">
        <Tabs tabs={tabs} active={tab} onChange={id => setTab(id as typeof tab)} />
      </div>

      {tab === 'video' && (
        <VideoPlayer
          videoId={topic.videoId}
          title={TOPIC_NAMES[lang][topicId]}
          watched={videoWatched}
          onMarkWatched={handleMarkVideoWatched}
        />
      )}

      {tab === 'quiz' && (
        <QuizPanel
          topic={topic}
          subjectId={subjectId}
          videoWatched={videoWatched}
        />
      )}
    </div>
  )
}
