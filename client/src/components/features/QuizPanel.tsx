import { useEffect, useMemo } from 'react'
import { useApp } from '../../hooks'
import { useQuiz } from '../../hooks/useQuiz'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks'
import { cn } from '../../utils'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { ProgressBar, Alert } from '../ui/index'
import { QuizResult } from './QuizResult'
import { ArrowLeft, Check } from 'lucide-react'
import type { QuizAttemptEntry, Topic } from '../../types'
import { OPTION_LABELS } from '../../constants'
import styles from './QuizPanel.module.css'

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
  const {
    state,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    submitQuiz,
    resetQuiz,
    canNext,
    canPrev,
    canSubmit,
    isLast,
  } = useQuiz(topic.questions, savedData)

  useEffect(() => {
    if (!user || state.submitted) return

    const currentStatus = savedData.status
    updateTopicProgress(subjectId, topic.id, {
      resumeQuestionIndex: state.currentIndex,
      status: currentStatus && currentStatus !== 'locked' ? currentStatus : 'inprogress',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentIndex, state.submitted, user?.id])

  const wrongConcepts = useMemo(() => {
    const counter = new Map<string, number>()

    topic.questions.forEach((question, idx) => {
      const isWrong = state.answers[idx] !== undefined && state.answers[idx] !== question.answer
      if (!isWrong) return
      const concept = question.concept ?? topic.id
      counter.set(concept, (counter.get(concept) ?? 0) + 1)
    })

    return Array.from(counter.entries())
      .map(([concept, misses]) => ({ concept, misses }))
      .sort((a, b) => b.misses - a.misses)
  }, [state.answers, topic.id, topic.questions])

  const studyNext = useMemo(() => {
    if (wrongConcepts.length === 0) {
      return [t('studyNextPerfect')]
    }

    return wrongConcepts.slice(0, 3).map(item => t('studyNextWeakArea').replace('{concept}', item.concept))
  }, [t, wrongConcepts])

  const handleSubmit = () => {
    const { score, masteryScore } = submitQuiz()
    const attempts = (savedData.quizAttempts ?? 0) + 1
    const attemptedAt = Date.now()
    const attemptEntry: QuizAttemptEntry = {
      id: `${attemptedAt}-${Math.random().toString(36).slice(2, 8)}`,
      score,
      totalQuestions: topic.questions.length,
      masteryScore,
      attemptedAt,
    }
    const nextAttemptHistory = [attemptEntry, ...(savedData.quizAttemptHistory ?? [])].slice(0, 20)

    const newStatus = videoWatched && masteryScore >= 80
      ? 'completed'
      : savedData.status === 'locked' || !savedData.status
        ? 'inprogress'
        : savedData.status

    if (user) {
      updateTopicProgress(subjectId, topic.id, {
        quizScore: score,
        masteryScore,
        quizAnswers: state.answers,
        quizSubmitted: true,
        quizAttempts: attempts,
        quizTotalQuestions: topic.questions.length,
        quizAttemptHistory: nextAttemptHistory,
        status: newStatus,
        videoWatched,
        resumeQuestionIndex: 0,
        completedAt: newStatus === 'completed' ? Date.now() : null,
      })
      addLessonHistory({ subjectId, topicId: topic.id, quizScore: score })
    }
  }

  const handleRetry = () => {
    resetQuiz()
    if (user) {
      updateTopicProgress(subjectId, topic.id, {
        quizSubmitted: false,
        resumeQuestionIndex: 0,
        status: 'inprogress',
      })
    }
  }

  if (state.submitted && state.score !== undefined && state.masteryScore !== undefined) {
    return (
      <QuizResult
        questions={topic.questions}
        answers={state.answers}
        score={state.score}
        masteryScore={state.masteryScore}
        videoWatched={videoWatched}
        quizAttempts={savedData.quizAttempts ?? 1}
        attemptHistory={savedData.quizAttemptHistory ?? []}
        studyNext={studyNext}
        onRetry={handleRetry}
      />
    )
  }

  const currentQ = topic.questions[state.currentIndex]
  const answered = Object.keys(state.answers).length
  const progress = ((state.currentIndex + 1) / topic.questions.length) * 100

  return (
    <GlassCard padding={28} style={{ maxWidth: 700 }}>
      {!videoWatched && (
        <Alert variant="warning" className={styles.videoFirst}>
          {t('watchVideoFirstHint')}
        </Alert>
      )}

      <div className={styles.header}>
        <span className={styles.counter}>
          {state.currentIndex + 1} / {topic.questions.length}
        </span>
        <div style={{ flex: 1, margin: '0 12px' }}>
          <ProgressBar value={progress} />
        </div>
        <span className={styles.pct}>{Math.round(progress)}%</span>
      </div>

      <h3 className={styles.question}>{currentQ.text}</h3>

      {currentQ.imageUrl ? (
        <div className={styles.questionMedia}>
          <img src={currentQ.imageUrl} alt={currentQ.concept ?? currentQ.text} className={styles.questionImage} />
        </div>
      ) : null}

      <div className={styles.metaLine}>
        <span>{t('difficulty')}: <strong>{currentQ.difficulty ?? 'easy'}</strong></span>
      </div>

      <div className={styles.options}>
        {currentQ.options.map((opt, i) => {
          const isSelected = state.answers[state.currentIndex] === i
          return (
            <button
              key={i}
              className={cn(styles.option, isSelected && styles.optionSelected)}
              onClick={() => selectAnswer(state.currentIndex, i)}
            >
              <span className={styles.optLabel}>{OPTION_LABELS[i]}</span>
              {opt}
            </button>
          )
        })}
      </div>

      {answered > 0 && (
        <p className={styles.answeredNote}>
          {answered} / {topic.questions.length} {t('quizAnswered')}
        </p>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={prevQuestion} disabled={!canPrev}>
          <ArrowLeft size={15} /> {t('previousQuestion')}
        </Button>

        {!isLast ? (
          <Button onClick={nextQuestion} disabled={!canNext}>
            {t('nextQuestion')} →
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
            <Check size={16} /> {t('submitQuiz')}
          </Button>
        )}
      </div>
    </GlassCard>
  )
}
