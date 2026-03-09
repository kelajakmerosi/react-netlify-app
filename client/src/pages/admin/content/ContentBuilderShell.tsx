import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCcw, Save } from 'lucide-react'
import { Alert } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import { ApiError } from '../../../services/api'
import { adminService, type SubjectRecord } from '../../../services/admin.service'
import ExamImportReviewPanel from '../components/ExamImportReviewPanel'
import ContentOverviewPanel from './ContentOverviewPanel'
import ContentStepper from './ContentStepper'
import ManagedExamWorkspace from './ManagedExamWorkspace'
import PublishConfirmModal from './PublishConfirmModal'
import QuizBuilderStep from './QuizBuilderStep'
import ReviewPublishStep from './ReviewPublishStep'
import SubjectInventorySection from './SubjectInventorySection'
import SubjectSelectorStep from './SubjectSelectorStep'
import TopicSetupStep from './TopicSetupStep'
import {
  buildStepCompletion,
  getFirstInvalidStep,
  normalizeTopicOrders,
  validateDraftForPublish,
} from './contentUtils'
import {
  NEW_SUBJECT_ID,
  emptyContentDraft,
  toContentDraft,
  toSubjectPayload,
  type BuilderStep,
  type ContentDraft,
  type ContentSubtab,
  type StoredDraftPayload,
} from './types'
import styles from './ContentBuilder.module.css'

interface ContentBuilderShellProps {
  subjects: SubjectRecord[]
  currentUserId?: string | null
  canManagePricing: boolean
  pricingRows: Array<{
    subjectId: string
    subjectTitle: string
    priceUzs: number
    isActive: boolean
  }>
  savingCourseId: string | null
  bootstrappingDemo: boolean
  onBootstrapDemo: (subjectId?: string) => Promise<string | void>
  onCoursePricingChange: (subjectId: string, patch: { priceUzs?: number; isActive?: boolean }) => void
  onSaveCoursePrice: (subjectId: string) => Promise<string | void>
  onSubjectsChange: (subjects: SubjectRecord[]) => void
}

type PanelNotice = { type: 'error' | 'success'; message: string } | null

const sortSubjects = (items: SubjectRecord[]) => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)
  || a.title.localeCompare(b.title))

const resolveStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  const storage = window.localStorage
  if (!storage) return null
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return null
  }
  return storage
}

const formatValidationError = (error: unknown, fallbackValidationMessage: string, invalidUrlMessage: string): string | null => {
  const extractFromPlainError = (value: unknown): string | null => {
    if (!(value instanceof Error)) return null
    const message = value.message || ''
    if (/invalid url/i.test(message) || /topics?:\s*invalid url/i.test(message)) return invalidUrlMessage
    if (/validation failed/i.test(message)) return fallbackValidationMessage
    return message || null
  }

  if (!(error instanceof ApiError)) {
    return extractFromPlainError(error)
  }

  const details = error.details as {
    formErrors?: string[]
    fieldErrors?: Record<string, string[]>
    issues?: Array<{ path?: Array<string | number>; message?: string }>
  } | undefined

  const isValidation = error.code === 'VALIDATION_ERROR' || error.status === 400
  const mentionsInvalidUrl = (value: string) => /invalid url/i.test(value)
  const isUrlField = (value: string) => /url|imageurl|videourl/i.test(value)
  const normalizePath = (path?: Array<string | number>) => (path ?? []).join('.')

  const firstIssue = details?.issues?.find((issue) => typeof issue?.message === 'string' && issue.message.length > 0)
  if (firstIssue?.message) {
    const issuePath = normalizePath(firstIssue.path)
    if (mentionsInvalidUrl(firstIssue.message) || isUrlField(issuePath)) return invalidUrlMessage
    return issuePath ? `${issuePath}: ${firstIssue.message}` : firstIssue.message
  }

  const formError = details?.formErrors?.find(Boolean)
  if (formError) return mentionsInvalidUrl(formError) ? invalidUrlMessage : formError

  const fieldErrors = details?.fieldErrors ? Object.entries(details.fieldErrors) : []
  const firstField = fieldErrors.find(([, messages]) => Array.isArray(messages) && messages.length > 0)
  if (firstField) {
    const [field, messages] = firstField
    const firstMessage = messages[0]
    if (mentionsInvalidUrl(firstMessage) || isUrlField(field)) return invalidUrlMessage
    return `${field}: ${firstMessage}`
  }

  if (mentionsInvalidUrl(error.message || '')) return invalidUrlMessage
  if (isValidation && isUrlField(error.message || '')) return invalidUrlMessage
  if (isValidation) return fallbackValidationMessage

  return error.message || extractFromPlainError(error)
}

