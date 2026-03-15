import { ChangeEvent } from 'react'
import { ArrowLeft, Paintbrush2, Plus, Trash2, Upload, X } from 'lucide-react'
import type { SubjectSection } from '@shared/contracts'
import type { Subject } from '../../../types'
import { SubjectCard } from '../../../components/features/SubjectCard'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui'
import { useLang } from '../../../hooks'
import { getSubjectPresetTitle, resolveSubjectPresetId, SUBJECT_PRESETS } from './subjectPresets'
import type { ContentDraft } from './types'
import styles from './ContentBuilder.module.css'

interface SubjectSelectorStepProps {
  isNewSubject: boolean
  canDeleteSubject: boolean
  draft: ContentDraft
  sections: SubjectSection[]
  onDraftChange: (draft: ContentDraft) => void
  onSectionsChange: (sections: SubjectSection[]) => void
  onBackToInventory: () => void
  onRequestDeleteSubject: () => void
}

export default function SubjectSelectorStep({
  isNewSubject,
  canDeleteSubject,
  draft,
  sections,
  onDraftChange,
  onSectionsChange,
  onBackToInventory,
  onRequestDeleteSubject,
}: SubjectSelectorStepProps): JSX.Element {
  const { t, lang } = useLang()
  const subjectTitle = draft.subject.title ?? ''
  const subjectDescription = draft.subject.description ?? ''
  const subjectIcon = draft.subject.icon ?? ''
  const subjectColor = draft.subject.color ?? '#3f68f7'
  const subjectImageUrl = draft.subject.imageUrl ?? ''
  const visualMode = draft.subject.visualMode === 'manual' ? 'manual' : 'preset'
  const activePresetId = resolveSubjectPresetId(subjectIcon, subjectColor)
  const activePreset = SUBJECT_PRESETS.find((preset) => preset.id === activePresetId) ?? null
  const selectedVisualOption = visualMode === 'manual' ? '__manual__' : (activePresetId ?? '__manual__')
  const previewTitle = getSubjectPresetTitle(activePresetId ?? 'math', lang)
  const previewVisualKey = activePresetId || subjectIcon.trim() || subjectTitle.trim() || 'math'
  const colorPickerValue = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(subjectColor.trim())
    ? subjectColor.trim()
    : '#3f68f7'
  const previewSubject: Subject = {
    id: subjectTitle.trim() || 'preview',
    title: subjectTitle.trim() || previewTitle,
    description: subjectDescription.trim(),
    icon: null,
    iconName: subjectIcon.trim() || undefined,
    imageUrl: subjectImageUrl.trim() || undefined,
    color: subjectColor.trim() || '#3f68f7',
    gradient: '',
    topics: draft.topics.map((topic, topicIndex) => ({
      id: topic.id.trim() || `topic-${topicIndex + 1}`,
      title: topic.title.trim(),
      videoId: topic.videoId.trim() || 'previewvideo',
      videoUrl: topic.videoUrl.trim() || undefined,
      questions: topic.questions.map((question, questionIndex) => {
        const options = question.options.map((option) => option.trim()).filter(Boolean)
        return {
          id: question.id ?? questionIndex + 1,
          text: question.text.trim() || `Question ${questionIndex + 1}`,
          imageUrl: question.imageUrl.trim() || undefined,
          options: options.length >= 2 ? options : ['Option A', 'Option B'],
          answer: 0,
          concept: question.concept.trim() || undefined,
        }
      }),
    })),
    modules: [],
    sections,
  }

  const updateSection = (sectionIndex: number, patch: Partial<SubjectSection>) => {
    onSectionsChange(sections.map((section, index) => (
      index === sectionIndex ? { ...section, ...patch } : section
    )))
  }

  const addSection = () => {
    onSectionsChange([
      ...sections,
      {
        id: `section-${Date.now()}-${sections.length + 1}`,
        type: 'general',
        title: '',
        topicIds: [],
      },
    ])
  }

  const removeSection = (sectionIndex: number) => {
    onSectionsChange(sections.filter((_, index) => index !== sectionIndex))
  }

  const applyPreset = (presetId: string) => {
    if (presetId === '__manual__') {
      onDraftChange({
        ...draft,
        subject: {
          ...draft.subject,
          visualMode: 'manual',
        },
      })
      return
    }

    const preset = SUBJECT_PRESETS.find((entry) => entry.id === presetId)
    if (!preset) return
    onDraftChange({
      ...draft,
      subject: {
        ...draft.subject,
        icon: preset.icon,
        color: preset.color,
        imageUrl: '',
        visualMode: 'preset',
      },
    })
  }

  const handleManualImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) return
      onDraftChange({
        ...draft,
        subject: {
          ...draft.subject,
          imageUrl: result,
          visualMode: 'manual',
        },
      })
    }
    reader.readAsDataURL(file)
  }

  const clearManualImage = () => {
    onDraftChange({
      ...draft,
      subject: {
        ...draft.subject,
        imageUrl: '',
      },
    })
  }

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
          {!isNewSubject && canDeleteSubject ? (
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

          <section className={styles.sectionEditor}>
            <div className={styles.rowHeader}>
              <div>
                <h4>{t('adminContentSectionsEditorTitle')}</h4>
                <p className={styles.inventorySubtitle}>{t('adminContentSectionsEditorSubtitle')}</p>
              </div>

              <Button variant="ghost" size="sm" onClick={addSection}>
                <Plus size={14} aria-hidden="true" />
                {t('adminContentAddSection')}
              </Button>
            </div>

            {sections.length === 0 ? (
              <p className={styles.sectionEditorEmpty}>{t('adminContentSectionsEditorEmpty')}</p>
            ) : (
              <div className={styles.sectionEditorList}>
                {sections.map((section, index) => (
                  <div key={section.id} className={styles.sectionEditorCard}>
                    <div className={styles.sectionEditorHead}>
                      <span className={styles.sectionEditorBadge}>
                        {section.type === 'attestation'
                          ? t('adminContentSectionTypeAttestation')
                          : section.type === 'general'
                            ? t('adminContentSectionTypeGeneral')
                            : t('adminContentSectionTypeMilliy')}
                      </span>

                      <button
                        type="button"
                        className={styles.iconDangerBtn}
                        aria-label={t('adminContentDelete')}
                        onClick={() => removeSection(index)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        <span>{t('adminContentSectionType')}</span>
                        <select
                          className={styles.sectionSelect}
                          value={section.type}
                          onChange={(event) => updateSection(index, {
                            type: event.target.value as SubjectSection['type'],
                          })}
                        >
                          <option value="attestation">{t('adminContentSectionTypeAttestation')}</option>
                          <option value="general">{t('adminContentSectionTypeGeneral')}</option>
                          <option value="milliy">{t('adminContentSectionTypeMilliy')}</option>
                        </select>
                      </label>

                      <label className={styles.fieldWide}>
                        <span>{t('adminContentSectionTitle')}</span>
                        <Input
                          value={section.title}
                          onChange={(event) => updateSection(index, { title: event.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.presetSection}>
            <div className={styles.rowHeader}>
              <div>
                <h4>{t('adminContentVisualPresetTitle')}</h4>
                <p className={styles.inventorySubtitle}>{t('adminContentVisualPresetSubtitle')}</p>
              </div>
            </div>

            <div className={styles.presetControlRow}>
              <label className={styles.field}>
                <span>{t('adminContentVisualPresetTitle')}</span>
                <select
                  className={styles.sectionSelect}
                  value={selectedVisualOption}
                  onChange={(event) => applyPreset(event.target.value)}
                >
                  <option value="__manual__">{t('adminContentCustomVisualOption')}</option>
                  {SUBJECT_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {getSubjectPresetTitle(preset.id, lang)}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.presetSummary} aria-live="polite">
                <span
                  className={styles.presetSwatch}
                  style={{ background: activePreset?.color ?? colorPickerValue }}
                  aria-hidden="true"
                />
                <div className={styles.presetSummaryCopy}>
                  <strong>{visualMode === 'manual' ? t('adminContentCustomVisualOption') : activePreset ? getSubjectPresetTitle(activePreset.id, lang) : subjectIcon || previewTitle}</strong>
                  <span>{visualMode === 'manual' ? t('adminContentManualImageHint') : activePreset?.icon ?? subjectIcon}</span>
                </div>
              </div>
            </div>

            {visualMode === 'manual' ? (
              <div className={styles.manualImagePanel}>
                <label className={styles.fieldWide}>
                  <span>{t('adminContentManualImageLabel')}</span>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleManualImageUpload}
                  />
                </label>

                <div className={styles.manualImageActions}>
                  <span className={styles.inventorySubtitle}>
                    {subjectImageUrl ? t('adminContentManualImageReady') : t('adminContentManualImageHint')}
                  </span>
                  {subjectImageUrl ? (
                    <Button variant="ghost" size="sm" onClick={clearManualImage}>
                      <X size={14} aria-hidden="true" />
                      {t('adminContentManualImageRemove')}
                    </Button>
                  ) : (
                    <span className={styles.manualImageHint}>
                      <Upload size={14} aria-hidden="true" />
                      {t('adminContentManualImageLocalOnly')}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
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
                <div className={styles.colorInputWrap}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={colorPickerValue}
                    aria-label={t('adminContentColor')}
                    onChange={(event) => onDraftChange({
                      ...draft,
                      subject: { ...draft.subject, color: event.target.value },
                    })}
                  />
                  <Input
                    className={styles.colorTextInput}
                    value={draft.subject.color}
                    onChange={(event) => onDraftChange({
                      ...draft,
                      subject: { ...draft.subject, color: event.target.value },
                    })}
                  />
                </div>
              </label>
            </div>
          </details>
        </div>

        <aside className={styles.previewPanel}>
          <div className={styles.rowHeader}>
            <div>
              <h4>{t('adminContentCardPreviewTitle')}</h4>
              <p className={styles.inventorySubtitle}>{t('adminContentCardPreviewSubtitle')}</p>
            </div>
          </div>

          <div className={styles.previewCardFrame}>
            <SubjectCard
              subject={previewSubject}
              name={subjectTitle.trim() || previewTitle}
              completed={0}
              total={draft.topics.length}
              pct={0}
              actionLabel={t('adminContentEditDetails')}
              onClick={() => undefined}
              visualKey={previewVisualKey}
            />
          </div>

          <div className={styles.subjectPreviewMeta}>
            <span>{subjectIcon || previewVisualKey}</span>
            <span>{subjectColor || '#3f68f7'}</span>
          </div>
        </aside>
      </div>
    </section>
  )
}
