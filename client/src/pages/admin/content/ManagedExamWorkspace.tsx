import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  EyeOff,
  FileQuestion,
  PlusCircle,
  RefreshCcw,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import { Alert, Textarea } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { useLang } from '../../../hooks'
import { useToast } from '../../../app/providers/ToastProvider'
import type { SubjectRecord } from '../../../services/admin.service'
import examService, {
  type ExamValidation,
  type TeacherExamQuestion,
  type TeacherExamSummary,
} from '../../../services/exam.service'
import { resolveUiErrorMessage } from '../../../utils/errorPresentation'
import { getSubjectVisual } from '../../../utils/subjectVisuals'
import styles from './ContentBuilder.module.css'

type ExamStatus = 'draft' | 'pending_review' | 'published' | 'archived'
type ExamDifficulty = '' | 'easy' | 'medium' | 'hard'

interface ExamSectionDraft {
  id: string
  blockOrder: number
  title: string
}

interface ExamQuestionDraft {
  localId: string
  id?: string
  questionOrder: number
  promptText: string
  imageUrl: string
  options: string[]
  correctIndex: number
  keyVerified: boolean
  explanation: string
  difficulty: ExamDifficulty
  sourceRef: string
  blockOrder: number | ''
  blockTitle: string
}

interface ExamEditorDraft {
  id?: string
  subjectId: string
  title: string
  description: string
  requiredQuestionCount: 35 | 50
  priceUzs: number
  isActive: boolean
  status: ExamStatus
  sections: ExamSectionDraft[]
  questions: ExamQuestionDraft[]
}

interface ManagedExamWorkspaceProps {
  subjects: SubjectRecord[]
}

const NEW_EXAM_ID = '__content_builder_new_exam__'

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const sortExams = (items: TeacherExamSummary[]) => [...items].sort((a, b) => {
  const left = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
  const right = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
  return right - left
})

const normalizeExamStatus = (status?: string): ExamStatus => {
  if (status === 'pending_review' || status === 'published' || status === 'archived') return status
  return 'draft'
}

const createEmptyQuestion = (): ExamQuestionDraft => ({
  localId: createLocalId(),
  promptText: '',
  questionOrder: 1,
  imageUrl: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  keyVerified: false,
  explanation: '',
  difficulty: '',
  sourceRef: '',
  blockOrder: '',
  blockTitle: '',
})

const createEmptyExamDraft = (subjectId = ''): ExamEditorDraft => ({
  subjectId,
  title: '',
  description: '',
  requiredQuestionCount: 35,
  priceUzs: 0,
  isActive: true,
  status: 'draft',
  sections: [],
  questions: [],
})

const buildSectionsFromQuestions = (questions: TeacherExamQuestion[]): ExamSectionDraft[] => {
  const byOrder = new Map<number, string>()
  questions.forEach((question) => {
    if (question.blockOrder == null) return
    const title = question.blockTitle?.trim() || `Section ${question.blockOrder}`
    byOrder.set(question.blockOrder, title)
  })

  return [...byOrder.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([blockOrder, title]) => ({
      id: `section-${blockOrder}`,
      blockOrder,
      title,
    }))
}

const toExamDraft = (
  summary: TeacherExamSummary,
  questions: TeacherExamQuestion[],
): ExamEditorDraft => ({
  id: summary.id,
  subjectId: summary.subjectId,
  title: summary.title,
  description: summary.description ?? '',
  requiredQuestionCount: summary.requiredQuestionCount === 50 ? 50 : 35,
  priceUzs: Number(summary.priceUzs ?? 0),
  isActive: Boolean(summary.isActive),
  status: normalizeExamStatus(summary.status),
  sections: buildSectionsFromQuestions(questions),
  questions: questions
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((question, index) => ({
      localId: createLocalId(),
      id: question.id,
      questionOrder: index + 1,
      promptText: question.promptText ?? '',
      imageUrl: question.imageUrl ?? '',
      options: (question.options ?? []).length > 0 ? [...question.options] : ['', '', '', ''],
      correctIndex: Number(question.correctIndex ?? 0),
      keyVerified: Boolean(question.keyVerified),
      explanation: question.explanation ?? '',
      difficulty: question.difficulty === 'easy' || question.difficulty === 'medium' || question.difficulty === 'hard'
        ? question.difficulty
        : '',
      sourceRef: question.sourceRef ?? '',
      blockOrder: question.blockOrder ?? '',
      blockTitle: question.blockTitle ?? '',
    })),
})

