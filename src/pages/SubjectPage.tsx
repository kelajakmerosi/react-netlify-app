import { useLang, useApp }   from '../hooks'
import { useAuth }            from '../hooks/useAuth'
import { SUBJECTS, SUBJECT_NAMES, TOPIC_NAMES } from '../constants'
import { GlassCard }          from '../components/ui/GlassCard'
import { Button }             from '../components/ui/Button'
import { Divider }            from '../components/ui/index'
import { TopicRow }           from '../components/features/TopicRow'
import type { CurrentTopic }  from '../types'
import styles                 from './SubjectPage.module.css'

interface SubjectPageProps {
  subjectId:      string
  onBack:         () => void
  onTopicSelect:  (topic: CurrentTopic) => void
}

export function SubjectPage({ subjectId, onBack, onTopicSelect }: SubjectPageProps) {
  const { t, lang }                                       = useLang()
  const { user }                                          = useAuth()
  const { getTopicStatus, getTopicData, updateTopicProgress } = useApp()

  const subject = SUBJECTS.find(s => s.id === subjectId)
  if (!subject) return null

  const statusLabels = {
    completed:  t('completed'),
    inprogress: t('inProgress'),
    onhold:     t('onHold'),
    locked:     t('locked'),
  } as const

  return (
    <div className="page-content fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 20 }}>
        ← {t('back')}
      </Button>

      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.iconWrap} style={{ background: subject.gradient }}>
          {subject.icon}
        </div>
        <div>
          <h2 className={styles.title} style={{ color: subject.color }}>
            {SUBJECT_NAMES[lang][subject.id]}
          </h2>
          <p className={styles.meta}>{subject.topics.length} {t('topics')}</p>
        </div>
      </div>

      {/* Topics list */}
      <GlassCard style={{ overflow: 'hidden' }}>
        {subject.topics.map((topic, idx) => {
          const status = getTopicStatus(subject.id, topic.id)
          const data   = getTopicData(subject.id, topic.id)

          const handleOpen = () => {
            if (!user && status === 'locked') {
              updateTopicProgress(subject.id, topic.id, { status: 'inprogress' })
            }
            onTopicSelect({ subjectId: subject.id, topicId: topic.id })
          }

          return (
            <div key={topic.id}>
              <TopicRow
                name={TOPIC_NAMES[lang][topic.id]}
                status={status}
                statusLabel={statusLabels[status]}
                quizScore={data.quizScore}
                subjectColor={subject.color}
                subjectGrad={subject.gradient}
                isCompleted={status === 'completed'}
                isLoggedIn={!!user}
                onOpen={handleOpen}
                onMarkInProgress={() =>
                  updateTopicProgress(subject.id, topic.id, { status: 'inprogress' })
                }
                onMarkOnHold={() =>
                  updateTopicProgress(subject.id, topic.id, { status: 'onhold' })
                }
              />
              {idx < subject.topics.length - 1 && (
                <Divider margin="0 20px" />
              )}
            </div>
          )
        })}
      </GlassCard>
    </div>
  )
}
