import { useCallback, useState } from 'react'
import type { Question, TopicProgressData } from '../types'

export interface QuizState {
  currentIndex: number
  answers:      Record<number, number>
  submitted:    boolean
  score:        number | undefined
}

export function useQuiz(questions: Question[], savedData: TopicProgressData) {
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    answers:      savedData.quizAnswers   ?? {},
    submitted:    savedData.quizSubmitted ?? false,
    score:        savedData.quizScore,
  })

  const selectAnswer = useCallback((qIndex: number, optIndex: number) => {
    if (state.submitted) return
    setState(prev => ({ ...prev, answers: { ...prev.answers, [qIndex]: optIndex } }))
  }, [state.submitted])

  const nextQuestion = useCallback(() => {
    setState(prev => ({ ...prev, currentIndex: Math.min(prev.currentIndex + 1, questions.length - 1) }))
  }, [questions.length])

  const submitQuiz = useCallback((): number => {
    const score = questions.reduce(
      (acc, q, i) => acc + (state.answers[i] === q.answer ? 1 : 0), 0,
    )
    setState(prev => ({ ...prev, submitted: true, score }))
    return score
  }, [questions, state.answers])

  const canSubmit = Object.keys(state.answers).length === questions.length
  const canNext   = state.answers[state.currentIndex] !== undefined
  const isLast    = state.currentIndex === questions.length - 1

  return { state, selectAnswer, nextQuestion, submitQuiz, canSubmit, canNext, isLast }
}
