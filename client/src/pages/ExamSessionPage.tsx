import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  Clock3,
  FileQuestion,
  LoaderCircle,
  SendHorizontal,
  Target,
} from 'lucide-react'
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
  imageUrl?: string | null
  options: string[]
  selectedIndex: number | null
  blockOrder?: number | null
  blockTitle?: string | null
  difficulty?: string | null
}

const formatDuration = (seconds: number) => {
  const clamped = Math.max(0, seconds)
  const mins = Math.floor(clamped / 60)
  const secs = clamped % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

interface ExamSessionPageProps {
  attemptId: string
}

export function ExamSessionPage({ attemptId }: ExamSessionPageProps) {
  const navigate = useNavigate()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [passPercent, setPassPercent] = useState(0)
  const [requiredQuestionCount, setRequiredQuestionCount] = useState(0)
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
        setPassPercent(session.session.passPercent ?? 0)
        setRequiredQuestionCount(session.session.requiredQuestionCount ?? session.questions.length)
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
  const answeredCount = questions.length - unansweredCount
  const totalQuestions = questions.length || requiredQuestionCount
  const completionPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const current = questions[currentIndex] ?? null
  const currentSectionLabel = useMemo(() => {
    if (!current) return t('examSessionSectionFallback')
    if (current.blockTitle?.trim()) return current.blockTitle.trim()
    if (current.blockOrder != null) return `${t('examSessionSectionLabel')} ${current.blockOrder + 1}`
    return t('examSessionSectionFallback')
  }, [current, t])

  const questionSections = useMemo(() => {
    const sectionMap = new Map<string, {
      key: string
      label: string
      answered: number
      questions: Array<{
        index: number
        questionId: string
        answered: boolean
      }>
    }>()

    questions.forEach((question, index) => {
      const sectionLabel = question.blockTitle?.trim()
        || (question.blockOrder != null ? `${t('examSessionSectionLabel')} ${question.blockOrder + 1}` : t('examSessionSectionFallback'))
      const sectionKey = `${question.blockOrder ?? 'none'}:${sectionLabel}`
      const existing = sectionMap.get(sectionKey)

      if (existing) {
        existing.questions.push({
          index,
          questionId: question.questionId,
          answered: question.selectedIndex != null,
        })
        if (question.selectedIndex != null) existing.answered += 1
        return
      }

      sectionMap.set(sectionKey, {
        key: sectionKey,
        label: sectionLabel,
        answered: question.selectedIndex != null ? 1 : 0,
        questions: [{
          index,
          questionId: question.questionId,
          answered: question.selectedIndex != null,
        }],
      })
    })

    return Array.from(sectionMap.values())
  }, [questions, t])

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

  const handleJumpToNextUnanswered = () => {
    if (unansweredCount === 0) return
    const nextForward = questions.findIndex((question, index) => index > currentIndex && question.selectedIndex == null)
    if (nextForward >= 0) {
      setCurrentIndex(nextForward)
      return
    }

    const nextFromStart = questions.findIndex((question) => question.selectedIndex == null)
    if (nextFromStart >= 0) setCurrentIndex(nextFromStart)
  }

  return (
    <div className="page-content fade-in">
      {loading ? <Alert variant="info">{t('examSessionLoading')}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {!loading && current ? (
        <div className={styles.examSessionShell}>
          <section className={styles.examSessionMain}>
            <GlassCard padding={24} className={styles.examSessionHero}>
              <div className={styles.examHeroCopy}>
                <p className={styles.examHeroEyebrow}>{currentSectionLabel}</p>
                <h2 className={styles.examHeroTitle}>{examTitle || t('examSessionDefaultTitle')}</h2>
                <p className={styles.examHeroSubtitle}>{t('examSessionWorkspaceHint')}</p>
              </div>

              <div className={styles.examHeroStats}>
                <div className={styles.examHeroStat}>
                  <span>
                    <Clock3 size={14} aria-hidden="true" />
                    {t('examSessionRemainingLabel')}
                  </span>
                  <strong className={timeLeftSec <= 300 ? styles.examHeroStatDanger : ''}>
                    {formatDuration(timeLeftSec)}
                  </strong>
                </div>
                <div className={styles.examHeroStat}>
                  <span>
                    <CircleCheckBig size={14} aria-hidden="true" />
                    {t('examSessionAnsweredLabel')}
                  </span>
                  <strong>{answeredCount}/{totalQuestions}</strong>
                </div>
                <div className={styles.examHeroStat}>
                  <span>
                    <Target size={14} aria-hidden="true" />
                    {t('examSessionPassLabel')}
                  </span>
                  <strong>{passPercent}%</strong>
                </div>
              </div>
            </GlassCard>

            <GlassCard padding={24} className={styles.examQuestionCard}>
              <div className={styles.examQuestionTop}>
                <div className={styles.examQuestionIntro}>
                  <span className={styles.examQuestionBadge}>{currentSectionLabel}</span>
                  <h3 className={styles.examQuestionTitle}>
                    {t('examSessionQuestionTitle').replace('{index}', String(currentIndex + 1))}
                  </h3>
                </div>

                <div className={styles.examQuestionProgressBox}>
                  <strong>{completionPercent}%</strong>
                  <span>{t('examSessionCompletionLabel')}</span>
                </div>
              </div>

              <div className={styles.examQuestionProgressTrack} aria-hidden="true">
                <div
                  className={styles.examQuestionProgressFill}
                  style={{ width: `${((currentIndex + 1) / Math.max(questions.length, 1)) * 100}%` }}
                />
              </div>

              <p className={styles.examQuestionPrompt}>{current.promptText}</p>

              {current.imageUrl ? (
                <div className={styles.examQuestionMedia}>
                  <img src={current.imageUrl} alt={current.promptText} className={styles.examQuestionImage} />
                </div>
              ) : null}

              <div className={styles.examOptionList}>
                {current.options.map((option, optionIndex) => {
                  const selected = current.selectedIndex === optionIndex

                  return (
                    <button
                      key={`${current.questionId}-${optionIndex}`}
                      type="button"
                      className={`${styles.examOptionCard} ${selected ? styles.examOptionCardActive : ''}`}
                      onClick={() => void handleSelect(optionIndex)}
                      disabled={saving || submitting}
                    >
                      <span className={styles.examOptionLetter}>{String.fromCharCode(65 + optionIndex)}</span>
                      <span className={styles.examOptionText}>{option}</span>
                      <span className={styles.examOptionState} aria-hidden="true">
                        {selected ? <CircleCheckBig size={18} /> : <CircleDashed size={18} />}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className={styles.examQuestionFooter}>
                <div className={styles.examQuestionState}>
                  {saving ? <LoaderCircle size={14} className={styles.examSpinning} aria-hidden="true" /> : <CircleCheckBig size={14} aria-hidden="true" />}
                  {saving ? t('examSessionSaving') : t('examSessionAutoSave')}
                </div>

                <div className={styles.examQuestionActions}>
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0 || submitting}
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    {t('previousQuestion')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIndex >= questions.length - 1 || submitting}
                  >
                    {t('nextQuestion')}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          </section>

          <aside className={styles.examSessionSidebar}>
            <GlassCard padding={20} className={styles.examSidebarCard}>
              <div className={styles.examSidebarHead}>
                <div>
                  <p className={styles.examSidebarEyebrow}>{t('examSessionOverviewTitle')}</p>
                  <h3 className={styles.examSidebarTitle}>{t('examSessionNavigatorTitle')}</h3>
                </div>
                <FileQuestion size={18} aria-hidden="true" />
              </div>

              <div className={styles.examSidebarSummary}>
                <div className={styles.examSidebarMetric}>
                  <span>{t('examSessionTotalQuestionsLabel')}</span>
                  <strong>{totalQuestions}</strong>
                </div>
                <div className={styles.examSidebarMetric}>
                  <span>{t('examSessionAnsweredLabel')}</span>
                  <strong>{answeredCount}</strong>
                </div>
                <div className={styles.examSidebarMetric}>
                  <span>{t('examSessionUnansweredLabel')}</span>
                  <strong>{unansweredCount}</strong>
                </div>
              </div>
            </GlassCard>

            <GlassCard padding={20} className={styles.examSidebarCard}>
              <div className={styles.examSectionList}>
                {questionSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    className={`${styles.examSectionCard} ${section.questions.some((item) => item.index === currentIndex) ? styles.examSectionCardActive : ''}`}
                    onClick={() => setCurrentIndex(section.questions[0]?.index ?? 0)}
                  >
                    <div>
                      <strong>{section.label}</strong>
                      <span>{section.answered}/{section.questions.length} {t('examSessionAnsweredShort')}</span>
                    </div>
                    <CircleAlert size={16} aria-hidden="true" className={section.answered === section.questions.length ? styles.examSectionIconDone : styles.examSectionIconPending} />
                  </button>
                ))}
              </div>

              <div className={styles.examQuestionMapGrid}>
                {questions.map((question, idx) => (
                  <button
                    key={question.questionId}
                    type="button"
                    className={[
                      styles.examMapBtn,
                      idx === currentIndex ? styles.examMapBtnActive : '',
                      question.selectedIndex != null ? styles.examMapBtnAnswered : styles.examMapBtnPending,
                    ].join(' ')}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={t('examSessionQuestionTitle').replace('{index}', String(idx + 1))}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard padding={20} className={styles.examSidebarCard}>
              <div className={styles.examSubmitBox}>
                <p className={styles.examSidebarEyebrow}>{t('examSessionSubmitLabel')}</p>
                <h3 className={styles.examSidebarTitle}>{t('examSessionReviewHint')}</h3>
                <p className={styles.examSubmitHint}>{t('examSessionSubmitHint')}</p>
                <div className={styles.examSubmitActions}>
                  <Button variant="ghost" onClick={handleJumpToNextUnanswered} disabled={unansweredCount === 0 || submitting}>
                    {t('examSessionJumpUnanswered')}
                  </Button>
                  <Button onClick={() => void handleSubmit()} disabled={submitting}>
                    <SendHorizontal size={14} aria-hidden="true" />
                    {submitting ? t('examSessionSubmitting') : t('examSessionSubmitAttempt')}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

export default ExamSessionPage
