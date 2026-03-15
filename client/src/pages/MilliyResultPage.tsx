import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw, ShieldAlert, Trophy } from 'lucide-react'
import { Alert, MathText, PageHeader } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { useLang } from '../hooks'
import type { ExamResult } from '../services/exam.service'
import examService from '../services/exam.service'
import { resolveUiErrorMessage } from '../utils/errorPresentation'
import styles from './MilliyPaperFlow.module.css'

interface MilliyResultPageProps {
  paperKey: string
  attemptId: string
  onBack: () => void
}

export function MilliyResultPage({ paperKey, attemptId, onBack }: MilliyResultPageProps) {
  const { t } = useLang()
  const [result, setResult] = useState<ExamResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const payload = await examService.getAttemptResult(attemptId)
        if (!active) return
        setResult(payload)
      } catch (err) {
        if (!active) return
        setError(resolveUiErrorMessage(err, t, 'errorExamResultLoadFailed'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [attemptId, t])

  const correctCount = useMemo(
    () => result?.review.filter((entry) => entry.isCorrect).length ?? 0,
    [result?.review],
  )

  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Milliy sertifikat', onClick: onBack },
          { label: paperKey, onClick: onBack },
          { label: 'Natija' },
        ]}
        title=""
      />

      <div className={styles.detailGrid}>
        {error ? <Alert variant="warning">{error}</Alert> : null}
        {loading ? <Alert variant="info">Natija yuklanmoqda...</Alert> : null}

        {result ? (
          <>
            <GlassCard className={styles.resultSummaryCard}>
              <span className={`${styles.badge} ${result.passed ? styles.badgeSuccess : styles.badgeWarning}`}>
                {result.passed ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                {result.passed ? 'Muvaffaqiyatli' : 'Yakunlandi'}
              </span>
              
              <div>
                <h2 className={styles.resultScoreLarge}>{result.scorePercent}% natija</h2>
                <div className={styles.resultScoreLabel}>
                  {correctCount} / {result.review.length} savol to'g'ri bajarilgan
                </div>
              </div>

              <div className={styles.resultActions}>
                <Button variant="ghost" onClick={onBack}>
                  <RotateCcw size={16} />
                  Variantga qaytish
                </Button>
              </div>
            </GlassCard>

            <div className={styles.reviewList}>
              {result.review.map((entry) => (
                <GlassCard
                  key={entry.questionId}
                  className={`${styles.reviewCard} ${entry.isCorrect == null ? '' : entry.isCorrect ? styles.reviewCorrect : styles.reviewWrong}`}
                >
                  <div className={styles.reviewCardIndicator} />
                  <div className={styles.badgeRow}>
                    <span className={styles.badge}>{entry.questionOrder}-savol</span>
                  </div>
                  <div className={styles.questionPrompt}>
                    <MathText>{entry.promptText}</MathText>
                  </div>

                  {entry.formatType === 'WRITTEN' ? (
                    <div className={styles.optionList}>
                      <div className={`${styles.reviewOption} ${entry.isCorrect === false ? styles.reviewOptionWrong : ''}`}>
                        <span className={styles.reviewMeta}>Yozilgan javob</span>
                        <span className={styles.optionCopy}>
                          <MathText>{entry.writtenResponse || 'Javob berilmagan'}</MathText>
                        </span>
                      </div>
                      <div className={`${styles.reviewOption} ${entry.isCorrect === true ? styles.reviewOptionCorrect : ''}`}>
                        <span className={styles.reviewMeta}>
                          {entry.requiresManualReview ? 'Manual tekshiruv kutilmoqda' : entry.isCorrect ? 'To\'g\'ri' : 'Tekshirildi'}
                        </span>
                        {!entry.requiresManualReview && entry.expectedWrittenAnswer ? (
                          <span className={styles.optionCopy}>
                            <MathText>{entry.expectedWrittenAnswer}</MathText>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.optionList}>
                      {entry.options.map((option, index) => {
                        const isSelected = entry.selectedIndex === index
                        const isCorrect = entry.correctIndex === index
                        
                        let optionStateClass = ''
                        if (isCorrect) optionStateClass = styles.reviewOptionCorrect
                        else if (isSelected && !isCorrect) optionStateClass = styles.reviewOptionWrong
                        else optionStateClass = styles.reviewOptionNeutral

                        return (
                          <div key={`${entry.questionId}-${index}`} className={`${styles.reviewOption} ${optionStateClass}`}>
                            <span className={styles.optionLabel}>{String.fromCharCode(65 + index)}</span>
                            <span className={styles.optionCopy}>
                              <MathText>{option}</MathText>
                            </span>
                            <span className={styles.reviewMeta}>
                              {isCorrect ? 'To\'g\'ri' : isSelected ? 'Siz tanladingiz' : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
