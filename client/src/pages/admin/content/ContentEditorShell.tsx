import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Alert } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import { useToast } from '../../../app/providers/ToastProvider'
import type { SubjectSection } from '@shared/contracts'
import { adminService, type SubjectRecord } from '../../../services/admin.service'
import { resolveUiErrorMessage } from '../../../utils/errorPresentation'
import { getSubjectRouteId, isSeedSubjectRouteId } from '../../../utils/subjectCatalog'
import { sortSubjectRecords, syncSubjectListCache } from '../../../utils/subjectQueryCache'
import { TOPIC_NAMES } from '../../../constants'
import ContentStepper from './ContentStepper'
import ManagedExamWorkspace from './ManagedExamWorkspace'
import PublishConfirmModal from './PublishConfirmModal'
import QuizBuilderStep from './QuizBuilderStep'
import ReviewPublishStep from './ReviewPublishStep'
import SubjectSelectorStep from './SubjectSelectorStep'
import TopicSetupStep from './TopicSetupStep'
import {
  buildStepCompletion,
  getFirstInvalidStep,
  validateDraftForPublish,
} from './contentUtils'
import type { ContentCatalogEntry } from './catalogUtils'
import {
  emptyContentDraft,
  normalizeContentDraft,
  toContentDraft,
  toSubjectPayload,
  type BuilderStep,
  type ContentDraft,
  type StoredDraftPayload,
} from './types'
import styles from './ContentBuilder.module.css'

interface ContentEditorShellProps {
  subjectRef: string
  entry: ContentCatalogEntry | null
  subjects: SubjectRecord[]
  isSuperAdmin: boolean
  onSubjectsChange: (subjects: SubjectRecord[]) => void
}

const STEP_SLUGS: Record<BuilderStep, 'details' | 'topics' | 'quiz' | 'review'> = {
  1: 'details',
  2: 'topics',
  3: 'quiz',
  4: 'review',
}

const STEP_BY_SLUG: Record<string, BuilderStep> = {
  details: 1,
  topics: 2,
  quiz: 3,
  review: 4,
}

const FALLBACK_ICON_BY_ID: Record<string, string> = {
  '5': 'calculator',
  '6': 'monitor',
  '11': 'zap',
  '12': 'languages',
  '13': 'dna',
  '14': 'bookopen',
}

const getStorageKey = (subjectRef: string) => `km_admin_content_draft_${subjectRef}`

const getMaxAccessibleStep = (draft: ContentDraft): BuilderStep => {
  const completion = buildStepCompletion(draft)
  if (completion.step1 && completion.step2 && completion.step3) return 4
  if (completion.step1 && completion.step2) return 3
  if (completion.step1) return 2
  return 1
}

const resolveSeedTopicTitle = (routeId: string, topicId: string, fallbackTitle: string, lang: keyof typeof TOPIC_NAMES): string => {
  if (fallbackTitle.trim()) return fallbackTitle
  return TOPIC_NAMES[lang]?.[topicId] ?? TOPIC_NAMES.uz?.[topicId] ?? `${routeId}-${topicId}`
}

const buildDraftFromEntry = (entry: ContentCatalogEntry, lang: keyof typeof TOPIC_NAMES): ContentDraft => {
  if (entry.liveSubject) return toContentDraft(entry.liveSubject)

  return {
    subject: {
      title: entry.displayName,
      description: entry.subject.description ?? '',
      icon: entry.subject.iconName ?? FALLBACK_ICON_BY_ID[entry.seedSubjectId ?? entry.subject.id] ?? 'bookopen',
      color: entry.subject.color ?? '#3f68f7',
      imageUrl: entry.subject.imageUrl ?? '',
      order: 0,
      visualMode: entry.subject.imageUrl ? 'manual' : 'preset',
    },
    topics: entry.subject.topics.map((topic, index) => ({
      id: topic.id,
      title: resolveSeedTopicTitle(entry.routeId, topic.id, topic.title ?? '', lang),
      videoId: topic.videoId ?? '',
      videoUrl: topic.videoUrl ?? '',
      order: index,
      questions: topic.questions.map((question) => ({
        id: question.id,
        text: question.text,
        imageUrl: question.imageUrl ?? '',
        options: question.options.length > 0 ? [...question.options] : ['', '', '', ''],
        answer: question.answer,
        concept: question.concept ?? '',
      })),
    })),
  }
}

