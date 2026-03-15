import { useCallback, useRef } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { MathText } from '../../../components/ui/MathText'
import { useLang } from '../../../hooks'
import type { QuestionDraftVm } from './types'
import { MATH_SYMBOLS, getAuthoringInsert } from './mathSymbols'
import styles from './ContentBuilder.module.css'

interface QuestionCardEditorProps {
  question: QuestionDraftVm | null
  onChange: (patch: Partial<QuestionDraftVm>) => void
  onRemoveQuestion: () => void
}

export default function QuestionCardEditor({ question, onChange, onRemoveQuestion }: QuestionCardEditorProps): JSX.Element {
  const { t } = useLang()
  const textRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = useCallback((snippet: string, cursorOffset?: number) => {
    if (!question) return
    const el = textRef.current
    const value = question.text
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = value.slice(0, start) + snippet + value.slice(end)
    onChange({ text: next })
    const pos = start + (cursorOffset ?? snippet.length)
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(pos, pos) }
    })
  }, [question, onChange])

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
      {/* Math symbol toolbar */}
      <div className={styles.mathToolbar} role="toolbar" aria-label={t('adminExamMathToolbar')}>
        {MATH_SYMBOLS.map((item, idx) =>
          'sep' in item ? (
            <span key={`sep-${idx}`} className={styles.mathToolbarSep} />
          ) : (
            <button
              key={item.snippet}
              type="button"
              className={styles.mathToolbarBtn}
              title={item.title}
              onClick={() => {
                const insert = getAuthoringInsert(item)
                insertAtCursor(insert.text, insert.cursor)
              }}
            >
              {item.label}
            </button>
          ),
        )}
      </div>

      <label className={styles.fieldWide}>
        <span>{t('adminContentQuestionText')}</span>
        <textarea
          ref={textRef}
          className={styles.textarea}
          rows={3}
          value={question.text}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      </label>

      {question.text.includes('$') && (
        <div className={styles.mathPreviewBox}>
          <span className={styles.mathPreviewLabel}>{t('adminExamMathPreview')}</span>
          <div className={styles.mathPreviewContent}>
            <MathText>{question.text}</MathText>
          </div>
        </div>
      )}

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

      {question.options.some((o) => o.includes('$')) && (
        <div className={styles.mathPreviewBox}>
          <span className={styles.mathPreviewLabel}>{t('adminExamMathPreviewOptions')}</span>
          <div className={styles.mathPreviewContent}>
            {question.options.map((option, idx) =>
              option.includes('$') ? (
                <div key={idx} className={styles.mathPreviewOption}>
                  <strong>{String.fromCharCode(65 + idx)})</strong> <MathText>{option}</MathText>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

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
