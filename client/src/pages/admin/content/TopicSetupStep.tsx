import { ArrowDown, ArrowUp, CheckCircle2, CircleDashed, PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { IconButton, Input } from '../../../components/ui'
import { useLang } from '../../../hooks'
import { normalizeTopicOrders, resolveTopicStatus } from './contentUtils'
import type { ContentDraft, TopicDraftVm, TopicStatus } from './types'
import type { SubjectRecord } from '../../../services/admin.service'
import styles from './ContentBuilder.module.css'

interface TopicSetupStepProps {
  draft: ContentDraft
  liveSubject: SubjectRecord | null
  editingTopicIndex: number | null
  onDraftChange: (draft: ContentDraft) => void
  onEditTopicIndex: (index: number | null) => void
}

const statusClassMap: Record<TopicStatus, string> = {
  draft: styles.statusDraft,
  ready: styles.statusReady,
  published: styles.statusPublished,
}

export default function TopicSetupStep({
  draft,
  liveSubject,
  editingTopicIndex,
  onDraftChange,
  onEditTopicIndex,
}: TopicSetupStepProps): JSX.Element {
  const { t } = useLang()

  const selectedTopic = editingTopicIndex != null ? draft.topics[editingTopicIndex] : null

  const setTopicPatch = (patch: Partial<TopicDraftVm>) => {
    if (editingTopicIndex == null) return
    const nextTopics = draft.topics.map((topic, index) => (
      index === editingTopicIndex ? { ...topic, ...patch } : topic
    ))
    onDraftChange({ ...draft, topics: nextTopics })
  }

  const addTopic = () => {
    const nextTopic: TopicDraftVm = {
      id: '',
      title: '',
      videoId: '',
      videoUrl: '',
      order: draft.topics.length,
      questions: [],
    }
    const nextTopics = [...draft.topics, nextTopic]
    onDraftChange({ ...draft, topics: nextTopics })
    onEditTopicIndex(nextTopics.length - 1)
  }

  const removeTopic = (index: number) => {
    const nextTopics = normalizeTopicOrders(draft.topics.filter((_, topicIndex) => topicIndex !== index))
    onDraftChange({ ...draft, topics: nextTopics })
    if (editingTopicIndex === index) onEditTopicIndex(null)
  }

  const moveTopic = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= draft.topics.length) return

    const nextTopics = [...draft.topics]
    const [item] = nextTopics.splice(index, 1)
    nextTopics.splice(targetIndex, 0, item)
    const ordered = normalizeTopicOrders(nextTopics)

    onDraftChange({ ...draft, topics: ordered })
    onEditTopicIndex(targetIndex)
  }

  return (
    <div className={styles.stepLayout}>
      <aside className={styles.topicRail}>
        <div className={styles.railHead}>
          <h4>{t('adminContentTopicsTitle')}</h4>
          <Button variant="ghost" size="sm" onClick={addTopic}>
            <PlusCircle size={14} aria-hidden="true" />
            {t('adminContentNewTopic')}
          </Button>
        </div>

        <div className={styles.topicList}>
          {draft.topics.length === 0 ? (
            <div className={styles.emptyState}>{t('adminContentNoTopics')}</div>
          ) : null}

          {draft.topics.map((topic, index) => {
            const status = resolveTopicStatus(topic, liveSubject)
            const active = index === editingTopicIndex
            const statusLabel = status === 'published'
              ? t('adminContentStatusPublished')
              : status === 'ready'
                ? t('adminContentStatusReady')
                : t('adminContentStatusDraft')

            return (
              <div key={`${topic.id || 'new'}-${index}`} className={`${styles.topicItem} ${active ? styles.topicItemActive : ''}`}>
                <button type="button" className={styles.topicSelectBtn} onClick={() => onEditTopicIndex(index)}>
                  <div>
                    <strong>{topic.title || t('adminContentUntitledTopic')}</strong>
                    <small>{topic.id || t('adminContentNoTopicId')}</small>
                  </div>
                </button>

                <div className={styles.topicMetaRow}>
                  <span className={`${styles.statusBadge} ${statusClassMap[status]}`}>
                    {status === 'draft' ? <CircleDashed size={12} aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}
                    {statusLabel}
                  </span>

                  <div className={styles.iconActions}>
                    <IconButton icon={<ArrowUp size={14} aria-hidden="true" />} label={t('adminContentMoveUp')} onClick={() => moveTopic(index, 'up')} />
                    <IconButton icon={<ArrowDown size={14} aria-hidden="true" />} label={t('adminContentMoveDown')} onClick={() => moveTopic(index, 'down')} />
                    <IconButton icon={<Trash2 size={14} aria-hidden="true" />} label={t('adminContentDelete')} onClick={() => removeTopic(index)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      <section className={styles.editorPanel}>
        <div className={styles.rowHeader}>
          <h4>{t('adminContentStep2')}</h4>
        </div>

        {!selectedTopic ? (
          <div className={styles.emptyState}>{t('adminContentSelectTopicHint')}</div>
        ) : (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>{t('adminContentTopicId')}</span>
              <Input value={selectedTopic.id} onChange={(event) => setTopicPatch({ id: event.target.value })} />
            </label>

            <label className={styles.field}>
              <span>{t('adminContentTitle')}</span>
              <Input value={selectedTopic.title} onChange={(event) => setTopicPatch({ title: event.target.value })} />
            </label>

            <label className={styles.field}>
              <span>{t('adminContentVideoId')}</span>
              <Input value={selectedTopic.videoId} onChange={(event) => setTopicPatch({ videoId: event.target.value })} />
            </label>

            <label className={styles.field}>
              <span>{t('adminContentOrder')}</span>
              <Input
                type="number"
                value={String(selectedTopic.order)}
                onChange={(event) => setTopicPatch({ order: Number(event.target.value) || 0 })}
              />
            </label>

            <label className={styles.fieldWide}>
              <span>{t('adminContentVideoUrl')}</span>
              <Input value={selectedTopic.videoUrl} onChange={(event) => setTopicPatch({ videoUrl: event.target.value })} />
            </label>
          </div>
        )}
      </section>
    </div>
  )
}
