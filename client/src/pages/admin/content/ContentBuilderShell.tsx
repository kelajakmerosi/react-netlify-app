import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCcw, Save, Send, Sparkles } from 'lucide-react'
import { Alert } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import { ApiError } from '../../../services/api'
import { adminService, type SubjectRecord } from '../../../services/admin.service'
import ContentStepper from './ContentStepper'
import SubjectSelectorStep from './SubjectSelectorStep'
import TopicSetupStep from './TopicSetupStep'
import QuizBuilderStep from './QuizBuilderStep'
import ReviewPublishStep from './ReviewPublishStep'
import PublishConfirmModal from './PublishConfirmModal'
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
  type StoredDraftPayload,
} from './types'
import styles from './ContentBuilder.module.css'

interface ContentBuilderShellProps {
  subjects: SubjectRecord[]
  currentUserId?: string | null
  onSubjectsChange: (subjects: SubjectRecord[]) => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const sortSubjects = (items: SubjectRecord[]) => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)
  || a.title.localeCompare(b.title))

const formatValidationError = (error: unknown): string | null => {
  if (!(error instanceof ApiError)) return null
  if (error.code !== 'VALIDATION_ERROR') return null

  const details = error.details as {
    formErrors?: string[]
    fieldErrors?: Record<string, string[]>
  } | undefined

  const formError = details?.formErrors?.find(Boolean)
  if (formError) return formError

  const fieldErrors = details?.fieldErrors ? Object.entries(details.fieldErrors) : []
  const firstField = fieldErrors.find(([, messages]) => Array.isArray(messages) && messages.length > 0)
  if (firstField) {
    const [field, messages] = firstField
    return `${field}: ${messages[0]}`
  }

  return error.message || null
}

