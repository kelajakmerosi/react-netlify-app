import { Eye, Pencil, PlusCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import type { ContentDraft, QuestionDraftVm } from './types'
import QuestionNavigator from './QuestionNavigator'
import QuestionCardEditor from './QuestionCardEditor'
import TopicPreviewPanel from './TopicPreviewPanel'
import styles from './ContentBuilder.module.css'

interface QuizBuilderStepProps {
  draft: ContentDraft
  editingTopicIndex: number | null
  editingQuestionIndex: number
  mode: 'edit' | 'preview'
  onSetMode: (mode: 'edit' | 'preview') => void
  onSetEditingQuestionIndex: (index: number) => void
  onDraftChange: (draft: ContentDraft) => void
}

export default function QuizBuilderStep({
  draft,
  editingTopicIndex,
  editingQuestionIndex,
  mode,
  onSetMode,
  onSetEditingQuestionIndex,
  onDraftChange,
}: QuizBuilderStepProps): JSX.Element {
  const { t } = useLang()

  const topic = editingTopicIndex != null ? draft.topics[editingTopicIndex] : null
  const questions = topic?.questions ?? []
  const activeQuestion = questions[editingQuestionIndex] ?? null

  const patchQuestion = (patch: Partial<QuestionDraftVm>) => {
    if (editingTopicIndex == null) return

    const nextTopics = draft.topics.map((entry, topicIndex) => {
      if (topicIndex !== editingTopicIndex) return entry
      return {
        ...entry,
        questions: entry.questions.map((question, questionIndex) => (
          questionIndex === editingQuestionIndex ? { ...question, ...patch } : question
        )),
      }
    })

    onDraftChange({ ...draft, topics: nextTopics })
  }

  const addQuestion = () => {
    if (editingTopicIndex == null) return

    const nextTopics = draft.topics.map((entry, topicIndex) => {
      if (topicIndex !== editingTopicIndex) return entry
      return {
        ...entry,
        questions: [
          ...entry.questions,
          { text: '', imageUrl: '', options: ['', '', '', ''], answer: 0, concept: '' },
        ],
      }
    })

    onDraftChange({ ...draft, topics: nextTopics })
    onSetEditingQuestionIndex(questions.length)
  }

  const removeQuestion = () => {
    if (editingTopicIndex == null || questions.length === 0) return

    const nextTopics = draft.topics.map((entry, topicIndex) => {
      if (topicIndex !== editingTopicIndex) return entry
      return {
        ...entry,
        questions: entry.questions.filter((_, questionIndex) => questionIndex !== editingQuestionIndex),
      }
    })

    onDraftChange({ ...draft, topics: nextTopics })
    onSetEditingQuestionIndex(Math.max(0, editingQuestionIndex - 1))
  }

  return (
    <div className={styles.stepSingle}>
      <section className={styles.editorPanel}>
        <div className={styles.rowHeader}>
          <h4>{t('adminContentStep3')}</h4>
          <div className={styles.modeSwitch} role="tablist" aria-label={t('adminContentModeAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'edit'}
              className={`${styles.modeBtn} ${mode === 'edit' ? styles.modeBtnActive : ''}`}
              onClick={() => onSetMode('edit')}
            >
              <Pencil size={14} aria-hidden="true" />
              {t('adminContentModeEdit')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'preview'}
              className={`${styles.modeBtn} ${mode === 'preview' ? styles.modeBtnActive : ''}`}
              onClick={() => onSetMode('preview')}
            >
              <Eye size={14} aria-hidden="true" />
              {t('adminContentModePreview')}
            </button>
          </div>
        </div>

        {!topic ? (
          <div className={styles.emptyState}>{t('adminContentSelectTopicBeforeQuiz')}</div>
        ) : mode === 'preview' ? (
          <TopicPreviewPanel topic={topic} />
        ) : questions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t('adminContentNoQuestions')}</p>
            <div className={styles.inlineActions}>
              <Button variant="ghost" size="sm" onClick={addQuestion}>
                <PlusCircle size={14} aria-hidden="true" />
                {t('adminContentAddQuestion')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.quizBuilderGrid}>
            <QuestionNavigator
              questions={questions}
              activeIndex={editingQuestionIndex}
              onSelect={onSetEditingQuestionIndex}
              onAdd={addQuestion}
            />
            <div className={styles.quizEditorHost}>
              <QuestionCardEditor
                question={activeQuestion}
                onChange={patchQuestion}
                onRemoveQuestion={removeQuestion}
              />
            </div>
          </div>
        )}

        <div className={styles.inlineActions}>
          <Button variant="ghost" size="sm" onClick={() => onSetMode('edit')}>
            <Pencil size={14} aria-hidden="true" />
            {t('adminContentBackToEdit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSetMode('preview')}>
            <Eye size={14} aria-hidden="true" />
            {t('adminContentOpenPreview')}
          </Button>
        </div>
      </section>
    </div>
  )
}
