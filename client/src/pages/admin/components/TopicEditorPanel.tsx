import { Eraser, Save } from 'lucide-react'
import { UI_MIGRATION_FLAGS } from '../../../app/feature-flags'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useLang } from '../../../hooks'
import type { TopicDraft, TopicQuestionDraft } from '../types'
import QuestionEditorList from './QuestionEditorList'
import styles from '../AdminWorkspace.module.css'

interface TopicEditorPanelProps {
  topicDraft: TopicDraft
  editingTopicId: string | null
  saving: boolean
  onDraftChange: (patch: Partial<TopicDraft>) => void
  onQuestionAdd: () => void
  onQuestionChange: (index: number, patch: Partial<TopicQuestionDraft>) => void
  onQuestionRemove: (index: number) => void
  onSave: () => void
  onClear: () => void
}

export function TopicEditorPanel({
  topicDraft,
  editingTopicId,
  saving,
  onDraftChange,
  onQuestionAdd,
  onQuestionChange,
  onQuestionRemove,
  onSave,
  onClear,
}: TopicEditorPanelProps): JSX.Element {
  const { t } = useLang()
  const useSharedPrimitives = UI_MIGRATION_FLAGS.adminUseSharedFormPrimitives

  return (
    <section className={styles.topicEditorPanel}>
      <div className={styles.rowHeader}>
        <h4>{editingTopicId ? t('adminContentEditTopicTitle') : t('adminContentCreateTopicTitle')}</h4>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>{t('adminContentTopicId')}</span>
          {useSharedPrimitives ? (
            <Input value={topicDraft.id} onChange={(event) => onDraftChange({ id: event.target.value })} />
          ) : (
            <input
              className={styles.input}
              value={topicDraft.id}
              onChange={(event) => onDraftChange({ id: event.target.value })}
            />
          )}
        </label>
        <label className={styles.field}>
          <span>{t('adminContentTitle')}</span>
          {useSharedPrimitives ? (
            <Input value={topicDraft.title} onChange={(event) => onDraftChange({ title: event.target.value })} />
          ) : (
            <input
              className={styles.input}
              value={topicDraft.title}
              onChange={(event) => onDraftChange({ title: event.target.value })}
            />
          )}
        </label>
        <label className={styles.fieldWide}>
          <span>{t('adminContentVideoId')}</span>
          {useSharedPrimitives ? (
            <Input value={topicDraft.videoId} onChange={(event) => onDraftChange({ videoId: event.target.value })} />
          ) : (
            <input
              className={styles.input}
              value={topicDraft.videoId}
              onChange={(event) => onDraftChange({ videoId: event.target.value })}
            />
          )}
        </label>
        <label className={styles.fieldWide}>
          <span>{t('adminContentVideoUrl')}</span>
          {useSharedPrimitives ? (
            <Input value={topicDraft.videoUrl ?? ''} onChange={(event) => onDraftChange({ videoUrl: event.target.value })} />
          ) : (
            <input
              className={styles.input}
              value={topicDraft.videoUrl ?? ''}
              onChange={(event) => onDraftChange({ videoUrl: event.target.value })}
            />
          )}
        </label>
      </div>

      <QuestionEditorList
        questions={topicDraft.questions}
        onQuestionAdd={onQuestionAdd}
        onQuestionChange={onQuestionChange}
        onQuestionRemove={onQuestionRemove}
      />

      <div className={styles.actionRow}>
        <Button variant="primary" disabled={saving} onClick={onSave}>
          <Save size={14} aria-hidden="true" />
          {saving ? t('adminSaving') : t('adminContentSaveTopic')}
        </Button>
        <Button variant="ghost" onClick={onClear}>
          <Eraser size={14} aria-hidden="true" />
          {t('adminContentClear')}
        </Button>
      </div>
    </section>
  )
}

export default TopicEditorPanel