export default function ContentBuilderShell({
  subjects,
  currentUserId,
  canManagePricing,
  pricingRows,
  savingCourseId,
  bootstrappingDemo,
  onBootstrapDemo,
  onCoursePricingChange,
  onSaveCoursePrice,
  onSubjectsChange,
}: ContentBuilderShellProps): JSX.Element {
  const { t } = useLang()

  const [activeSubtab, setActiveSubtab] = useState<ContentSubtab>('overview')
  const [panelNotice, setPanelNotice] = useState<PanelNotice>(null)
  const [step, setStep] = useState<BuilderStep>(1)
  const [requestedStep, setRequestedStep] = useState<BuilderStep | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ContentDraft>(emptyContentDraft())
  const [editingTopicIndex, setEditingTopicIndex] = useState<number | null>(null)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(0)
  const [quizMode, setQuizMode] = useState<'edit' | 'preview'>('edit')
  const [publishing, setPublishing] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [pendingRecovery, setPendingRecovery] = useState<StoredDraftPayload | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const autosaveReadyRef = useRef(false)

  const liveSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  )

  const isNewSubject = selectedSubjectId === NEW_SUBJECT_ID
  const hasSubjectWorkspace = selectedSubjectId != null
  const completion = useMemo(() => buildStepCompletion(draft), [draft])
  const issues = useMemo(() => validateDraftForPublish(draft), [draft])

  const storageKey = useMemo(() => {
    if (!selectedSubjectId) return ''
    return `admin-content-draft:${currentUserId ?? 'anon'}:${selectedSubjectId}`
  }, [currentUserId, selectedSubjectId])

  useEffect(() => {
    setPanelNotice(null)
  }, [activeSubtab])

  useEffect(() => {
    if (!selectedSubjectId || selectedSubjectId === NEW_SUBJECT_ID) return
    const exists = subjects.some((subject) => subject.id === selectedSubjectId)
    if (!exists) {
      setSelectedSubjectId(null)
    }
  }, [selectedSubjectId, subjects])

  useEffect(() => {
    autosaveReadyRef.current = false

    if (!selectedSubjectId) {
      setDraft(emptyContentDraft())
      setStep(1)
      setEditingQuestionIndex(0)
      setQuizMode('edit')
      setEditingTopicIndex(null)
      setRequestedStep(null)
      setPendingRecovery(null)
      return
    }

    if (!isNewSubject && !liveSubject) return

    const nextDraft = isNewSubject ? emptyContentDraft() : toContentDraft(liveSubject)
    setDraft(nextDraft)
    setStep(requestedStep ?? 1)
    setEditingQuestionIndex(0)
    setQuizMode('edit')
    setEditingTopicIndex(nextDraft.topics.length > 0 ? 0 : null)
    setRequestedStep(null)

    if (!storageKey) {
      setPendingRecovery(null)
      return
    }

    const storage = resolveStorage()
    const raw = storage?.getItem(storageKey)
    if (!raw) {
      setPendingRecovery(null)
      return
    }

    try {
      const parsed = JSON.parse(raw) as StoredDraftPayload
      if (!parsed?.draft || typeof parsed.savedAt !== 'number') {
        setPendingRecovery(null)
        return
      }
      setPendingRecovery(parsed)
    } catch {
      setPendingRecovery(null)
    }
  }, [isNewSubject, liveSubject, requestedStep, selectedSubjectId, storageKey])

  useEffect(() => {
    if (!storageKey || pendingRecovery || !selectedSubjectId) return

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true
      return
    }

    const timer = window.setTimeout(() => {
      const storage = resolveStorage()
      if (!storage) return
      const payload: StoredDraftPayload = { savedAt: Date.now(), draft }
      storage.setItem(storageKey, JSON.stringify(payload))
      setLastSavedAt(payload.savedAt)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [draft, pendingRecovery, selectedSubjectId, storageKey])

  const setPanelMessage = (type: NonNullable<PanelNotice>['type'], message: string) => {
    setPanelNotice({ type, message })
  }

  const openSubjectWorkspace = (subjectId: string, targetStep = 1 as BuilderStep) => {
    setActiveSubtab('subjects')
    setPanelNotice(null)
    if (subjectId === selectedSubjectId) {
      setStep(targetStep)
      return
    }
    setRequestedStep(targetStep)
    setSelectedSubjectId(subjectId)
  }

  const createSubject = () => {
    setActiveSubtab('subjects')
    setPanelNotice(null)
    setRequestedStep(1)
    setSelectedSubjectId(NEW_SUBJECT_ID)
    setDraft(emptyContentDraft())
    setEditingTopicIndex(null)
    setEditingQuestionIndex(0)
    setPendingRecovery(null)
  }

  const closeSubjectWorkspace = () => {
    setPanelNotice(null)
    setSelectedSubjectId(null)
    setRequestedStep(null)
    setPublishModalOpen(false)
    setDeleteModalOpen(false)
  }

  const saveDraftNow = () => {
    const storage = resolveStorage()
    if (!storageKey || !storage) return
    const payload: StoredDraftPayload = { savedAt: Date.now(), draft }
    storage.setItem(storageKey, JSON.stringify(payload))
    setLastSavedAt(payload.savedAt)
    setPanelMessage('success', t('adminContentDraftSaved'))
  }

  const restorePendingDraft = () => {
    if (!pendingRecovery) return
    setDraft(pendingRecovery.draft)
    setEditingTopicIndex(pendingRecovery.draft.topics.length > 0 ? 0 : null)
    setEditingQuestionIndex(0)
    setPendingRecovery(null)
    setLastSavedAt(pendingRecovery.savedAt)
    setPanelMessage('success', t('adminContentDraftRestored'))
  }

  const discardPendingDraft = () => {
    const storage = resolveStorage()
    if (storageKey && storage) storage.removeItem(storageKey)
    setPendingRecovery(null)
    setPanelMessage('success', t('adminContentDraftDiscarded'))
  }

  const goNext = () => {
    if (step === 1 && !completion.step1) return
    if (step === 2 && !completion.step2) return
    if (step === 3 && !completion.step3) return
    setStep((current) => Math.min(4, current + 1) as BuilderStep)
  }

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1) as BuilderStep)
  }

  const getFirstIssueMessage = () => {
    if (issues.length === 0) return t('adminContentFixValidation')
    return t(issues[0].message)
  }

  const askPublish = () => {
    if (issues.length > 0) {
      const invalidStep = getFirstInvalidStep(issues)
      setStep(invalidStep)
      setPanelMessage('error', getFirstIssueMessage())
      return
    }
    setPublishModalOpen(true)
  }

  const publish = async () => {
    if (issues.length > 0) {
      setPublishModalOpen(false)
      setPanelMessage('error', getFirstIssueMessage())
      return
    }

    setPublishing(true)
    try {
      const payload = toSubjectPayload(draft)

      const updated = isNewSubject || !liveSubject
        ? await adminService.createSubject(payload)
        : await adminService.updateSubject(liveSubject.id, payload)

      const exists = subjects.some((subject) => subject.id === updated.id)
      const nextSubjects = exists
        ? subjects.map((subject) => (subject.id === updated.id ? updated : subject))
        : [...subjects, updated]

      onSubjectsChange(sortSubjects(nextSubjects))
      setSelectedSubjectId(updated.id)
      setDraft(toContentDraft(updated))
      setEditingTopicIndex(updated.topics && updated.topics.length > 0 ? 0 : null)
      setEditingQuestionIndex(0)

      const storage = resolveStorage()
      if (storageKey && storage) {
        storage.removeItem(storageKey)
      }
      storage?.removeItem(`admin-content-draft:${currentUserId ?? 'anon'}:${updated.id}`)

      setPendingRecovery(null)
      setPublishModalOpen(false)
      setStep(1)
      setPanelMessage('success', t('adminContentPublishedSuccess'))
    } catch (error) {
      setPublishModalOpen(false)
      setPanelMessage(
        'error',
        formatValidationError(error, t('adminContentFixValidation'), t('adminContentIssueInvalidUrl'))
        ?? (error instanceof Error ? error.message : t('adminActionFailed')),
      )
    } finally {
      setPublishing(false)
    }
  }

  const handleToggleVisibility = async (subjectId: string, isHidden: boolean) => {
    try {
      const updated = await adminService.toggleSubjectVisibility(subjectId, isHidden)
      const nextSubjects = subjects.map((s) => (s.id === updated.id ? updated : s))
      onSubjectsChange(sortSubjects(nextSubjects))
      setPanelMessage('success', isHidden ? t('adminContentSubjectHidden') || 'Subject hidden' : t('adminContentSubjectVisible') || 'Subject visible')
    } catch (error) {
      setPanelMessage('error', error instanceof Error ? error.message : t('adminActionFailed'))
    }
  }

  const deleteSubjectListRow = async (subjectId: string) => {
    try {
      await adminService.deleteSubject(subjectId)
      const nextSubjects = subjects.filter((subject) => subject.id !== subjectId)
      onSubjectsChange(sortSubjects(nextSubjects))
      if (selectedSubjectId === subjectId) {
        setDraft(emptyContentDraft())
        setSelectedSubjectId(null)
      }
      setPanelMessage('success', t('adminSubjectDeleted'))
    } catch (error) {
      setPanelMessage('error', error instanceof Error ? error.message : t('adminActionFailed'))
    }
  }

  const deleteCurrentSubject = async () => {
    if (isNewSubject || !liveSubject) {
      setDraft(emptyContentDraft())
      setSelectedSubjectId(null)
      setDeleteModalOpen(false)
      return
    }

    try {
      await adminService.deleteSubject(liveSubject.id)
      const nextSubjects = subjects.filter((subject) => subject.id !== liveSubject.id)
      onSubjectsChange(sortSubjects(nextSubjects))
      setSelectedSubjectId(null)
      setDeleteModalOpen(false)
      setPanelMessage('success', t('adminSubjectDeleted'))
    } catch (error) {
      setPanelMessage('error', error instanceof Error ? error.message : t('adminActionFailed'))
    }
  }

  const setStepSafe = (nextStep: BuilderStep) => {
    if (nextStep === 1) {
      setStep(1)
      return
    }
    if (nextStep === 2 && completion.step1) {
      setStep(2)
      return
    }
    if (nextStep === 3 && completion.step1 && completion.step2) {
      setStep(3)
      return
    }
    if (nextStep === 4 && completion.step1 && completion.step2 && completion.step3) {
      setStep(4)
    }
  }

  const subtabs: Array<{ id: ContentSubtab; label: string }> = [
    { id: 'overview', label: t('adminContentSubtabOverview') },
    { id: 'subjects', label: t('adminContentSubtabSubjects') },
    { id: 'exams', label: t('adminContentSubtabExams') },
    { id: 'imports', label: t('adminContentSubtabImports') },
  ]

  return (
    <div className={styles.builderShell}>
      <div className={styles.contentSubtabs} role="tablist" aria-label={t('adminContentSubtabAria')}>
        {subtabs.map((subtab) => (
          <button
            key={subtab.id}
            type="button"
            role="tab"
            aria-selected={activeSubtab === subtab.id}
            className={`${styles.contentSubtab} ${activeSubtab === subtab.id ? styles.contentSubtabActive : ''}`}
            onClick={() => setActiveSubtab(subtab.id)}
          >
            {subtab.label}
          </button>
        ))}
      </div>

      {activeSubtab === 'overview' ? (
        <ContentOverviewPanel
          subjects={subjects}
          canManagePricing={canManagePricing}
          pricingRows={pricingRows}
          savingCourseId={savingCourseId}
          bootstrappingDemo={bootstrappingDemo}
          onBootstrapDemo={onBootstrapDemo}
          onPricingChange={onCoursePricingChange}
          onSavePricing={onSaveCoursePrice}
          onOpenSubjectCreator={createSubject}
          onOpenSubtab={setActiveSubtab}
        />
      ) : null}

      {activeSubtab === 'subjects' ? (
        <section className={styles.contentPane}>
          {!hasSubjectWorkspace ? (
            <SubjectInventorySection
              subjects={subjects}
              selectedSubjectId={selectedSubjectId}
              onCreateSubject={createSubject}
              onOpenSubject={openSubjectWorkspace}
              onToggleVisibility={handleToggleVisibility}
              onDeleteSubject={deleteSubjectListRow}
            />
          ) : null}

          {panelNotice ? (
            <Alert variant={panelNotice.type === 'error' ? 'warning' : 'success'}>
              {panelNotice.message}
            </Alert>
          ) : null}

          {hasSubjectWorkspace ? (
            <section className={styles.subjectWorkspace}>
              <div className={styles.subjectWorkspaceHeader}>
                <div>
                  <h3 className={styles.inventoryTitle}>
                    {draft.subject.title.trim() || (isNewSubject ? t('adminContentCreateSubjectTitle') : t('adminContentEditSubjectTitle'))}
                  </h3>
                  <p className={styles.inventorySubtitle}>
                    {isNewSubject ? t('adminContentCreateSubjectCardSubtitle') : t('adminContentSectionSubjectsSubtitle')}
                  </p>
                </div>

                <Button variant="ghost" size="sm" onClick={closeSubjectWorkspace}>
                  <ArrowLeft size={14} aria-hidden="true" />
                  {t('adminContentBackToInventory')}
                </Button>
              </div>

              {pendingRecovery ? (
                <Alert variant="info">
                  <span className={styles.recoveryAlertLine}>
                    <AlertCircle size={14} aria-hidden="true" />
                    {t('adminContentDraftRecoveryPrompt')}
                  </span>
                  <span className={styles.recoveryAlertActions}>
                    <Button variant="ghost" size="sm" onClick={restorePendingDraft}>
                      <RefreshCcw size={14} aria-hidden="true" />
                      {t('adminContentRestoreDraft')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={discardPendingDraft}>
                      {t('adminContentDiscardDraft')}
                    </Button>
                  </span>
                </Alert>
              ) : null}

              <ContentStepper step={step} completion={completion} onStepChange={setStepSafe} />

              {step === 1 ? (
                <SubjectSelectorStep
                  isNewSubject={isNewSubject}
                  draft={draft}
                  onDraftChange={setDraft}
                  onBackToInventory={closeSubjectWorkspace}
                  onRequestDeleteSubject={() => setDeleteModalOpen(true)}
                />
              ) : null}

              {step === 2 ? (
                <TopicSetupStep
                  draft={draft}
                  liveSubject={liveSubject}
                  editingTopicIndex={editingTopicIndex}
                  onDraftChange={(nextDraft) => {
                    setDraft({
                      ...nextDraft,
                      topics: normalizeTopicOrders(nextDraft.topics),
                    })
                  }}
                  onEditTopicIndex={setEditingTopicIndex}
                />
              ) : null}

              {step === 3 ? (
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

              {step === 4 ? (
                <ReviewPublishStep
                  draft={draft}
                  issues={issues}
                  publishing={publishing}
                  onSaveDraft={saveDraftNow}
                  onPublish={askPublish}
                />
              ) : null}

              <div className={styles.bottomActions}>
                <div className={styles.leftActions}>
                  <Button variant="ghost" onClick={saveDraftNow}>
                    <Save size={14} aria-hidden="true" />
                    {t('adminContentSaveDraft')}
                  </Button>
                  {lastSavedAt ? (
                    <span className={styles.lastSavedAt}>
                      {t('adminContentDraftSavedAt')}: {new Date(lastSavedAt).toLocaleTimeString()}
                    </span>
                  ) : null}
                </div>

                <div className={styles.rightActions}>
                  <Button variant="ghost" onClick={goBack} disabled={step === 1}>
                    <ArrowLeft size={14} aria-hidden="true" />
                    {t('adminContentBack')}
                  </Button>

                  <Button
                    onClick={step < 4 ? goNext : askPublish}
                    disabled={(step === 1 && !completion.step1) || (step === 2 && !completion.step2) || (step === 3 && !completion.step3) || publishing}
                  >
                    {step < 4 ? t('adminContentNext') : t('adminContentPublish')}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          <PublishConfirmModal
            open={publishModalOpen}
            title={t('adminContentPublishConfirmTitle')}
            message={t('adminContentPublishConfirmBody')}
            confirmLabel={t('adminContentPublish')}
            busy={publishing}
            busyLabel={t('adminContentPublishing')}
            onCancel={() => setPublishModalOpen(false)}
            onConfirm={() => void publish()}
          />

          <PublishConfirmModal
            open={deleteModalOpen}
            title={t('adminContentDeleteConfirmTitle')}
            message={t('adminContentDeleteConfirmBody')}
            confirmLabel={t('adminContentDeleteSubject')}
            onCancel={() => setDeleteModalOpen(false)}
            onConfirm={() => void deleteCurrentSubject()}
          />
        </section>
      ) : null}

      {activeSubtab === 'exams' ? (
        <ManagedExamWorkspace
          subjects={subjects}
        />
      ) : null}

      {activeSubtab === 'imports' ? (
        <ExamImportReviewPanel subjects={subjects.map((subject) => ({ id: subject.id, title: subject.title }))} />
      ) : null}
    </div>
  )
}