const getStatusClassName = (status: ExamStatus) => {
  if (status === 'pending_review') return styles.statusReview
  if (status === 'published') return styles.statusPublished
  if (status === 'archived') return styles.statusArchived
  return styles.statusDraft
}

const clampCorrectIndex = (correctIndex: number, options: string[]) => {
  if (options.length === 0) return 0
  if (correctIndex < 0) return 0
  if (correctIndex >= options.length) return options.length - 1
  return correctIndex
}

const isQuestionValid = (question: ExamQuestionDraft) => {
  const options = question.options.map((option) => option.trim()).filter(Boolean)
  return Boolean(question.promptText.trim()) && options.length >= 2 && question.correctIndex >= 0 && question.correctIndex < options.length
}

const buildDraftIssues = (draft: ExamEditorDraft | null, t: (key: string) => string): string[] => {
  if (!draft) return []

  const issues: string[] = []
  if (!draft.subjectId) issues.push(t('adminExamIssueSubject'))
  if (!draft.title.trim()) issues.push(t('adminExamIssueTitle'))
  if (draft.questions.length === 0) issues.push(t('adminExamIssueQuestion'))
  if (draft.questions.some((question) => !isQuestionValid(question))) issues.push(t('adminExamIssueInvalidQuestion'))
  return issues
}

