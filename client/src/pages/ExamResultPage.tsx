import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, PageHeader } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import examService from '../services/exam.service'
import { useLang } from '../hooks'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './ExamPages.module.css'

interface ReviewRow {
  questionId: string
  questionOrder?: number
  promptText: string
  options: string[]
  selectedIndex: number | null
  correctIndex: number
  isCorrect: boolean
  explanation?: string | null
}

interface ResultPayload {
  scorePercent: number
  passed: boolean
  review: ReviewRow[]
}

interface ExamResultPageProps {
  attemptId: string
}

export function ExamResultPage({ attemptId }: ExamResultPageProps) {
  const navigate = useNavigate()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ResultPayload | null>(null)

  useEffect(() => {
    if (!attemptId) return
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const payload = await examService.getAttemptResult(attemptId)
        if (!mounted) return
        setResult(payload as ResultPayload)
      } catch (err) {
        if (!mounted) return
        setError(resolveUiErrorMessage(err, t, 'errorExamResultLoadFailed'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [attemptId, t])

  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[{ label: t('exams') }]}
        title={t('examResultTitle')}
      />

      {loading ? <Alert variant="info">{t('examResultLoading')}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {result ? (
        <div className={styles.panel}>
          <GlassCard padding={16}>
            <h3>{t('examResultScore').replace('{score}', String(result.scorePercent))}</h3>
            <p>{result.passed ? t('examResultPassed') : t('examResultFailed')}</p>
          </GlassCard>

          {result.review.map((row, idx) => (
            <div
              key={row.questionId}
              className={`${styles.resultRow} ${row.isCorrect ? styles.resultCorrect : styles.resultIncorrect}`}
            >
              <strong>Q{row.questionOrder ?? idx + 1}.</strong>
              <p>{row.promptText}</p>
              <p>
                {t('examResultYourAnswer')}: {row.selectedIndex == null ? t('examResultUnanswered') : row.options[row.selectedIndex] ?? t('examResultUnknown')}
              </p>
              <p>{t('examResultCorrectAnswer')}: {row.options[row.correctIndex] ?? t('examResultUnknown')}</p>
              {row.explanation ? <p>{t('examResultExplanation')}: {row.explanation}</p> : null}
            </div>
          ))}

          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => navigate('/exams')}>{t('examResultBackToCatalog')}</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ExamResultPage