const readStoredDraft = (storageKey: string): StoredDraftPayload | null => {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as StoredDraftPayload
  } catch {
    return null
  }
}

const writeStoredDraft = (storageKey: string, draft: ContentDraft, sections: SubjectSection[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      savedAt: Date.now(),
      draft,
      sections,
    } satisfies StoredDraftPayload))
  } catch {
    // Ignore storage failures and keep the editor usable.
  }
}

const removeStoredDraft = (storageKey: string) => {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // noop
  }
}

export default function ContentEditorShell({
  subjectRef,
  entry,
  subjects,
  isSuperAdmin,
  onSubjectsChange,
}: ContentEditorShellProps): JSX.Element {
  const { t, lang } = useLang()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const isNewSubject = subjectRef === 'new'

  const storageKey = useMemo(() => getStorageKey(subjectRef), [subjectRef])
  const currentStepSlug = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() ?? 'details'
  const currentStep = STEP_BY_SLUG[currentStepSlug] ?? 1

  const [draft, setDraft] = useState<ContentDraft>(() => emptyContentDraft())
  const [sections, setSections] = useState<SubjectSection[]>([])
  const [editingTopicIndex, setEditingTopicIndex] = useState<number | null>(null)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(0)
  const [quizMode, setQuizMode] = useState<'edit' | 'preview'>('edit')
  const [publishOpen, setPublishOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [redirectSubjectRef, setRedirectSubjectRef] = useState<string | null>(null)

  const canPersistNewSubject = isSuperAdmin
  const liveSubject = entry?.liveSubject ?? null
  const canDeleteSubject = Boolean(isSuperAdmin && liveSubject)
  const canPublish = Boolean(liveSubject) || canPersistNewSubject
  const hasMilliySection = useMemo(
    () => (sections.some((section) => section.type === 'milliy') || entry?.subject.sections?.some((section) => section.type === 'milliy') || false),
    [entry?.subject.sections, sections],
  )

  useEffect(() => {
    if (!isNewSubject && !entry) return

    const stored = readStoredDraft(storageKey)
    const restoredDraft = stored?.draft ? normalizeContentDraft(stored.draft) : null
    const baseDraft = isNewSubject
      ? emptyContentDraft()
      : buildDraftFromEntry(entry as ContentCatalogEntry, lang)
    const baseSections = isNewSubject ? [] : (entry?.subject.sections ?? [])

    setDraft(restoredDraft ?? baseDraft)
    setSections(stored?.sections ?? baseSections)
    setEditingTopicIndex((restoredDraft ?? baseDraft).topics.length > 0 ? 0 : null)
    setEditingQuestionIndex(0)
    setQuizMode('edit')
    setPublishOpen(false)
    setDeleteOpen(false)
    setRedirectSubjectRef(null)
    setHydrated(true)
  }, [entry, isNewSubject, lang, storageKey])

  useEffect(() => {
    if (!hydrated) return
    writeStoredDraft(storageKey, draft, sections)
  }, [draft, hydrated, sections, storageKey])

  useEffect(() => {
    if (editingTopicIndex == null) return
    if (editingTopicIndex < draft.topics.length) return
    setEditingTopicIndex(draft.topics.length > 0 ? draft.topics.length - 1 : null)
  }, [draft.topics.length, editingTopicIndex])

  useEffect(() => {
    if (editingTopicIndex == null) {
      if (editingQuestionIndex !== 0) setEditingQuestionIndex(0)
      return
    }

    const questionCount = draft.topics[editingTopicIndex]?.questions.length ?? 0
    if (questionCount === 0 && editingQuestionIndex !== 0) {
      setEditingQuestionIndex(0)
      return
    }

    if (editingQuestionIndex >= questionCount && questionCount > 0) {
      setEditingQuestionIndex(questionCount - 1)
    }
  }, [draft.topics, editingQuestionIndex, editingTopicIndex])

  const issues = useMemo(() => validateDraftForPublish(draft), [draft])
  const completion = useMemo(() => buildStepCompletion(draft), [draft])

  useEffect(() => {
    if (!hydrated) return
    const maxAccessibleStep = getMaxAccessibleStep(draft)
    if (currentStep <= maxAccessibleStep) return
    navigate(`/admin/content/subjects/${subjectRef}/${STEP_SLUGS[maxAccessibleStep]}`, { replace: true })
  }, [currentStep, draft, hydrated, navigate, subjectRef])

  if (!isNewSubject && !entry && redirectSubjectRef) {
    return <Navigate to={`/admin/content/subjects/${redirectSubjectRef}/details`} replace />
  }

  if (!isNewSubject && !entry) {
    return <Navigate to="/admin/content" replace />
  }

  const goToStep = (step: BuilderStep) => {
    const maxAccessibleStep = getMaxAccessibleStep(draft)
    const nextStep = step > maxAccessibleStep ? maxAccessibleStep : step
    navigate(`/admin/content/subjects/${subjectRef}/${STEP_SLUGS[nextStep]}`)
  }

  const saveDraftNotice = () => {
    writeStoredDraft(storageKey, draft, sections)
    toast.success(t('adminContentDraftSaved'))
  }

  const applyPersistedSubject = (nextSubject: SubjectRecord): string => {
    const nextSubjectRef = getSubjectRouteId(nextSubject)
    setRedirectSubjectRef(nextSubjectRef)
    const nextSubjects = liveSubject
      ? subjects.map((subject) => (subject.id === nextSubject.id ? nextSubject : subject))
      : [...subjects, nextSubject]

    const sortedSubjects = sortSubjectRecords(nextSubjects)
    onSubjectsChange(sortedSubjects)
    syncSubjectListCache(sortedSubjects)
    removeStoredDraft(storageKey)
    return nextSubjectRef
  }

  const buildPersistPayload = () => ({
    ...toSubjectPayload(draft),
    sections,
    ...(!liveSubject && !isNewSubject && isSeedSubjectRouteId(subjectRef)
      ? { catalogKey: subjectRef }
      : {}),
  })

  const persistSubject = async (): Promise<string> => {
    if (!canPublish) {
      throw new Error(t('adminContentCreateRestricted'))
    }

    const payload = buildPersistPayload()
    const nextSubject = liveSubject
      ? await adminService.updateSubject(liveSubject.id, payload)
      : await adminService.createSubject(payload)

    return applyPersistedSubject(nextSubject)
  }

  const handlePublish = async () => {
    const blockingIssues = validateDraftForPublish(draft)
    if (blockingIssues.length > 0) {
      toast.error(t('adminContentFixValidation'))
      goToStep(getFirstInvalidStep(blockingIssues))
      return
    }

    setPublishing(true)
    try {
      const nextSubjectRef = await persistSubject()
      toast.success(t('adminContentPublishedSuccess'))
      setPublishOpen(false)
      navigate(`/admin/content/subjects/${nextSubjectRef}/${STEP_SLUGS[currentStep]}`, { replace: true })
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const handleDeleteSubject = async () => {
    if (!liveSubject) return

    setDeleting(true)
    try {
      await adminService.deleteSubject(liveSubject.id)
      const nextSubjects = sortSubjectRecords(subjects.filter((subject) => subject.id !== liveSubject.id))
      onSubjectsChange(nextSubjects)
      syncSubjectListCache(nextSubjects)
      removeStoredDraft(storageKey)
      toast.success(t('adminSubjectDeleted'))
      setDeleteOpen(false)
      navigate('/admin/content', { replace: true })
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setDeleting(false)
    }
  }

  const headerTitle = isNewSubject
    ? t('adminContentCreateSubjectTitle')
    : entry?.displayName ?? draft.subject.title ?? t('adminContentEditSubjectTitle')

  return (
    <div className={styles.subjectWorkspace}>
      <div className={styles.subjectWorkspaceHeader}>
        <div>
          <h3 className={styles.inventoryTitle}>{headerTitle}</h3>
          <p className={styles.inventorySubtitle}>
            {currentStep === 1
              ? t('adminContentStep1Hint')
              : currentStep === 2
                ? t('adminContentStep2Hint')
                : currentStep === 3
                  ? t('adminContentSelectTopicBeforeQuiz')
                  : t('adminContentStep4Hint')}
          </p>
        </div>

        <div className={styles.inlineActions}>
          <Button variant="ghost" onClick={() => navigate('/admin/content')}>
            <ArrowLeft size={14} aria-hidden="true" />
            {t('adminContentBackToInventory')}
          </Button>

          {currentStep !== 4 ? (
            <Button
              onClick={() => goToStep((Math.min(4, currentStep + 1) as BuilderStep))}
              disabled={currentStep >= getMaxAccessibleStep(draft)}
            >
              {t('continue')}
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      {!canPublish && !liveSubject ? (
        <Alert variant="warning">{t('adminContentCreateRestricted')}</Alert>
      ) : null}

      <ContentStepper step={currentStep} completion={completion} onStepChange={goToStep} />

      {currentStep === 1 ? (
        <SubjectSelectorStep
          isNewSubject={isNewSubject || !liveSubject}
          canDeleteSubject={canDeleteSubject}
          draft={draft}
          sections={sections}
          onDraftChange={setDraft}
          onSectionsChange={setSections}
          onBackToInventory={() => navigate('/admin/content')}
          onRequestDeleteSubject={() => setDeleteOpen(true)}
        />
      ) : null}

      {currentStep === 2 ? (
        <TopicSetupStep
          draft={draft}
          liveSubject={liveSubject}
          editingTopicIndex={editingTopicIndex}
          onDraftChange={setDraft}
          onEditTopicIndex={setEditingTopicIndex}
        />
      ) : null}

      {currentStep === 3 ? (
        <QuizBuilderStep
          draft={draft}
          editingTopicIndex={editingTopicIndex}
          editingQuestionIndex={editingQuestionIndex}
          mode={quizMode}
          onSetMode={setQuizMode}
          onSetEditingQuestionIndex={setEditingQuestionIndex}
          onDraftChange={setDraft}
        />
      ) : null}

      {currentStep === 4 ? (
        <ReviewPublishStep
          draft={draft}
          issues={issues}
          publishing={publishing}
          onSaveDraft={saveDraftNotice}
          onPublish={() => setPublishOpen(true)}
        />
      ) : null}

      {currentStep === 4 && liveSubject && hasMilliySection ? (
        <ManagedExamWorkspace
          subjects={subjects.filter((subject) => subject.id === liveSubject.id)}
          subjectIdFilter={liveSubject.id}
          sectionTypeLock="milliy"
        />
      ) : null}

      <div className={styles.bottomActions}>
        <div className={styles.leftActions}>
          {currentStep > 1 ? (
            <Button variant="ghost" onClick={() => goToStep((currentStep - 1) as BuilderStep)}>
              <ArrowLeft size={14} aria-hidden="true" />
              {t('goBack')}
            </Button>
          ) : null}
        </div>

        <div className={styles.rightActions}>
          <Button variant="ghost" onClick={saveDraftNotice}>
            {t('adminContentSaveDraft')}
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => goToStep((currentStep + 1) as BuilderStep)}
              disabled={currentStep >= getMaxAccessibleStep(draft)}
            >
              {t('continue')}
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => setPublishOpen(true)} disabled={!canPublish || issues.length > 0 || publishing}>
              {publishing ? t('adminContentPublishing') : t('adminContentPublish')}
            </Button>
          )}
        </div>
      </div>

      <PublishConfirmModal
        open={publishOpen}
        title={t('adminContentPublishConfirmTitle')}
        message={t('adminContentPublishConfirmBody')}
        confirmLabel={t('adminContentPublish')}
        busy={publishing}
        busyLabel={t('adminContentPublishing')}
        onCancel={() => setPublishOpen(false)}
        onConfirm={handlePublish}
      />

      <PublishConfirmModal
        open={deleteOpen}
        title={t('adminContentDeleteSubject')}
        message={t('adminContentDeleteConfirmBody')}
        confirmLabel={t('adminContentActionDelete')}
        busy={deleting}
        busyLabel={t('adminProcessing')}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteSubject}
      />
    </div>
  )
}
