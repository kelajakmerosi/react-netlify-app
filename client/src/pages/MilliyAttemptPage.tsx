import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CircleCheckBig, CircleDashed, Clock3, LoaderCircle, SendHorizontal } from 'lucide-react'
import { Alert, MathText, PageHeader } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useLang } from '../hooks'
import type { ExamAttemptSession } from '../services/exam.service'
import examService from '../services/exam.service'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './MilliyPaperFlow.module.css'

interface MilliyAttemptPageProps {
  paperKey: string
  attemptId: string
  onBack: () => void
  onOpenResult: () => void
}

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const remSeconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`
}

export function MilliyAttemptPage({ paperKey, attemptId, onBack, onOpenResult }: MilliyAttemptPageProps) {
  const { t } = useLang()
  const [session, setSession] = useState<ExamAttemptSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const payload = await examService.getAttemptSession(attemptId)
        if (!active) return
        setSession({
          ...payload,
          questions: payload.questions.map((question) => ({
            ...question,
            formatType: question.formatType ?? 'MCQ4',
            writtenResponse: question.writtenResponse ?? '',
          })),
        })
      } catch (err) {
        if (!active) return
        setError(resolveUiErrorMessage(err, t, 'errorExamSessionLoadFailed'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [attemptId, t])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const questions = session?.questions ?? []
  const current = questions[currentIndex] ?? null
  const timeLeft = useMemo(() => {
    if (!session?.expiresAt) return 0
    return Math.max(0, Math.round((new Date(session.expiresAt).getTime() - now) / 1000))
  }, [now, session?.expiresAt])

  const answeredCount = useMemo(
    () => questions.filter((entry) => (
      entry.selectedIndex != null || String(entry.writtenResponse || '').trim().length > 0
    )).length,
    [questions],
  )

  const handleSelect = async (selectedIndex: number) => {
    if (!current || !session) return

    const nextQuestions = questions.map((entry, index) => (
      index === currentIndex
        ? { ...entry, formatType: entry.formatType ?? 'MCQ4', selectedIndex }
        : { ...entry, formatType: entry.formatType ?? 'MCQ4' }
    ))

    setSession({ ...session, questions: nextQuestions })
    setSaving(true)
    try {
      await examService.saveAnswer(attemptId, {
        questionId: current.questionId,
        selectedIndex,
      })
    } catch (err) {
      setSession(session)
      setError(resolveUiErrorMessage(err, t, 'errorExamAnswerSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleWrittenChange = (writtenResponse: string) => {
    if (!current || !session) return

    const nextQuestions = questions.map((entry, index) => (
      index === currentIndex
        ? { ...entry, formatType: entry.formatType ?? 'MCQ4', writtenResponse }
        : { ...entry, formatType: entry.formatType ?? 'MCQ4' }
    ))

    setSession({ ...session, questions: nextQuestions })
  }

  const handleWrittenSave = async () => {
    if (!current) return
    const writtenAnswer = String(current.writtenResponse || '').trim()
    if (!writtenAnswer) return

    setSaving(true)
    try {
      await examService.saveAnswer(attemptId, {
        questionId: current.questionId,
        writtenAnswer,
      })
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorExamAnswerSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const persistCurrentWrittenIfNeeded = async () => {
    if (current?.formatType === 'WRITTEN' && String(current.writtenResponse || '').trim()) {
      await handleWrittenSave()
    }
  }

  const handleSubmit = async () => {
    if (!session) return
    await persistCurrentWrittenIfNeeded()

    const unanswered = questions.filter((entry) => (
      entry.selectedIndex == null && String(entry.writtenResponse || '').trim().length === 0
    )).length
    if (unanswered > 0) {
      const confirmed = window.confirm(`${unanswered} ta savol javobsiz qoladi. Yakunlaysizmi?`)
      if (!confirmed) return
    }

    try {
      setSubmitting(true)
      setError('')
      await examService.submitAttempt(attemptId)
      onOpenResult()
    } catch (err) {
      setError(resolveUiErrorMessage(err, t, 'errorExamSubmitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Milliy sertifikat', onClick: onBack },
          { label: paperKey },
          { label: `Urinish ${attemptId.slice(0, 8)}` },
        ]}
        title=""
      />

      <div className={styles.questionShell}>
        {error ? <Alert variant="warning">{error}</Alert> : null}
        {loading ? <Alert variant="info">Imtihon yuklanmoqda...</Alert> : null}

        {!loading && !session ? (
          <Alert variant="warning">Imtihon urinish ma'lumoti topilmadi.</Alert>
        ) : null}

        {session && current ? (
          <>
            <GlassCard className={styles.detailCard}>
              <div className={styles.questionTop}>
                <div>
                  <span className={styles.badge}>{session.session.examTitle || 'Milliy sertifikat'}</span>
                  <h2 className={styles.cardTitle}>{current.blockTitle || `${current.questionOrder}-savol`}</h2>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.badge}><Clock3 size={14} /> {formatDuration(timeLeft)}</span>
                  <span className={styles.badge}>{answeredCount}/{questions.length} javob berildi</span>
                  <span className={styles.badge}>{session.session.passPercent}% o'tish</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className={styles.detailCard}>
              <span className={styles.badge}>{current.questionOrder}-savol</span>
              <div className={styles.questionPrompt}>
                <MathText>{current.promptText}</MathText>
              </div>

              {current.imageUrl ? (
                <img src={current.imageUrl} alt={`${current.questionOrder}-savol rasmi`} className={styles.questionImage} />
              ) : null}

              {current.formatType === 'WRITTEN' ? (
                <label className={styles.fieldWide}>
                  <span className={styles.badge}>Yozma javob</span>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    value={current.writtenResponse || ''}
                    onChange={(event) => handleWrittenChange(event.target.value)}
                    onBlur={() => void handleWrittenSave()}
                    placeholder="Javobingizni shu yerga yozing"
                    disabled={submitting}
                  />
                </label>
              ) : (
                <div className={styles.optionList}>
                  {current.options.map((option, optionIndex) => {
                    const isActive = current.selectedIndex === optionIndex
                    return (
                      <button
                        key={`${current.questionId}-${optionIndex}`}
                        type="button"
                        className={`${styles.optionBtn} ${isActive ? styles.optionBtnActive : ''}`}
                        onClick={() => void handleSelect(optionIndex)}
                        disabled={saving || submitting}
                      >
                        <span className={styles.optionLabel}>{String.fromCharCode(65 + optionIndex)}</span>
                        <span className={styles.optionCopy}>
                          <MathText>{option}</MathText>
                        </span>
                        {isActive ? <CircleCheckBig size={18} /> : <CircleDashed size={18} />}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className={styles.actionsRow}>
                <Button
                  variant="ghost"
                  onClick={() => void (async () => {
                    await persistCurrentWrittenIfNeeded()
                    setCurrentIndex((value) => Math.max(0, value - 1))
                  })()}
                  disabled={currentIndex === 0 || submitting}
                >
                  <ArrowLeft size={16} />
                  Oldingi
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void (async () => {
                    await persistCurrentWrittenIfNeeded()
                    setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))
                  })()}
                  disabled={currentIndex >= questions.length - 1 || submitting}
                >
                  Keyingi
                  <ArrowRight size={16} />
                </Button>
                <Button onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? <LoaderCircle size={16} className={styles.spin} /> : <SendHorizontal size={16} />}
                  Yakunlash
                </Button>
              </div>

              <p className={styles.muted}>
                {saving
                  ? 'Javob saqlanmoqda...'
                  : current.formatType === 'WRITTEN'
                    ? 'Yozma javob fokusdan chiqqanda saqlanadi.'
                    : 'Javob tanlanganda avtomatik saqlanadi.'}
              </p>
            </GlassCard>
          </>
        ) : null}
      </div>
    </div>
  )
}