export default function ContentBuilderShell({
  subjects,
  currentUserId,
  onSubjectsChange,
  onSuccess,
  onError,
}: ContentBuilderShellProps): JSX.Element {
  const { t } = useLang()

  const [step, setStep] = useState<BuilderStep>(1)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id ?? NEW_SUBJECT_ID)
  const [draft, setDraft] = useState<ContentDraft>(toContentDraft(subjects[0] ?? null))
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

  const isNewSubject = selectedSubjectId === NEW_SUBJECT_ID || !liveSubject
  const completion = useMemo(() => buildStepCompletion(draft), [draft])
  const issues = useMemo(() => validateDraftForPublish(draft), [draft])

  const storageKey = useMemo(() => {
    if (!selectedSubjectId) return ''
    return `admin-content-draft:${currentUserId ?? 'anon'}:${selectedSubjectId}`
  }, [currentUserId, selectedSubjectId])

  useEffect(() => {
    if (!selectedSubjectId) {
      setSelectedSubjectId(subjects[0]?.id ?? NEW_SUBJECT_ID)
      return
    }

    const exists = selectedSubjectId === NEW_SUBJECT_ID || subjects.some((subject) => subject.id === selectedSubjectId)
    if (!exists) {
      setSelectedSubjectId(subjects[0]?.id ?? NEW_SUBJECT_ID)
    }
  }, [selectedSubjectId, subjects])

  useEffect(() => {
    autosaveReadyRef.current = false
    const nextDraft = isNewSubject ? emptyContentDraft() : toContentDraft(liveSubject)
    setDraft(nextDraft)
    setStep(1)
    setEditingQuestionIndex(0)
    setQuizMode('edit')
    setEditingTopicIndex(nextDraft.topics.length > 0 ? 0 : null)

    if (!storageKey) {
      setPendingRecovery(null)
      return
    }

    const raw = window.localStorage.getItem(storageKey)
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
  }, [isNewSubject, liveSubject, storageKey])

  useEffect(() => {
    if (!storageKey) return
    if (pendingRecovery) return

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true
      return
    }

    const timer = window.setTimeout(() => {
      const payload: StoredDraftPayload = { savedAt: Date.now(), draft }
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
      setLastSavedAt(payload.savedAt)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [draft, pendingRecovery, storageKey])

  const selectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
  }

  const createSubject = () => {
    setSelectedSubjectId(NEW_SUBJECT_ID)
    setDraft(emptyContentDraft())
    setEditingTopicIndex(null)
    setEditingQuestionIndex(0)
  }

  const saveDraftNow = () => {
    if (!storageKey) return
    const payload: StoredDraftPayload = { savedAt: Date.now(), draft }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
    setLastSavedAt(payload.savedAt)
    onSuccess(t('adminContentDraftSaved'))
  }

  const restorePendingDraft = () => {
    if (!pendingRecovery) return
    setDraft(pendingRecovery.draft)
    setEditingTopicIndex(pendingRecovery.draft.topics.length > 0 ? 0 : null)
    setEditingQuestionIndex(0)
    setPendingRecovery(null)
    setLastSavedAt(pendingRecovery.savedAt)
    onSuccess(t('adminContentDraftRestored'))
  }

  const discardPendingDraft = () => {
    if (storageKey) {
      window.localStorage.removeItem(storageKey)
    }
    setPendingRecovery(null)
    onSuccess(t('adminContentDraftDiscarded'))
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

  const askPublish = () => {
    if (issues.length > 0) {
      const invalidStep = getFirstInvalidStep(issues)
      setStep(invalidStep)
      onError(t('adminContentFixValidation'))
      return
    }
    setPublishModalOpen(true)
  }

  const publish = async () => {
    if (issues.length > 0) {
      setPublishModalOpen(false)
      onError(t('adminContentFixValidation'))
      return
    }

    setPublishing(true)
    try {
      const payload = toSubjectPayload(draft)

      let updated: SubjectRecord
      if (isNewSubject || !liveSubject) {
        updated = await adminService.createSubject(payload)
      } else {
        updated = await adminService.updateSubject(liveSubject.id, payload)
      }

      const exists = subjects.some((subject) => subject.id === updated.id)
      const nextSubjects = exists
        ? subjects.map((subject) => (subject.id === updated.id ? updated : subject))
        : [...subjects, updated]

      onSubjectsChange(sortSubjects(nextSubjects))
      setSelectedSubjectId(updated.id)
      setDraft(toContentDraft(updated))
      setEditingTopicIndex(updated.topics && updated.topics.length > 0 ? 0 : null)
      setEditingQuestionIndex(0)

      if (storageKey) {
        window.localStorage.removeItem(storageKey)
      }
      const newKey = `admin-content-draft:${currentUserId ?? 'anon'}:${updated.id}`
      window.localStorage.removeItem(newKey)

      setPendingRecovery(null)
      setPublishModalOpen(false)
      setStep(1)
      onSuccess(t('adminContentPublishedSuccess'))
    } catch (error) {
      setPublishModalOpen(false)
      onError(formatValidationError(error) ?? (error instanceof Error ? error.message : t('adminActionFailed')))
    } finally {
      setPublishing(false)
    }
  }

  const deleteCurrentSubject = async () => {
    if (isNewSubject || !liveSubject) {
      setDraft(emptyContentDraft())
      setSelectedSubjectId(NEW_SUBJECT_ID)
      setDeleteModalOpen(false)
      return
    }

    try {
      await adminService.deleteSubject(liveSubject.id)
      const nextSubjects = subjects.filter((subject) => subject.id !== liveSubject.id)
      onSubjectsChange(nextSubjects)
      setSelectedSubjectId(nextSubjects[0]?.id ?? NEW_SUBJECT_ID)
      setDeleteModalOpen(false)
      onSuccess(t('adminSubjectDeleted'))
    } catch (error) {
      onError(error instanceof Error ? error.message : t('adminActionFailed'))
    }
  }

  const setStepSafe = (nextStep: BuilderStep) => {
    if (nextStep === 1) return setStep(1)
    if (nextStep === 2 && completion.step1) return setStep(2)
    if (nextStep === 3 && completion.step1 && completion.step2) return setStep(3)
    if (nextStep === 4 && completion.step1 && completion.step2 && completion.step3) return setStep(4)
  }

  return (
    <div className={styles.builderShell}>
      <ContentStepper step={step} completion={completion} onStepChange={setStepSafe} />

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
            <Button variant="ghost" size="sm" onClick={discardPendingDraft}>{t('adminContentDiscardDraft')}</Button>
          </span>
        </Alert>
      ) : null}

      {step === 1 ? (
        <SubjectSelectorStep
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          isNewSubject={isNewSubject}
          draft={draft}
          onSelectSubject={selectSubject}
          onCreateSubject={createSubject}
          onDraftChange={setDraft}
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

          {step < 4 ? (
            <Button
              onClick={goNext}
              disabled={(step === 1 && !completion.step1) || (step === 2 && !completion.step2) || (step === 3 && !completion.step3)}
            >
              {t('adminContentNext')}
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={askPublish} disabled={issues.length > 0 || publishing}>
              <Send size={14} aria-hidden="true" />
              {publishing ? t('adminContentPublishing') : t('adminContentPublish')}
            </Button>
          )}
        </div>
      </div>

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

      <div className={styles.sparklineDecoration}>
        <Sparkles size={16} aria-hidden="true" />
      </div>
    </div>
  )
}
