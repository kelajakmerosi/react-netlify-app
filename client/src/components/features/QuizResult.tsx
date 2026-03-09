import type { CSSProperties } from 'react'
import { Alert } from '../ui/index'
import { Button } from '../ui/Button'
import { useLang } from '../../hooks'
import { Smile, ThumbsUp, BookOpen, ListChecks, CheckCircle2, XCircle, Target, RotateCcw, BookMarked, Clock } from 'lucide-react'
import type { Question, QuizAttemptEntry } from '../../types'
import { OPTION_LABELS } from '../../constants'
import styles from './QuizResult.module.css'

interface QuizResultProps {
  questions: Question[]
  answers: Record<number, number>
  score: number
  masteryScore: number
  videoWatched: boolean
  quizAttempts: number
  attemptHistory: QuizAttemptEntry[]
  studyNext: string[]
  onRetry: () => void
}

const getRingColor = (pct: number) => {
  if (pct >= 85) return 'var(--success)'
  if (pct >= 65) return 'var(--accent)'
  if (pct >= 40) return 'var(--warning)'
  return 'var(--danger)'
}

export function QuizResult({
  questions,
  answers,
  score,
  masteryScore,
  videoWatched,
  quizAttempts,
  attemptHistory,
  studyNext,
  onRetry,
}: QuizResultProps) {
  const { t } = useLang()
  const total = questions.length
  const pct = Math.round((score / total) * 100)
  const allOk = masteryScore >= 80 && videoWatched
  const recentAttempts = attemptHistory.slice(0, 5)
  const incorrectCount = total - score
  const ringColor = getRingColor(masteryScore)

  const ResultIcon = masteryScore >= 85
    ? Smile
    : masteryScore >= 65
      ? ThumbsUp
      : BookOpen

  return (
    <div className={`fade-in ${styles.resultContainer}`}>

      {/* ── Hero banner ── */}
      <div className={styles.heroBanner}>
        <div
          className={styles.heroRing}
          style={{ '--score-angle': `${masteryScore * 3.6}deg`, '--ring-color': ringColor } as CSSProperties}
        >
          <div className={styles.heroRingInner}>
            <span className={styles.heroPct}>{masteryScore}%</span>
            <span className={styles.heroFraction}>{score}/{total}</span>
          </div>
        </div>

        <div className={styles.heroContent}>
          <h3 className={styles.heroLabel}>
            <ResultIcon size={22} color={ringColor} />
            {masteryScore >= 85 ? t('excellentWork') : masteryScore >= 65 ? t('goodProgress') : t('needsReview')}
          </h3>
          <p className={styles.heroSub}>
            {allOk ? t('masteryReached') : t('studyThenRetry')}
          </p>
          <div className={styles.heroStats}>
            <span className={`${styles.heroStatChip} ${styles.chipCorrect}`}>
              <CheckCircle2 size={13} /> {score} {t('correct')}
            </span>
            <span className={`${styles.heroStatChip} ${styles.chipWrong}`}>
              <XCircle size={13} /> {incorrectCount} {t('incorrect')}
            </span>
            <span className={`${styles.heroStatChip} ${styles.chipAttempts}`}>
              <RotateCcw size={13} /> {quizAttempts} {t('attempts')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className={styles.actionsBar}>
        <Button onClick={onRetry} size="lg">{t('retryQuiz')}</Button>
      </div>

      {/* ── Attempt history ── */}
      {recentAttempts.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <Clock size={14} /> {t('attemptHistory')}
          </div>
          <table className={styles.attemptTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('correct')}</th>
                <th>{t('result')}</th>
                <th style={{ textAlign: 'right' }}>{t('date')}</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((attempt, idx) => (
                <tr key={attempt.id}>
                  <td>{idx + 1}</td>
                  <td className={styles.attemptScoreCell}>{attempt.score}/{attempt.totalQuestions}</td>
                  <td>{attempt.masteryScore}%</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}>
                    {new Date(attempt.attemptedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Study next ── */}
      {studyNext.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <Target size={14} /> {t('studyNext')}
          </div>
          <div className={styles.studyChips}>
            {studyNext.map(item => (
              <span key={item} className={styles.studyChip}>
                <BookMarked size={13} /> {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Question review ── */}
      <div className={styles.reviewSection}>
        <div className={styles.sectionHeader}>
          <ListChecks size={16} /> {t('quizReview')}
        </div>
        <div className={styles.reviewList}>
          {questions.map((q, i) => {
            const userAns = answers[i]
            const isRight = userAns === q.answer

            return (
              <div key={q.id} className={styles.reviewItem}>
                <div className={styles.reviewQ}>
                  <span>
                    {isRight
                      ? <CheckCircle2 size={16} color="var(--success)" />
                      : <XCircle size={16} color="var(--danger)" />}
                  </span>
                  {i + 1}. {q.text}
                </div>

                <div className={styles.reviewOpts}>
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`${styles.reviewOpt}
                        ${oi === q.answer ? styles.correct : ''}
                        ${oi === userAns && !isRight ? styles.wrong : ''}`}
                    >
                      {OPTION_LABELS[oi]}. {opt}
                    </div>
                  ))}
                </div>

                {!isRight && q.explanation && (
                  <p className={styles.explanation}>{q.explanation}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Footer feedback ── */}
      <div className={`${styles.footerFeedback} ${pct >= 70 ? styles.feedbackPositive : styles.feedbackNegative}`}>
        {pct >= 70 ? t('feedbackStrong') : t('feedbackNeedsPractice')}
      </div>
    </div>
  )
}