export default function ManagedExamWorkspace({
  subjects,
}: ManagedExamWorkspaceProps): JSX.Element {
  const { t } = useLang()
  const toast = useToast()
  const [exams, setExams] = useState<TeacherExamSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [savingExam, setSavingExam] = useState(false)
  const [submittingExam, setSubmittingExam] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ExamEditorDraft | null>(null)
  const [validation, setValidation] = useState<ExamValidation | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  const subjectTitleById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.title])),
    [subjects],
  )

  const activeQuestion = useMemo(() => (
    draft?.questions.find((question) => question.localId === selectedQuestionId) ?? null
  ), [draft?.questions, selectedQuestionId])

  const activeQuestionIndex = useMemo(() => (
    draft?.questions.findIndex((question) => question.localId === selectedQuestionId) ?? -1
  ), [draft?.questions, selectedQuestionId])

  const examStats = useMemo(() => ({
    total: exams.length,
    published: exams.filter((exam) => exam.status === 'published').length,
    pending: exams.filter((exam) => exam.status === 'pending_review').length,
  }), [exams])

  const editable = draft?.status !== 'published'
  const draftIssues = useMemo(() => buildDraftIssues(draft, t), [draft, t])
  const validationSummary = validation
    ? `${validation.verifiedQuestions}/${validation.requiredQuestionCount}`
    : '0/0'

  const checklistItems = useMemo(() => [
    { label: t('adminExamIssueSubject'), valid: Boolean(draft?.subjectId) },
    { label: t('adminExamIssueTitle'), valid: Boolean(draft?.title.trim()) },
    { label: t('adminExamIssueQuestion'), valid: Boolean(draft && draft.questions.length > 0) },
    { label: t('adminExamIssueInvalidQuestion'), valid: Boolean(draft && draft.questions.length > 0 && draft.questions.every(isQuestionValid)) },
    { label: t('adminExamChecklistValidation'), valid: Boolean(validation?.valid) },
  ], [draft, t, validation?.valid])

  const submitBlockedReason = useMemo(() => {
    if (!draft) return ''
    if (!draft.id) return t('adminExamSubmitBlocked')
    if (draft.status === 'published') return t('adminExamEditorPublishedLock')
    if (draft.status === 'pending_review') return t('adminExamSubmitPending')
    if (validation && !validation.valid) return t('adminExamSubmitBlocked')
    return ''
  }, [draft, t, validation])

  const actionHint = draft?.status === 'published'
    ? t('adminExamEditorPublishedLock')
    : draftIssues[0] || submitBlockedReason

  const refreshExamList = async (preferredId?: string | null) => {
    setLoadingList(true)
    try {
      const payload = sortExams(await examService.getTeacherExams())
      setExams(payload)

      if (preferredId === NEW_EXAM_ID || selectedExamId === NEW_EXAM_ID) return

      const targetId = preferredId
        ?? (selectedExamId && selectedExamId !== NEW_EXAM_ID ? selectedExamId : null)

      if (!targetId) {
        setSelectedExamId(null)
        setDraft(null)
        setValidation(null)
        setSelectedQuestionId(null)
        return
      }

      const targetExam = payload.find((exam) => exam.id === targetId)
      if (!targetExam) {
        setSelectedExamId(null)
        setDraft(null)
        setValidation(null)
        setSelectedQuestionId(null)
        return
      }

      if (!draft?.id || draft.id !== targetExam.id) {
        await openExam(targetExam)
      }
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    void refreshExamList(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draft || draft.id || draft.subjectId || subjects.length === 0) return
    setDraft((current) => (current ? { ...current, subjectId: subjects[0].id } : current))
  }, [draft, subjects])

  const openNewExam = () => {
    setSelectedExamId(NEW_EXAM_ID)
    setDraft(createEmptyExamDraft(subjects[0]?.id ?? ''))
    setValidation(null)
    setSelectedQuestionId(null)
  }

  const openExam = async (exam: TeacherExamSummary) => {
    setSelectedExamId(exam.id)
    setLoadingEditor(true)
    try {
      const [questions, nextValidation] = await Promise.all([
        examService.getTeacherQuestions(exam.id),
        examService.getTeacherValidation(exam.id),
      ])
      const nextDraft = toExamDraft(exam, questions)
      setDraft(nextDraft)
      setValidation(nextValidation)
      setSelectedQuestionId(nextDraft.questions[0]?.localId ?? null)
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setLoadingEditor(false)
    }
  }

  const patchDraft = (patch: Partial<ExamEditorDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  const updateSection = (sectionId: string, patch: Partial<ExamSectionDraft>) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        sections: current.sections.map((section) => (
          section.id === sectionId ? { ...section, ...patch } : section
        )),
      }
    })
  }

  const addSection = () => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        sections: [
          ...current.sections,
          {
            id: createLocalId(),
            blockOrder: current.sections.length + 1,
            title: t('adminExamSectionDefaultLabel').replace('{index}', String(current.sections.length + 1)),
          },
        ],
      }
    })
  }

  const removeSection = (sectionId: string) => {
    setDraft((current) => {
      if (!current) return current
      const target = current.sections.find((section) => section.id === sectionId)
      const nextSections = current.sections.filter((section) => section.id !== sectionId)
      const removedOrder = target?.blockOrder

      return {
        ...current,
        sections: nextSections,
        questions: current.questions.map((question) => (
          question.blockOrder === removedOrder
            ? { ...question, blockOrder: '', blockTitle: '' }
            : question
        )),
      }
    })
  }

  const updateQuestion = (questionId: string, patch: Partial<ExamQuestionDraft>) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        questions: current.questions.map((question) => (
          question.localId === questionId ? { ...question, ...patch } : question
        )),
      }
    })
  }

  const addQuestion = () => {
    const nextQuestion = createEmptyQuestion()
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        questions: [
          ...current.questions,
          {
            ...nextQuestion,
            questionOrder: current.questions.length + 1,
            blockOrder: current.sections[0]?.blockOrder ?? '',
            blockTitle: current.sections[0]?.title ?? '',
          },
        ],
      }
    })
    setSelectedQuestionId(nextQuestion.localId)
  }

  const moveQuestion = (direction: 'up' | 'down') => {
    if (!draft || activeQuestionIndex < 0) return
    const swapIndex = direction === 'up' ? activeQuestionIndex - 1 : activeQuestionIndex + 1
    if (swapIndex < 0 || swapIndex >= draft.questions.length) return

    const nextQuestions = [...draft.questions]
    const currentQuestion = nextQuestions[activeQuestionIndex]
    nextQuestions[activeQuestionIndex] = nextQuestions[swapIndex]
    nextQuestions[swapIndex] = currentQuestion

    setDraft({
      ...draft,
      questions: nextQuestions.map((question, index) => ({ ...question, questionOrder: index + 1 })),
    })
  }

  const removeActiveQuestion = () => {
    if (!draft || !activeQuestion) return
    const nextQuestions = draft.questions
      .filter((question) => question.localId !== activeQuestion.localId)
      .map((question, index) => ({ ...question, questionOrder: index + 1 }))

    setDraft({ ...draft, questions: nextQuestions })
    setSelectedQuestionId(nextQuestions[0]?.localId ?? null)
  }

  const addOption = () => {
    if (!activeQuestion) return
    updateQuestion(activeQuestion.localId, { options: [...activeQuestion.options, ''] })
  }

  const setOption = (optionIndex: number, value: string) => {
    if (!activeQuestion) return
    const nextOptions = [...activeQuestion.options]
    nextOptions[optionIndex] = value
    updateQuestion(activeQuestion.localId, { options: nextOptions })
  }

  const removeOption = (optionIndex: number) => {
    if (!activeQuestion || activeQuestion.options.length <= 2) return
    const nextOptions = activeQuestion.options.filter((_, index) => index !== optionIndex)
    updateQuestion(activeQuestion.localId, {
      options: nextOptions,
      correctIndex: clampCorrectIndex(activeQuestion.correctIndex, nextOptions),
    })
  }

  const saveExam = async () => {
    if (!draft) return
    if (draftIssues.length > 0) {
      toast.error(draftIssues[0] || t('adminExamSaveBlocked'))
      return
    }

    const orderedSections = draft.sections
      .map((section) => ({ ...section, title: section.title.trim() }))
      .filter((section) => section.title.length > 0)
      .sort((a, b) => a.blockOrder - b.blockOrder)

    const sectionOrderMap = new Map(
      orderedSections.map((section, index) => [section.blockOrder, index + 1]),
    )
    const normalizedSections = orderedSections.map((section, index) => ({
      ...section,
      id: section.id || createLocalId(),
      blockOrder: index + 1,
    }))

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      requiredQuestionCount: draft.requiredQuestionCount,
      priceUzs: Number(draft.priceUzs) || 0,
      isActive: Boolean(draft.isActive),
      blocks: normalizedSections.map((section) => ({
        blockOrder: section.blockOrder,
        title: section.title,
      })),
      questions: draft.questions.map((question, index) => {
        const normalizedOptions = question.options.map((option) => option.trim()).filter(Boolean)
        const nextCorrectIndex = clampCorrectIndex(question.correctIndex, normalizedOptions)
        const rawBlockOrder = question.blockOrder === '' ? undefined : Number(question.blockOrder)

        return {
          id: question.id,
          blockOrder: rawBlockOrder == null ? undefined : sectionOrderMap.get(rawBlockOrder) ?? rawBlockOrder,
          questionOrder: index + 1,
          promptText: question.promptText.trim(),
          imageUrl: question.imageUrl.trim() || null,
          options: normalizedOptions,
          correctIndex: nextCorrectIndex,
          keyVerified: Boolean(question.keyVerified),
          explanation: question.explanation.trim() || undefined,
          difficulty: question.difficulty || undefined,
          sourceRef: question.sourceRef.trim() || undefined,
        }
      }),
    }

    setSavingExam(true)
    try {
      let saved: TeacherExamSummary
      if (selectedExamId === NEW_EXAM_ID) {
        saved = await examService.createTeacherExam({
          subjectId: draft.subjectId,
          title: payload.title,
          description: payload.description,
          requiredQuestionCount: payload.requiredQuestionCount,
          priceUzs: payload.priceUzs,
          blocks: payload.blocks,
          questions: payload.questions,
        })
        if (!draft.isActive) {
          saved = await examService.updateTeacherExam(saved.id, { isActive: false })
        }
      } else {
        saved = await examService.updateTeacherExam(selectedExamId || '', payload)
      }

      const nextExams = sortExams(await examService.getTeacherExams())
      setExams(nextExams)
      const nextSelected = nextExams.find((exam) => exam.id === saved.id) ?? saved
      await openExam(nextSelected)
      toast.success(selectedExamId === NEW_EXAM_ID ? t('adminExamCreated') : t('adminExamSaved'))
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setSavingExam(false)
    }
  }

  const submitForReview = async () => {
    if (!draft?.id || submitBlockedReason) {
      toast.error(submitBlockedReason || t('adminExamSubmitBlocked'))
      return
    }

    setSubmittingExam(true)
    try {
      await examService.submitReview(draft.id)
      await refreshExamList(draft.id)
      toast.success(t('adminExamSubmitReviewSuccess'))
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminExamSubmitReviewFailed'))
    } finally {
      setSubmittingExam(false)
    }
  }

  const refreshValidation = async () => {
    if (!draft?.id) return
    setLoadingEditor(true)
    try {
      const nextValidation = await examService.getTeacherValidation(draft.id)
      setValidation(nextValidation)
      toast.success(t('adminExamValidationRefreshed'))
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setLoadingEditor(false)
    }
  }

  const handleToggleVisibility = async (examId: string, currentIsActive: boolean) => {
    try {
      const updated = await examService.updateTeacherExam(examId, { isActive: !currentIsActive })
      const nextExams = exams.map((exam) => (exam.id === updated.id ? updated : exam))
      setExams(sortExams(nextExams))
      toast.success(updated.isActive ? t('adminContentSubjectVisible') || 'Exam visible' : t('adminContentSubjectHidden') || 'Exam hidden')
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    }
  }

  const handleDeleteExam = async (examId: string) => {
    try {
      await examService.deleteTeacherExam(examId)
      const nextExams = exams.filter((exam) => exam.id !== examId)
      setExams(sortExams(nextExams))
      if (selectedExamId === examId) {
        setDraft(null)
        setSelectedExamId(null)
      }
      toast.success(t('adminSubjectDeleted') || 'Deleted')
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    }
  }

  return (
    <section className={styles.contentPane}>

      {!draft ? (
        <section className={styles.inventorySection}>
          <div className={styles.inventoryHeader}>
            <div>
              <h3 className={styles.inventoryTitle}>{t('adminContentSectionExamsTitle')}</h3>
              <p className={styles.inventorySubtitle}>{t('adminContentSectionExamsSubtitle')}</p>
            </div>

            <div className={styles.inventoryStats}>
              <div className={styles.inventoryStat}>
                <span>{t('exams')}</span>
                <strong>{examStats.total}</strong>
              </div>
              <div className={styles.inventoryStat}>
                <span>{t('adminExamStatusPublished')}</span>
                <strong>{examStats.published}</strong>
              </div>
              <div className={styles.inventoryStat}>
                <span>{t('adminExamStatusPendingReview')}</span>
                <strong>{examStats.pending}</strong>
              </div>
            </div>
          </div>

          <div className={styles.inventoryGrid}>
            <button type="button" className={`${styles.inventoryCard} ${styles.inventoryCardCreate}`} onClick={openNewExam}>
              <div className={styles.inventoryCreateIcon}>
                <PlusCircle size={20} aria-hidden="true" />
              </div>
              <strong>{t('adminExamCreateCardTitle')}</strong>
              <p>{t('adminExamCreateCardSubtitle')}</p>
            </button>

            {exams.map((exam) => {
              const visual = getSubjectVisual(exam.subjectId)
              const active = selectedExamId === exam.id

              return (
                <article key={exam.id} className={`${styles.inventoryCard} ${active ? styles.inventoryCardActive : ''}`}>
                  <div
                    className={styles.inventoryMedia}
                    style={{ backgroundImage: `linear-gradient(180deg, rgba(11, 10, 20, 0.12), rgba(11, 10, 20, 0.7)), url(${visual.imageUrl})` }}
                  >
                    <span className={styles.inventoryBadge}>{subjectTitleById.get(exam.subjectId) ?? exam.subjectId}</span>
                  </div>

                  <div className={styles.inventoryBody}>
                    <div className={styles.inventoryCardHead}>
                      <div>
                        <strong>{exam.title}</strong>
                        <p>{exam.description || t('adminExamCardFallback')}</p>
                      </div>
                      <span className={`${styles.statusBadge} ${getStatusClassName(normalizeExamStatus(exam.status))}`}>
                        {t(
                          exam.status === 'published'
                            ? 'adminExamStatusPublished'
                            : exam.status === 'pending_review'
                              ? 'adminExamStatusPendingReview'
                              : exam.status === 'archived'
                                ? 'adminExamStatusArchived'
                                : 'adminExamStatusDraft'
                        )}
                      </span>
                    </div>

                    <div className={styles.inventoryMetricRow}>
                      <span><FileQuestion size={14} aria-hidden="true" /> {exam.questionCount ?? 0}</span>
                      <span><BadgeCheck size={14} aria-hidden="true" /> {exam.verifiedQuestions ?? 0}</span>
                      <span><Clock3 size={14} aria-hidden="true" /> {Math.round((exam.durationSec ?? 0) / 60)} {t('minutesShort')}</span>
                    </div>

                    <div className={styles.inventoryActions} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button variant="ghost" size="sm" onClick={() => void openExam(exam)}>
                        <Eye size={14} aria-hidden="true" />
                        {t('adminExamOpenEditor')}
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => void handleToggleVisibility(exam.id, Boolean(exam.isActive))}>
                        {exam.isActive ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                        {exam.isActive ? t('adminContentActionHide') || 'Yashirish' : t('adminContentActionShow') || "Ko'rsatish"}
                      </Button>

                      {!exam.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => void handleDeleteExam(exam.id)} className={styles.dangerText}>
                          <Trash2 size={14} aria-hidden="true" />
                          {t('adminContentActionDelete') || "O'chirish"}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.examWorkspace}>
        <div className={styles.examWorkspaceHeader}>
          <div className={styles.examWorkspaceHeaderRow}>
            <div>
              <h4 className={styles.examWorkspaceTitle}>
                {draft?.title?.trim() || t('adminExamEditorUntitled')}
              </h4>
              <p className={styles.inventorySubtitle}>{t('adminExamEditorSubtitle')}</p>
            </div>

            <Button variant="ghost" size="sm" onClick={() => { setDraft(null); setSelectedExamId(null); }}>
              <ArrowLeft size={14} aria-hidden="true" />
              {t('adminContentBackToInventory')}
            </Button>
          </div>

          <div className={styles.examWorkspaceActions}>
            <Button variant="ghost" size="sm" onClick={() => void refreshExamList(null)} disabled={loadingList}>
              <RefreshCcw size={14} aria-hidden="true" />
              {t('adminRefresh')}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => void refreshValidation()} disabled={!draft?.id || loadingEditor}>
              <CircleDashed size={14} aria-hidden="true" />
              {t('adminExamRefreshValidation')}
            </Button>
            <Button onClick={() => void saveExam()} disabled={!draft || savingExam || !editable}>
              <Save size={14} aria-hidden="true" />
              {savingExam ? t('adminSaving') : t('adminExamSaveAction')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void submitForReview()}
              disabled={!draft?.id || Boolean(submitBlockedReason) || submittingExam}
            >
              <Send size={14} aria-hidden="true" />
              {submittingExam ? t('adminProcessing') : t('adminExamSubmitForReview')}
            </Button>
          </div>
        </div>

        {actionHint ? <p className={styles.examActionHint}>{actionHint}</p> : null}

        {!draft ? (
          <div className={styles.workspaceEmptyCard}>
            <h3 className={styles.commandDeckTitle}>{t('adminExamEditorEmptyTitle')}</h3>
            <p className={styles.commandDeckSubtitle}>{t('adminExamEditorEmptySubtitle')}</p>
            <div className={styles.commandCardActions}>
              <Button onClick={openNewExam}>
                <PlusCircle size={14} aria-hidden="true" />
                {t('adminExamCreateCardTitle')}
              </Button>

            </div>
          </div>
        ) : loadingEditor ? (
          <div className={styles.workspaceLoading}>{t('adminLoading')}</div>
        ) : (
          <>
            {!editable ? (
              <Alert variant="warning">{t('adminExamEditorPublishedLock')}</Alert>
            ) : null}

            {validation ? (
              <Alert variant={validation.valid ? 'success' : 'warning'}>
                {t('adminExamValidationSummary').replace('{verified}', validationSummary).replace('{questions}', String(validation.questionCount))}
              </Alert>
            ) : null}

            <div className={styles.examSummaryGrid}>
              <div className={styles.examSummaryCard}>
                <span>{t('adminExamFixedDuration')}</span>
                <strong>120 {t('minutesShort')}</strong>
              </div>
              <div className={styles.examSummaryCard}>
                <span>{t('adminExamFixedPassThreshold')}</span>
                <strong>80%</strong>
              </div>
              <div className={styles.examSummaryCard}>
                <span>{t('adminExamQuestionCoverage')}</span>
                <strong>{draft.questions.length}/{draft.requiredQuestionCount}</strong>
              </div>
              <div className={styles.examSummaryCard}>
                <span>{t('adminExamVerifiedKeysLabel')}</span>
                <strong>{draft.questions.filter((question) => question.keyVerified).length}</strong>
              </div>
            </div>

            <div className={styles.examEditorGrid}>
              <div className={styles.examEditorMain}>
                <div className={styles.formGrid}>
                  <Select
                    label={t('adminSubject')}
                    value={draft.subjectId}
                    onChange={(event) => patchDraft({ subjectId: event.target.value })}
                    disabled={Boolean(draft.id)}
                  >
                    <option value="">{t('adminContentSelectSubjectPlaceholder')}</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.title}</option>
                    ))}
                  </Select>

                  <Select
                    label={t('adminExamImportRequiredQuestions')}
                    value={String(draft.requiredQuestionCount)}
                    onChange={(event) => patchDraft({ requiredQuestionCount: Number(event.target.value) === 50 ? 50 : 35 })}
                    disabled={!editable}
                  >
                    <option value="35">35</option>
                    <option value="50">50</option>
                  </Select>

                  <Input
                    label={t('adminExamImportExamTitle')}
                    value={draft.title}
                    onChange={(event) => patchDraft({ title: event.target.value })}
                    errorMessage={!draft.title.trim() ? t('adminExamEditorTitleRequired') : undefined}
                    disabled={!editable}
                  />

                  <Input
                    label={t('adminCoursePrice')}
                    type="number"
                    min={0}
                    value={String(draft.priceUzs)}
                    onChange={(event) => patchDraft({ priceUzs: Number(event.target.value) || 0 })}
                    disabled={!editable}
                  />

                  <Textarea
                    label={t('adminContentDescription')}
                    rows={4}
                    value={draft.description}
                    onChange={(event) => patchDraft({ description: event.target.value })}
                    fieldClassName={styles.fieldWide}
                    disabled={!editable}
                  />

                  <label className={styles.examToggle}>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.isActive)}
                      onChange={(event) => patchDraft({ isActive: event.target.checked })}
                      disabled={!editable}
                    />
                    <span>{t('adminPricingActive')}</span>
                  </label>
                </div>

                <div className={styles.examSectionBoard}>
                  <div className={styles.rowHeader}>
                    <h4>{t('adminExamSectionsTitle')}</h4>
                    <Button variant="ghost" size="sm" onClick={addSection} disabled={!editable}>
                      <PlusCircle size={14} aria-hidden="true" />
                      {t('adminExamAddSection')}
                    </Button>
                  </div>

                  {draft.sections.length === 0 ? (
                    <div className={styles.emptyState}>{t('adminExamSectionsEmpty')}</div>
                  ) : (
                    <div className={styles.examSectionList}>
                      {draft.sections.map((section) => (
                        <article key={section.id} className={styles.examSectionItem}>
                          <Input
                            label={t('adminExamSectionOrder')}
                            type="number"
                            min={1}
                            value={String(section.blockOrder)}
                            onChange={(event) => updateSection(section.id, { blockOrder: Number(event.target.value) || 1 })}
                            disabled={!editable}
                          />
                          <Input
                            label={t('adminExamSectionTitle')}
                            value={section.title}
                            onChange={(event) => updateSection(section.id, { title: event.target.value })}
                            disabled={!editable}
                          />
                          <Button variant="danger" size="sm" onClick={() => removeSection(section.id)} disabled={!editable}>
                            <Trash2 size={14} aria-hidden="true" />
                            {t('adminContentDelete')}
                          </Button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.examQuestionEditor}>
                  <div className={styles.rowHeader}>
                    <h4>{t('adminExamQuestionsTitle')}</h4>
                    <div className={styles.inlineActions}>
                      <Button variant="ghost" size="sm" onClick={addQuestion} disabled={!editable}>
                        <PlusCircle size={14} aria-hidden="true" />
                        {t('adminContentAddQuestion')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveQuestion('up')} disabled={!editable || activeQuestionIndex <= 0}>
                        {t('adminContentMoveUp')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveQuestion('down')}
                        disabled={!editable || activeQuestionIndex < 0 || activeQuestionIndex >= draft.questions.length - 1}
                      >
                        {t('adminContentMoveDown')}
                      </Button>
                    </div>
                  </div>

                  {!activeQuestion ? (
                    <div className={styles.emptyState}>{t('adminExamQuestionSelectHint')}</div>
                  ) : (
                    <div className={styles.questionEditor}>
                      <Textarea
                        label={t('adminContentQuestionText')}
                        rows={4}
                        value={activeQuestion.promptText}
                        onChange={(event) => updateQuestion(activeQuestion.localId, { promptText: event.target.value })}
                        disabled={!editable}
                      />

                      <div className={styles.formGrid}>
                        <Select
                          label={t('adminExamQuestionSection')}
                          value={activeQuestion.blockOrder === '' ? '' : String(activeQuestion.blockOrder)}
                          onChange={(event) => {
                            const nextOrder = event.target.value ? Number(event.target.value) : ''
                            const nextSection = draft.sections.find((section) => section.blockOrder === nextOrder)
                            updateQuestion(activeQuestion.localId, {
                              blockOrder: nextOrder,
                              blockTitle: nextSection?.title ?? '',
                            })
                          }}
                          disabled={!editable}
                        >
                          <option value="">{t('adminExamQuestionSectionNone')}</option>
                          {draft.sections
                            .slice()
                            .sort((left, right) => left.blockOrder - right.blockOrder)
                            .map((section) => (
                              <option key={section.id} value={section.blockOrder}>
                                {section.blockOrder}. {section.title}
                              </option>
                            ))}
                        </Select>

                        <Select
                          label={t('adminExamQuestionDifficulty')}
                          value={activeQuestion.difficulty}
                          onChange={(event) => updateQuestion(activeQuestion.localId, { difficulty: event.target.value as ExamDifficulty })}
                          disabled={!editable}
                        >
                          <option value="">{t('adminExamQuestionDifficultyUnset')}</option>
                          <option value="easy">{t('difficultyEasy')}</option>
                          <option value="medium">{t('difficultyMedium')}</option>
                          <option value="hard">{t('difficultyHard')}</option>
                        </Select>

                        <Input
                          label={t('adminContentQuestionImageUrl')}
                          value={activeQuestion.imageUrl}
                          onChange={(event) => updateQuestion(activeQuestion.localId, { imageUrl: event.target.value })}
                          disabled={!editable}
                        />

                        <Input
                          label={t('adminExamQuestionSource')}
                          value={activeQuestion.sourceRef}
                          onChange={(event) => updateQuestion(activeQuestion.localId, { sourceRef: event.target.value })}
                          disabled={!editable}
                        />
                      </div>

                      <div className={styles.examOptionList}>
                        {activeQuestion.options.map((option, optionIndex) => (
                          <div key={`${activeQuestion.localId}-${optionIndex}`} className={styles.examOptionRow}>
                            <label className={styles.optionCorrectPick}>
                              <input
                                type="radio"
                                name={`exam-correct-${activeQuestion.localId}`}
                                checked={activeQuestion.correctIndex === optionIndex}
                                onChange={() => updateQuestion(activeQuestion.localId, { correctIndex: optionIndex })}
                                disabled={!editable}
                              />
                              <span>{String.fromCharCode(65 + optionIndex)}</span>
                            </label>
                            <Input
                              label={t('adminContentOptionPlaceholder').replace('{index}', String(optionIndex + 1))}
                              hideLabel
                              value={option}
                              onChange={(event) => setOption(optionIndex, event.target.value)}
                              disabled={!editable}
                            />
                            <Button variant="danger" size="sm" onClick={() => removeOption(optionIndex)} disabled={!editable || activeQuestion.options.length <= 2}>
                              <Trash2 size={14} aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className={styles.inlineActions}>
                        <Button variant="ghost" size="sm" onClick={addOption} disabled={!editable}>
                          <PlusCircle size={14} aria-hidden="true" />
                          {t('adminContentAddOption')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={removeActiveQuestion} disabled={!editable}>
                          <Trash2 size={14} aria-hidden="true" />
                          {t('adminContentDeleteQuestion')}
                        </Button>
                      </div>

                      <Textarea
                        label={t('adminExamQuestionExplanation')}
                        rows={3}
                        value={activeQuestion.explanation}
                        onChange={(event) => updateQuestion(activeQuestion.localId, { explanation: event.target.value })}
                        disabled={!editable}
                      />

                      <label className={styles.examToggle}>
                        <input
                          type="checkbox"
                          checked={Boolean(activeQuestion.keyVerified)}
                          onChange={(event) => updateQuestion(activeQuestion.localId, { keyVerified: event.target.checked })}
                          disabled={!editable}
                        />
                        <span>{t('adminExamImportVerified')}</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <aside className={styles.examQuestionRail}>
                <div className={styles.validationChecklist}>
                  <div className={styles.rowHeader}>
                    <h4>{t('adminExamChecklistTitle')}</h4>
                  </div>

                  <ul className={styles.validationChecklistList}>
                    {checklistItems.map((item) => (
                      <li key={item.label} className={`${styles.validationChecklistItem} ${item.valid ? styles.validationChecklistItemValid : ''}`}>
                        {item.valid ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>

                  {validation && !validation.valid && validation.issues.length > 0 ? (
                    <ul className={styles.issueList}>
                      {validation.issues.slice(0, 5).map((issue) => (
                        <li key={`${issue.code}-${issue.message}`}>
                          <AlertTriangle size={14} aria-hidden="true" />
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className={styles.rowHeader}>
                  <h4>{t('adminExamQuestionRailTitle')}</h4>
                </div>

                <div className={styles.examQuestionList}>
                  {draft.questions.length === 0 ? (
                    <div className={styles.emptyState}>{t('adminExamQuestionRailEmpty')}</div>
                  ) : draft.questions.map((question, index) => {
                    const sectionTitle = question.blockOrder === ''
                      ? t('adminExamQuestionSectionNone')
                      : draft.sections.find((section) => section.blockOrder === question.blockOrder)?.title
                      ?? question.blockTitle
                      ?? t('adminExamQuestionSectionNone')

                    return (
                      <button
                        key={question.localId}
                        type="button"
                        className={`${styles.questionNavItem} ${selectedQuestionId === question.localId ? styles.questionNavItemActive : ''}`}
                        onClick={() => setSelectedQuestionId(question.localId)}
                      >
                        <strong>{t('adminExamQuestionItem').replace('{index}', String(index + 1))}</strong>
                        <span>{question.promptText.trim() || t('adminExamQuestionUntitled')}</span>
                        <small>
                          {sectionTitle}
                          {' • '}
                          {question.keyVerified ? t('adminExamImportVerified') : t('adminExamImportPending')}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </section>
  )
}
