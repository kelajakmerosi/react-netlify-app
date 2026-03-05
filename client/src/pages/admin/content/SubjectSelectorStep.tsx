import { BookOpen, FileEdit, FolderPlus, Trash2 } from 'lucide-react'
import { UI_MIGRATION_FLAGS } from '../../../app/feature-flags'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui'
import { useLang } from '../../../hooks'
import type { ContentDraft } from './types'
import type { SubjectRecord } from '../../../services/admin.service'
import styles from './ContentBuilder.module.css'

interface SubjectSelectorStepProps {
  subjects: SubjectRecord[]
  selectedSubjectId: string | null
  isNewSubject: boolean
  draft: ContentDraft
  onSelectSubject: (subjectId: string) => void
  onCreateSubject: () => void
  onDraftChange: (draft: ContentDraft) => void
  onRequestDeleteSubject: () => void
}

export default function SubjectSelectorStep({
  subjects,
  selectedSubjectId,
  isNewSubject,
  draft,
  onSelectSubject,
  onCreateSubject,
  onDraftChange,
  onRequestDeleteSubject,
}: SubjectSelectorStepProps): JSX.Element {
  const { t } = useLang()
  const useSharedPrimitives = UI_MIGRATION_FLAGS.adminUseSharedFormPrimitives

  return (
    <div className={styles.stepLayout}>
      <aside className={styles.subjectRail}>
        <div className={styles.railHead}>
          <h4>{t('adminContentSubjectsTitle')}</h4>
          <Button variant="ghost" size="sm" onClick={onCreateSubject}>
            <FolderPlus size={14} aria-hidden="true" />
            {t('adminContentNewSubject')}
          </Button>
        </div>

        <div className={styles.subjectList}>
          {subjects.length === 0 ? (
            <div className={styles.emptyState}>{t('adminContentNoSubjects')}</div>
          ) : null}

          {subjects.map((subject) => {
            const active = selectedSubjectId === subject.id
            return (
              useSharedPrimitives ? (
                <Button
                  key={subject.id}
                  variant="ghost"
                  className={`${styles.subjectItem} ${active ? styles.subjectItemActive : ''}`}
                  onClick={() => onSelectSubject(subject.id)}
                >
                  <div>
                    <strong>{subject.title}</strong>
                    <small>
                      {(subject.topics?.length ?? 0)} {t('adminContentTopicsCountSuffix')}
                    </small>
                  </div>
                  <BookOpen size={14} aria-hidden="true" />
                </Button>
              ) : (
                <button
                  key={subject.id}
                  type="button"
                  className={`${styles.subjectItem} ${active ? styles.subjectItemActive : ''}`}
                  onClick={() => onSelectSubject(subject.id)}
                >
                  <div>
                    <strong>{subject.title}</strong>
                    <small>
                      {(subject.topics?.length ?? 0)} {t('adminContentTopicsCountSuffix')}
                    </small>
                  </div>
                  <BookOpen size={14} aria-hidden="true" />
                </button>
              )
            )
          })}
        </div>
      </aside>

      <section className={styles.editorPanel}>
        <div className={styles.rowHeader}>
          <h4>{isNewSubject ? t('adminContentCreateSubjectTitle') : t('adminContentEditSubjectTitle')}</h4>
          {!isNewSubject && selectedSubjectId ? (
            <Button variant="danger" size="sm" onClick={onRequestDeleteSubject}>
              <Trash2 size={14} aria-hidden="true" />
              {t('adminContentDeleteSubject')}
            </Button>
          ) : null}
        </div>

        <div className={styles.formGrid}>
          <label className={styles.fieldWide}>
            <span>{t('adminContentTitle')}</span>
            {useSharedPrimitives ? (
              <Input
                value={draft.subject.title}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, title: event.target.value },
                })}
              />
            ) : (
              <input
                className={styles.input}
                value={draft.subject.title}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, title: event.target.value },
                })}
              />
            )}
          </label>

          <label className={styles.field}>
            <span>{t('adminContentOrder')}</span>
            {useSharedPrimitives ? (
              <Input
                type="number"
                value={String(draft.subject.order)}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, order: Number(event.target.value) || 0 },
                })}
              />
            ) : (
              <input
                className={styles.input}
                type="number"
                value={draft.subject.order}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, order: Number(event.target.value) || 0 },
                })}
              />
            )}
          </label>

          <label className={styles.field}>
            <span>{t('adminContentIcon')}</span>
            {useSharedPrimitives ? (
              <Input
                value={draft.subject.icon}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, icon: event.target.value },
                })}
              />
            ) : (
              <input
                className={styles.input}
                value={draft.subject.icon}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, icon: event.target.value },
                })}
              />
            )}
          </label>

          <label className={styles.field}>
            <span>{t('adminContentColor')}</span>
            {useSharedPrimitives ? (
              <Input
                value={draft.subject.color}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, color: event.target.value },
                })}
              />
            ) : (
              <input
                className={styles.input}
                value={draft.subject.color}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, color: event.target.value },
                })}
              />
            )}
          </label>

          <label className={styles.fieldWide}>
            <span>{t('adminContentDescription')}</span>
            {useSharedPrimitives ? (
              <Textarea
                rows={4}
                value={draft.subject.description}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, description: event.target.value },
                })}
              />
            ) : (
              <textarea
                className={styles.textarea}
                rows={4}
                value={draft.subject.description}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, description: event.target.value },
                })}
              />
            )}
          </label>
        </div>

        <div className={styles.stepHint}>
          <FileEdit size={14} aria-hidden="true" />
          <span>{t('adminContentStep1Hint')}</span>
        </div>
      </section>
    </div>
  )
}
