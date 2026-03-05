import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { UI_MIGRATION_FLAGS } from '../../../app/feature-flags'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui'
import { useLang } from '../../../hooks'
import type { SubjectDraft } from '../types'
import type { SubjectTopic } from '../../../services/admin.service'
import styles from '../AdminWorkspace.module.css'

interface SubjectEditorPanelProps {
  draft: SubjectDraft
  saving: boolean
  topics: SubjectTopic[]
  onDraftChange: (patch: Partial<SubjectDraft>) => void
  onSaveSubject: () => void
  onDeleteSubject: () => void
  onCreateTopic: () => void
  onEditTopic: (topic: SubjectTopic) => void
  onDeleteTopic: (topicId: string) => void
  onReorderTopic: (topicId: string, direction: 'up' | 'down') => void
  topicEditor: ReactNode
}

export function SubjectEditorPanel({
  draft,
  saving,
  topics,
  onDraftChange,
  onSaveSubject,
  onDeleteSubject,
  onCreateTopic,
  onEditTopic,
  onDeleteTopic,
  onReorderTopic,
  topicEditor,
}: SubjectEditorPanelProps): JSX.Element {
  const { t } = useLang()
  const useSharedPrimitives = UI_MIGRATION_FLAGS.adminUseSharedFormPrimitives

  return (
    <section className={styles.subjectEditorPanel}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>{t('adminContentTitle')}</span>
          {useSharedPrimitives ? (
            <Input value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} />
          ) : (
            <input className={styles.input} value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} />
          )}
        </label>

        <label className={styles.field}>
          <span>{t('adminContentOrder')}</span>
          {useSharedPrimitives ? (
            <Input
              type="number"
              value={String(draft.order)}
              onChange={(event) => onDraftChange({ order: Number(event.target.value) || 0 })}
            />
          ) : (
            <input
              className={styles.input}
              type="number"
              value={draft.order}
              onChange={(event) => onDraftChange({ order: Number(event.target.value) || 0 })}
            />
          )}
        </label>

        <label className={styles.field}>
          <span>{t('adminContentIcon')}</span>
          {useSharedPrimitives ? (
            <Input value={draft.icon} onChange={(event) => onDraftChange({ icon: event.target.value })} />
          ) : (
            <input className={styles.input} value={draft.icon} onChange={(event) => onDraftChange({ icon: event.target.value })} />
          )}
        </label>

        <label className={styles.field}>
          <span>{t('adminContentColor')}</span>
          {useSharedPrimitives ? (
            <Input value={draft.color} onChange={(event) => onDraftChange({ color: event.target.value })} />
          ) : (
            <input className={styles.input} value={draft.color} onChange={(event) => onDraftChange({ color: event.target.value })} />
          )}
        </label>

        <label className={styles.fieldWide}>
          <span>{t('adminContentDescription')}</span>
          {useSharedPrimitives ? (
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(event) => onDraftChange({ description: event.target.value })}
            />
          ) : (
            <textarea
              className={styles.textarea}
              rows={3}
              value={draft.description}
              onChange={(event) => onDraftChange({ description: event.target.value })}
            />
          )}
        </label>
      </div>

      <div className={styles.actionRow}>
        <Button variant="primary" disabled={saving} onClick={onSaveSubject}>
          {saving ? t('adminSaving') : t('adminContentSaveSubject')}
        </Button>
        <Button variant="danger" onClick={onDeleteSubject}>
          <Trash2 size={14} aria-hidden="true" />
          {t('adminContentDeleteSubject')}
        </Button>
      </div>

      <div className={styles.rowHeader}>
        <h4>{t('adminContentTopicsTitle')}</h4>
        <Button variant="ghost" size="sm" onClick={onCreateTopic}>
          <PlusCircle size={14} aria-hidden="true" />
          {t('adminContentNewTopic')}
        </Button>
      </div>

      <div className={styles.topicList}>
        {topics.length === 0 ? (
          <div className={styles.emptyState}>{t('adminContentNoTopics')}</div>
        ) : topics.map((topic) => (
          <div key={topic.id} className={styles.topicItem}>
            <div>
              <strong>{topic.title}</strong>
              <p className={styles.topicMeta}>
                {topic.id}
                {' · '}
                {`${topic.questions?.length ?? 0} ${t('adminContentQuestionsCountSuffix')}`}
              </p>
            </div>
            <div className={styles.actionRow}>
              <Button variant="ghost" size="sm" onClick={() => onReorderTopic(topic.id, 'up')}>
                <ArrowUp size={14} aria-hidden="true" />
                {t('adminContentMoveUp')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onReorderTopic(topic.id, 'down')}>
                <ArrowDown size={14} aria-hidden="true" />
                {t('adminContentMoveDown')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEditTopic(topic)}>
                <Pencil size={14} aria-hidden="true" />
                {t('adminContentEdit')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDeleteTopic(topic.id)}>
                <Trash2 size={14} aria-hidden="true" />
                {t('adminContentDelete')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {topicEditor}
    </section>
  )
}

export default SubjectEditorPanel
