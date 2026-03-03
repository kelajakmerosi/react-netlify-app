import { PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import type { TopicQuestionDraft } from '../types'
import styles from '../AdminWorkspace.module.css'

interface QuestionEditorListProps {
  questions: TopicQuestionDraft[]
  onQuestionAdd: () => void
  onQuestionChange: (index: number, patch: Partial<TopicQuestionDraft>) => void
  onQuestionRemove: (index: number) => void
}

export function QuestionEditorList({
  questions,
  onQuestionAdd,
  onQuestionChange,
  onQuestionRemove,
}: QuestionEditorListProps): JSX.Element {
  const { t } = useLang()

  return (
    <div className={styles.questionEditorWrap}>
      <div className={styles.rowHeader}>
        <h5>{t('adminContentQuestionsTitle')}</h5>
        <Button variant="ghost" size="sm" onClick={onQuestionAdd}>
          <PlusCircle size={14} aria-hidden="true" />
          {t('adminContentAddQuestion')}
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className={styles.emptyState}>{t('adminContentNoQuestions')}</div>
      ) : (
        <div className={styles.questionList}>
          {questions.map((question, index) => (
            <div key={`${question.id ?? 'new'}-${index}`} className={styles.questionCard}>
              <label className={styles.fieldWide}>
                <span>{t('adminContentQuestionText')}</span>
                <input
                  className={styles.input}
                  value={question.text}
                  onChange={(event) => onQuestionChange(index, { text: event.target.value })}
                />
              </label>
              <label className={styles.fieldWide}>
                <span>{t('adminContentQuestionImageUrl')}</span>
                <input
                  className={styles.input}
                  value={question.imageUrl ?? ''}
                  onChange={(event) => onQuestionChange(index, { imageUrl: event.target.value })}
                />
              </label>
              <label className={styles.fieldWide}>
                <span>{t('adminContentOptions')}</span>
                <input
                  className={styles.input}
                  value={question.optionsText}
                  onChange={(event) => onQuestionChange(index, { optionsText: event.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>{t('adminContentCorrectIndex')}</span>
                <input
                  className={styles.input}
                  type="number"
                  value={question.answer}
                  onChange={(event) => onQuestionChange(index, { answer: Number(event.target.value) || 0 })}
                />
              </label>
              <label className={styles.field}>
                <span>{t('adminContentConceptOptional')}</span>
                <input
                  className={styles.input}
                  value={question.concept ?? ''}
                  onChange={(event) => onQuestionChange(index, { concept: event.target.value })}
                />
              </label>

              <div className={styles.actionRow}>
                <Button variant="danger" size="sm" onClick={() => onQuestionRemove(index)}>
                  <Trash2 size={14} aria-hidden="true" />
                  {t('adminContentDeleteQuestion')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default QuestionEditorList
