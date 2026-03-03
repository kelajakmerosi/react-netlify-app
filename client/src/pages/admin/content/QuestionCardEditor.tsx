import { PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import type { QuestionDraftVm } from './types'
import styles from './ContentBuilder.module.css'

interface QuestionCardEditorProps {
  question: QuestionDraftVm | null
  onChange: (patch: Partial<QuestionDraftVm>) => void
  onRemoveQuestion: () => void
}

export default function QuestionCardEditor({ question, onChange, onRemoveQuestion }: QuestionCardEditorProps): JSX.Element {
  const { t } = useLang()

  if (!question) {
    return <div className={styles.emptyState}>{t('adminContentSelectQuestionHint')}</div>
  }

  const setOption = (index: number, value: string) => {
    const nextOptions = [...question.options]
    nextOptions[index] = value
    onChange({ options: nextOptions })
  }

  const addOption = () => {
    onChange({ options: [...question.options, ''] })
  }

  const removeOption = (index: number) => {
    if (question.options.length <= 2) return
    const nextOptions = question.options.filter((_, optionIndex) => optionIndex !== index)
    const nextAnswer = question.answer >= nextOptions.length ? nextOptions.length - 1 : question.answer
    onChange({ options: nextOptions, answer: nextAnswer })
  }

  return (
    <div className={styles.questionEditor}>
      <label className={styles.fieldWide}>
        <span>{t('adminContentQuestionText')}</span>
        <textarea
          className={styles.textarea}
          rows={3}
          value={question.text}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      </label>

      <label className={styles.fieldWide}>
        <span>{t('adminContentQuestionImageUrl')}</span>
        <input
          className={styles.input}
          value={question.imageUrl}
          onChange={(event) => onChange({ imageUrl: event.target.value })}
        />
      </label>

      <div className={styles.optionList}>
        {question.options.map((option, index) => (
          <div key={index} className={styles.optionRow}>
            <label className={styles.optionCorrectPick}>
              <input
                type="radio"
                name="question-correct"
                checked={question.answer === index}
                onChange={() => onChange({ answer: index })}
              />
              <span>{String.fromCharCode(65 + index)}</span>
            </label>

            <input
              className={styles.input}
              value={option}
              onChange={(event) => setOption(index, event.target.value)}
              placeholder={t('adminContentOptionPlaceholder').replace('{index}', String(index + 1))}
            />

            <button
              type="button"
              className={styles.iconDangerBtn}
              onClick={() => removeOption(index)}
              disabled={question.options.length <= 2}
              aria-label={t('adminContentDeleteOption')}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.inlineActions}>
        <Button variant="ghost" size="sm" onClick={addOption}>
          <PlusCircle size={14} aria-hidden="true" />
          {t('adminContentAddOption')}
        </Button>
        <Button variant="danger" size="sm" onClick={onRemoveQuestion}>
          <Trash2 size={14} aria-hidden="true" />
          {t('adminContentDeleteQuestion')}
        </Button>
      </div>

      <label className={styles.fieldWide}>
        <span>{t('adminContentConceptOptional')}</span>
        <input
          className={styles.input}
          value={question.concept}
          onChange={(event) => onChange({ concept: event.target.value })}
        />
      </label>
    </div>
  )
}
