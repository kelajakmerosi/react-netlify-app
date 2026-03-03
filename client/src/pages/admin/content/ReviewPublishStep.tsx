import { AlertTriangle, CheckCircle2, FileEdit, Send, ShieldAlert } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import type { ContentDraft, ValidationIssue } from './types'
import styles from './ContentBuilder.module.css'

interface ReviewPublishStepProps {
  draft: ContentDraft
  issues: ValidationIssue[]
  publishing: boolean
  onSaveDraft: () => void
  onPublish: () => void
}

export default function ReviewPublishStep({
  draft,
  issues,
  publishing,
  onSaveDraft,
  onPublish,
}: ReviewPublishStepProps): JSX.Element {
  const { t } = useLang()

  const totalQuestions = draft.topics.reduce((sum, topic) => sum + topic.questions.length, 0)

  return (
    <section className={styles.editorPanel}>
      <div className={styles.rowHeader}>
        <h4>{t('adminContentStep4')}</h4>
        <span className={styles.stepHintInline}>
          <Send size={14} aria-hidden="true" />
          {t('adminContentStep4Hint')}
        </span>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <p>{t('adminContentSummarySubject')}</p>
          <strong>{draft.subject.title || t('adminContentSummaryMissing')}</strong>
        </div>
        <div className={styles.summaryItem}>
          <p>{t('adminContentSummaryTopics')}</p>
          <strong>{draft.topics.length}</strong>
        </div>
        <div className={styles.summaryItem}>
          <p>{t('adminContentSummaryQuestions')}</p>
          <strong>{totalQuestions}</strong>
        </div>
      </div>

      <div className={styles.validationBox}>
        <h5>
          <ShieldAlert size={14} aria-hidden="true" />
          {t('adminContentValidationTitle')}
        </h5>

        {issues.length === 0 ? (
          <p className={styles.validState}>
            <CheckCircle2 size={14} aria-hidden="true" />
            {t('adminContentValidationPass')}
          </p>
        ) : (
          <ul className={styles.issueList}>
            {issues.map((issue) => (
              <li key={`${issue.step}-${issue.path}`}>
                <AlertTriangle size={14} aria-hidden="true" />
                {t(issue.message)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.publishActions}>
        <Button variant="ghost" onClick={onSaveDraft}>
          <FileEdit size={14} aria-hidden="true" />
          {t('adminContentSaveDraft')}
        </Button>

        <Button variant="primary" onClick={onPublish} disabled={issues.length > 0 || publishing}>
          <Send size={14} aria-hidden="true" />
          {publishing ? t('adminContentPublishing') : t('adminContentPublish')}
        </Button>
      </div>
    </section>
  )
}
