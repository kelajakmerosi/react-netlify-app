import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { ApiError } from '../services/api'
import examService from '../services/exam.service'
import { useLang } from '../hooks'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './ExamPages.module.css'

interface AttemptQuestion {
  questionId: string
  questionOrder: number
  promptText: string
  options: string[]
  selectedIndex: number | null
}

const formatDuration = (seconds: number) => {
  const clamped = Math.max(0, seconds)
  const mins = Math.floor(clamped / 60)
  const secs = clamped % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function ExamSessionPage() {
  const navigate = useNavigate()
  const { attemptId } = useParams<{ attemptId: string }>()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [questions, setQuestions] = useState<AttemptQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [clockNow, setClockNow] = useState(Date.now())

  useEffect(() => {
    if (!attemptId) return
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const session = await examService.getAttemptSession(attemptId)
        if (!mounted) return
        setExamTitle(session.session.examTitle || t('examSessionDefaultTitle'))
        setExpiresAt(session.expiresAt)
        setQuestions(session.questions as AttemptQuestion[])
      } catch (err) {
        if (!mounted) return
        setError(resolveUiErrorMessage(err, t, 'errorExamSessionLoadFailed'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [attemptId, t])

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const timeLeftSec = useMemo(() => {
    if (!expiresAt) return 0
    return Math.max(0, Math.round((new Date(expiresAt).getTime() - clockNow) / 1000))
  }, [clockNow, expiresAt])

  const unansweredCount = useMemo(
    () => questions.filter((question) => question.selectedIndex == null).length,
    [questions],
  )

  const current = questions[currentIndex] ?? null

  const handleSelect = async (selectedIndex: number) => {
    if (!attemptId || !current) return
    setSaving(true)
    setError('')
    const prevQuestions = questions
    setQuestions((prev) => prev.map((question, idx) => (idx === currentIndex
      ? { ...question, selectedIndex }
      : question)))
    try {
      await examService.saveAnswer(attemptId, {
        questionId: current.questionId,
        selectedIndex,
      })
    } catch (err) {
      setQuestions(prevQuestions)
      setError(resolveUiErrorMessage(err, t, 'errorExamAnswerSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!attemptId) return
    if (unansweredCount > 0) {
      const confirmed = window.confirm(t('examSessionUnansweredConfirm').replace('{count}', String(unansweredCount)))
      if (!confirmed) return
    }
    setSubmitting(true)
    setError('')
    try {
      await examService.submitAttempt(attemptId)
      navigate(`/exam-attempts/${attemptId}/result`)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EXAM_ATTEMPT_EXPIRED') {
        setError(t('errorExamAttemptExpired'))
      } else {
        setError(resolveUiErrorMessage(err, t, 'errorExamSubmitFailed'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!attemptId) return <div className="page-content"><Alert variant="error">{t('examSessionInvalidAttemptId')}</Alert></div>

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>{examTitle || t('examSessionDefaultTitle')}</h2>
        <p className={styles.subtitle}>{t('examSessionRemaining').replace('{time}', formatDuration(timeLeftSec))}</p>
      </div>

      {loading ? <Alert variant="info">{t('examSessionLoading')}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {!loading && current ? (
        <div className={styles.panel}>
          <GlassCard padding={16}>
            <div className={styles.questionMap}>
              {questions.map((question, idx) => (
                <button
                  key={question.questionId}
                  type="button"
                  className={`${styles.qBtn} ${idx === currentIndex ? styles.qBtnActive : ''} ${question.selectedIndex != null ? styles.qBtnAnswered : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard padding={18} className={styles.panel}>
            <h3>{t('examSessionQuestionTitle').replace('{index}', String(currentIndex + 1))}</h3>
            <p>{current.promptText}</p>
            <div className={styles.optionList}>
              {current.options.map((option, optionIndex) => (
                <Button
                  key={`${current.questionId}-${optionIndex}`}
                  variant={current.selectedIndex === optionIndex ? 'primary' : 'ghost'}
                  className={styles.optionBtn}
                  onClick={() => void handleSelect(optionIndex)}
                  disabled={saving || submitting}
                >
                  {String.fromCharCode(65 + optionIndex)}. {option}
                </Button>
              ))}
            </div>
          </GlassCard>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0 || submitting}
            >
              {t('previousQuestion')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex >= questions.length - 1 || submitting}
            >
              {t('nextQuestion')}
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? t('examSessionSubmitting') : t('examSessionSubmitAttempt')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ExamSessionPage
