import { useApp }        from '../../hooks'
import { useQuiz }       from '../../hooks/useQuiz'
import { useAuth }       from '../../hooks/useAuth'
import { useLang }       from '../../hooks'
import { GlassCard }     from '../ui/GlassCard'
import { Button }        from '../ui/Button'
import { ProgressBar, Alert } from '../ui/index'
import { QuizResult }    from './QuizResult'
import type { Topic }    from '../../types'
import { OPTION_LABELS } from '../../constants'
import styles            from './QuizPanel.module.css'

interface QuizPanelProps {
  topic:     Topic
  subjectId: string
  videoWatched: boolean
}

export function QuizPanel({ topic, subjectId, videoWatched }: QuizPanelProps) {
  const { t } = useLang()
  const { user } = useAuth()
  const { getTopicData, updateTopicProgress, addLessonHistory } = useApp()

  const savedData = getTopicData(subjectId, topic.id)
  const { state, selectAnswer, nextQuestion, submitQuiz, canNext, canSubmit, isLast } = useQuiz(
    topic.questions, savedData,
  )

  const handleSubmit = () => {
    const score = submitQuiz()
    const allPerfect  = score === topic.questions.length
    const newStatus   = videoWatched && allPerfect ? 'completed'
      : savedData.status === 'locked' || !savedData.status ? 'inprogress'
      : savedData.status

    if (user) {
      updateTopicProgress(subjectId, topic.id, {
        quizScore:     score,
        quizAnswers:   state.answers,
        quizSubmitted: true,
        status:        newStatus,
        videoWatched,
      })
      addLessonHistory({ subjectId, topicId: topic.id, quizScore: score })
    }
  }

  if (state.submitted && state.score !== undefined) {
    return (
      <QuizResult
        questions={topic.questions}
        answers={state.answers}
        score={state.score}
        videoWatched={videoWatched}
      />
    )
  }

  const currentQ = topic.questions[state.currentIndex]
  const answered  = Object.keys(state.answers).length
  const progress  = ((state.currentIndex + 1) / topic.questions.length) * 100

  return (
    <GlassCard padding={28} style={{ maxWidth: 680 }}>
      {/* Progress header */}
      <div className={styles.header}>
        <span className={styles.counter}>
          {state.currentIndex + 1} / {topic.questions.length}
        </span>
        <div style={{ flex: 1, margin: '0 12px' }}>
          <ProgressBar value={progress} />
        </div>
        <span className={styles.pct}>{Math.round(progress)}%</span>
      </div>

      {/* Question */}
      <h3 className={styles.question}>{currentQ.text}</h3>

      {/* Options */}
      <div className={styles.options}>
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            className={`${styles.option} ${state.answers[state.currentIndex] === i ? styles.optionSelected : ''}`}
            onClick={() => selectAnswer(state.currentIndex, i)}
          >
            <span className={styles.optLabel}>{OPTION_LABELS[i]}.</span>
            {opt}
          </button>
        ))}
      </div>

      {/* Answered count */}
      {answered > 0 && (
        <p className={styles.answeredNote}>
          {answered} / {topic.questions.length} {t('quiz')} answered
        </p>
      )}

      {/* Action */}
      <div className={styles.actions}>
        {!isLast ? (
          <Button onClick={nextQuestion} disabled={!canNext} style={{ marginLeft:'auto' }}>
            {t('nextQuestion')} →
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" style={{ marginLeft:'auto' }}>
            ✓ {t('submitQuiz')}
          </Button>
        )}
      </div>
    </GlassCard>
  )
}
