import { PlusCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import type { QuestionDraftVm } from './types'
import styles from './ContentBuilder.module.css'

interface QuestionNavigatorProps {
  questions: QuestionDraftVm[]
  activeIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
}

export default function QuestionNavigator({ questions, activeIndex, onSelect, onAdd }: QuestionNavigatorProps): JSX.Element {
  const { t } = useLang()

  return (
    <aside className={styles.questionRail}>
      <div className={styles.railHead}>
        <h5>{t('adminContentQuestionsTitle')}</h5>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <PlusCircle size={14} aria-hidden="true" />
          {t('adminContentAddQuestion')}
        </Button>
      </div>

      <div className={styles.questionNavList}>
        {questions.length === 0 ? (
          <div className={styles.emptyState}>{t('adminContentNoQuestions')}</div>
        ) : null}

        {questions.map((question, index) => (
          <button
            key={`${question.id ?? 'new'}-${index}`}
            type="button"
            className={`${styles.questionNavItem} ${activeIndex === index ? styles.questionNavItemActive : ''}`}
            onClick={() => onSelect(index)}
          >
            <strong>{`${t('adminContentQuestionLabel')} ${index + 1}`}</strong>
            <small>{question.text || t('adminContentQuestionEmpty')}</small>
          </button>
        ))}
      </div>
    </aside>
  )
}
