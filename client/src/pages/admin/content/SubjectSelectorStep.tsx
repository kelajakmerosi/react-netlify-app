import { ArrowLeft, Paintbrush2, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui'
import { useLang } from '../../../hooks'
import { getSubjectVisual } from '../../../utils/subjectVisuals'
import { getSubjectPresetTitle, resolveSubjectPresetId, SUBJECT_PRESETS } from './subjectPresets'
import type { ContentDraft } from './types'
import styles from './ContentBuilder.module.css'

interface SubjectSelectorStepProps {
  isNewSubject: boolean
  draft: ContentDraft
  onDraftChange: (draft: ContentDraft) => void
  onBackToInventory: () => void
  onRequestDeleteSubject: () => void
}

export default function SubjectSelectorStep({
  isNewSubject,
  draft,
  onDraftChange,
  onBackToInventory,
  onRequestDeleteSubject,
}: SubjectSelectorStepProps): JSX.Element {
  const { t, lang } = useLang()
  const activePresetId = resolveSubjectPresetId(draft.subject.icon, draft.subject.color)
  const previewVisual = getSubjectVisual(activePresetId ?? undefined)
  const previewTitle = getSubjectPresetTitle(activePresetId ?? 'math', lang)

  return (
    <section className={styles.editorPanel}>
      <div className={styles.rowHeader}>
        <div>
          <h4>{isNewSubject ? t('adminContentCreateSubjectTitle') : t('adminContentEditSubjectTitle')}</h4>
          <p className={styles.inventorySubtitle}>{t('adminContentStep1Hint')}</p>
        </div>

        <div className={styles.inlineActions}>
          <Button variant="ghost" size="sm" onClick={onBackToInventory}>
            <ArrowLeft size={14} aria-hidden="true" />
            {t('adminContentBackToInventory')}
          </Button>
          {!isNewSubject ? (
            <Button variant="danger" size="sm" onClick={onRequestDeleteSubject}>
              <Trash2 size={14} aria-hidden="true" />
              {t('adminContentDeleteSubject')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.subjectDetailsLayout}>
        <div className={styles.subjectDetailsMain}>
          <div className={styles.formGrid}>
            <label className={styles.fieldWide}>
              <span>{t('adminContentTitle')}</span>
              <Input
                value={draft.subject.title}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, title: event.target.value },
                })}
              />
            </label>



            <label className={styles.fieldWide}>
              <span>{t('adminContentDescription')}</span>
              <Textarea
                rows={4}
                value={draft.subject.description}
                onChange={(event) => onDraftChange({
                  ...draft,
                  subject: { ...draft.subject, description: event.target.value },
                })}
              />
            </label>
          </div>

          <section className={styles.presetSection}>
            <div className={styles.rowHeader}>
              <div>
                <h4>{t('adminContentVisualPresetTitle')}</h4>
                <p className={styles.inventorySubtitle}>{t('adminContentVisualPresetSubtitle')}</p>
              </div>
            </div>

            <div className={styles.presetGrid}>
              {SUBJECT_PRESETS.map((preset) => {
                const visual = preset.visual
                const active = activePresetId === preset.id

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetCard} ${active ? styles.presetCardActive : ''}`}
                    onClick={() => onDraftChange({
                      ...draft,
                      subject: {
                        ...draft.subject,
                        icon: preset.icon,
                        color: preset.color,
                      },
                    })}
                  >
                    <div
                      className={styles.presetCardMedia}
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(11, 10, 20, 0.18), rgba(11, 10, 20, 0.6)), url(${visual.imageUrl})` }}
                    >
                      <span className={styles.subjectCardBadge}>{getSubjectPresetTitle(preset.id, lang)}</span>
                    </div>
                    <div className={styles.presetCardBody}>
                      <div className={styles.presetCardTop}>
                        <strong>{getSubjectPresetTitle(preset.id, lang)}</strong>
                        <span className={styles.presetSwatch} style={{ background: preset.color }} aria-hidden="true" />
                      </div>
                      <p>{preset.icon}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <details className={styles.advancedDetails}>
            <summary>
              <Paintbrush2 size={14} aria-hidden="true" />
              {t('adminContentAdvancedFields')}
            </summary>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>{t('adminContentOrder')}</span>
                <Input
                  type="number"
                  value={String(draft.subject.order)}
                  onChange={(event) => onDraftChange({
                    ...draft,
                    subject: { ...draft.subject, order: Number(event.target.value) || 0 },
                  })}
                />
              </label>

              <label className={styles.field}>
                <span>{t('adminContentIcon')}</span>
                <Input
                  value={draft.subject.icon}
                  onChange={(event) => onDraftChange({
                    ...draft,
                    subject: { ...draft.subject, icon: event.target.value },
                  })}
                />
              </label>

              <label className={styles.field}>
                <span>{t('adminContentColor')}</span>
                <Input
                  value={draft.subject.color}
                  onChange={(event) => onDraftChange({
                    ...draft,
                    subject: { ...draft.subject, color: event.target.value },
                  })}
                />
              </label>
            </div>
          </details>
        </div>

        <aside className={styles.subjectPreviewCard}>
          <div
            className={styles.subjectPreviewMedia}
            style={{ backgroundImage: `linear-gradient(180deg, rgba(11, 10, 20, 0.12), rgba(11, 10, 20, 0.7)), url(${previewVisual.imageUrl})` }}
          />
          <div className={styles.subjectPreviewBody}>
            <h5>{draft.subject.title.trim() || previewTitle}</h5>
            <p>{draft.subject.description.trim() || t('adminContentStep1Hint')}</p>
            <div className={styles.subjectPreviewMeta}>
              <span>{draft.subject.icon}</span>
              <span>{draft.subject.color}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
