import { GlassCard }  from '../ui/GlassCard'
import { Alert }      from '../ui/index'
import { useLang }    from '../../hooks'
import type { Question } from '../../types'
import { OPTION_LABELS } from '../../constants'
import styles            from './QuizResult.module.css'

interface QuizResultProps {
  questions:    Question[]
  answers:      Record<number, number>
  score:        number
  videoWatched: boolean
}

export function QuizResult({ questions, answers, score, videoWatched }: QuizResultProps) {
  const { t } = useLang()
  const total  = questions.length
  const pct    = Math.round((score / total) * 100)
  const allOk  = score === total && videoWatched

  return (
    <div className="fade-in">
      {/* Score circle card */}
      <GlassCard padding={40} className={styles.scoreCard}>
        <div className={styles.circle}
          style={{ background: `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--bg-3) 0deg)` }}>
          <div className={styles.circleInner}>
            <span className={styles.pctText}>{pct}%</span>
            <span className={styles.fraction}>{score}/{total}</span>
          </div>
        </div>

        <h3 className={styles.emoji}>
          {pct >= 80 ? '🎉 Zo\'r!' : pct >= 50 ? '👍 Yaxshi!' : '📚 Yana o\'qing'}
        </h3>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statVal} style={{ color:'var(--success)' }}>{score}</span>
            <span className={styles.statLabel}>{t('correct')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statVal} style={{ color:'var(--danger)' }}>{total - score}</span>
            <span className={styles.statLabel}>{t('incorrect')}</span>
          </div>
        </div>

        {allOk
          ? <Alert variant="success" className={styles.alert}>🏆 {t('completed')}!</Alert>
          : <Alert variant="info"    className={styles.alert}>{t('completeToUnlock')}</Alert>
        }
      </GlassCard>

      {/* Review */}
      <GlassCard padding={24} style={{ maxWidth: 680, marginTop: 20 }}>
        <h4 className={styles.reviewTitle}>📋 {t('quizReview')}</h4>
        <div className={styles.reviewList}>
          {questions.map((q, i) => {
            const userAns  = answers[i]
            const isRight  = userAns === q.answer
            return (
              <div key={q.id} className={styles.reviewItem}>
                <div className={styles.reviewQ}>
                  {i + 1}. {q.text}
                  <span style={{ marginLeft: 8 }}>{isRight ? '✅' : '❌'}</span>
                </div>
                <div className={styles.reviewOpts}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`${styles.reviewOpt}
                      ${oi === q.answer ? styles.correct : ''}
                      ${oi === userAns && !isRight ? styles.wrong : ''}`}>
                      {OPTION_LABELS[oi]}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}
