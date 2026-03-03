import { useMemo, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useLang } from '../../../hooks'
import type { TopicDraftVm } from './types'
import styles from './ContentBuilder.module.css'

interface TopicPreviewPanelProps {
  topic: TopicDraftVm | null
}

export default function TopicPreviewPanel({ topic }: TopicPreviewPanelProps): JSX.Element {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState<'video' | 'quiz'>('video')
  const [previewQuestion, setPreviewQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)

  const question = useMemo(() => {
    if (!topic || topic.questions.length === 0) return null
    return topic.questions[previewQuestion] ?? null
  }, [topic, previewQuestion])

  if (!topic) {
    return <div className={styles.emptyState}>{t('adminContentPreviewNoTopic')}</div>
  }

  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewTabs}>
        <button
          type="button"
          className={`${styles.previewTab} ${activeTab === 'video' ? styles.previewTabActive : ''}`}
          onClick={() => setActiveTab('video')}
        >
          {t('video')}
        </button>
        <button
          type="button"
          className={`${styles.previewTab} ${activeTab === 'quiz' ? styles.previewTabActive : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          {t('quiz')}
        </button>
      </div>

      {activeTab === 'video' ? (
        <div className={styles.videoPreviewMock}>
          <p className={styles.previewMuted}>{t('adminContentPreviewVideo')}</p>
          <h5>{topic.title || t('adminContentUntitledTopic')}</h5>
          <p>{topic.videoId || topic.videoUrl || t('adminContentPreviewNoVideo')}</p>
          <button type="button" className={styles.previewWatchBtn}>
            <CheckCircle2 size={14} aria-hidden="true" />
            {t('markVideoWatched')}
          </button>
        </div>
      ) : (
        <div className={styles.quizPreviewMock}>
          {!question ? (
            <div className={styles.emptyState}>{t('adminContentNoQuestions')}</div>
          ) : (
            <>
              <div className={styles.quizPreviewTop}>
                <span>{`${previewQuestion + 1} / ${topic.questions.length}`}</span>
                <div className={styles.previewProgressTrack}>
                  <div
                    className={styles.previewProgressFill}
                    style={{ width: `${((previewQuestion + 1) / topic.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <h5>{question.text || t('adminContentQuestionEmpty')}</h5>

              <div className={styles.previewOptions}>
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.previewOption} ${selectedAnswer === index ? styles.previewOptionActive : ''}`}
                    onClick={() => setSelectedAnswer(index)}
                  >
                    <span>{selectedAnswer === index ? <CheckCircle2 size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}</span>
                    {option || t('adminContentOptionEmpty')}
                  </button>
                ))}
              </div>

              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.previewNavBtn}
                  onClick={() => setPreviewQuestion((value) => Math.max(0, value - 1))}
                  disabled={previewQuestion === 0}
                >
                  {t('previousQuestion')}
                </button>
                <button
                  type="button"
                  className={styles.previewNavBtn}
                  onClick={() => setPreviewQuestion((value) => Math.min(topic.questions.length - 1, value + 1))}
                  disabled={previewQuestion >= topic.questions.length - 1}
                >
                  {t('nextQuestion')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
