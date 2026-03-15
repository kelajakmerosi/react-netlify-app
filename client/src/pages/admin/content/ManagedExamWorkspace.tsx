import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  CircleCheckBig,
  CircleDashed,
  Clock3,
  Eye,
  EyeOff,
  FileQuestion,
  PlusCircle,
  Save,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { Alert, MathText } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
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
import { MATH_SYMBOLS, getAuthoringInsert } from './mathSymbols'
import styles from './ContentBuilder.module.css'

type ExamStatus = 'draft' | 'pending_review' | 'published' | 'archived'
type EditorStep = 'setup' | 'questions' | 'review'
type QuestionFormatType = 'MCQ4' | 'MCQ8' | 'WRITTEN'
type QuestionDifficulty = 'easy' | 'medium' | 'hard' | ''
type SectionType = 'attestation' | 'general' | 'milliy' | ''

interface ExamBlockDraft {
  blockOrder: number
  title: string
}

interface ExamQuestionDraft {
  id?: string
  questionOrder: number
  promptText: string
  promptRich?: Record<string, unknown>
  imageUrl: string
  options: string[]
  correctIndex: number
  keyVerified: boolean
  explanation: string
  difficulty: QuestionDifficulty
  sourceRef: string
  blockOrder: number | null
  blockTitle?: string | null
  formatType: QuestionFormatType
  writtenAnswer: string
}

interface EditableExamDraft {
  id?: string
  subjectId: string
  sectionType: SectionType
  title: string
  description: string
  requiredQuestionCount: 35 | 45 | 50
  priceUzs: number
  isActive: boolean
  status: string
  blocks: ExamBlockDraft[]
  questions: ExamQuestionDraft[]
  validation: ExamValidation | null
  isNew: boolean
}

interface WorkspaceIssue {
  code: string
  message: string
  step: EditorStep
  questionIndex?: number
}

interface ManagedExamWorkspaceProps {
  subjects: SubjectRecord[]
  subjectIdFilter?: string
  sectionTypeLock?: Exclude<SectionType, ''>
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

const getStatusClassName = (status: ExamStatus) => {
  if (status === 'pending_review') return styles.statusReview
  if (status === 'published') return styles.statusPublished
  if (status === 'archived') return styles.statusArchived
  return styles.statusDraft
}

const isMcqFormat = (formatType: QuestionFormatType) => formatType === 'MCQ4' || formatType === 'MCQ8'

const normalizeQuestionOrders = (questions: ExamQuestionDraft[]): ExamQuestionDraft[] => (
  questions.map((question, index) => ({ ...question, questionOrder: index + 1 }))
)

const createBlankQuestion = (order: number): ExamQuestionDraft => ({
  questionOrder: order,
  promptText: '',
  promptRich: {},
  imageUrl: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  keyVerified: false,
  explanation: '',
  difficulty: '',
  sourceRef: '',
  blockOrder: null,
  formatType: 'MCQ4',
  writtenAnswer: '',
})

const createEmptyDraft = (subjectId = ''): EditableExamDraft => ({
  subjectId,
  sectionType: '',
  title: '',
  description: '',
  requiredQuestionCount: 35,
  priceUzs: 0,
  isActive: true,
  status: 'draft',
  blocks: [],
  questions: [createBlankQuestion(1)],
  validation: null,
  isNew: true,
})

type TeacherQuestionLike = Omit<TeacherExamQuestion, 'formatType'> & {
  formatType?: QuestionFormatType | null
  blockTitle?: string | null
}

const toEditableQuestion = (question: TeacherQuestionLike): ExamQuestionDraft => ({
  id: question.id,
  questionOrder: Number(question.questionOrder || 0),
  promptText: question.promptText ?? '',
  promptRich: question.promptRich,
  imageUrl: question.imageUrl ?? '',
  options: Array.isArray(question.options) && question.options.length > 0 ? [...question.options] : ['', '', '', ''],
  correctIndex: Number(question.correctIndex ?? 0),
  keyVerified: Boolean(question.keyVerified),
  explanation: question.explanation ?? '',
  difficulty: (question.difficulty as QuestionDifficulty | null | undefined) ?? '',
  sourceRef: question.sourceRef ?? '',
  blockOrder: question.blockOrder ?? null,
  blockTitle: question.blockTitle ?? null,
  formatType: question.formatType ?? 'MCQ4',
  writtenAnswer: question.writtenAnswer ?? '',
})

const parseIssueQuestionIndex = (issue: { message?: string; details?: unknown }): number | undefined => {
  const details = (issue.details && typeof issue.details === 'object') ? issue.details as Record<string, unknown> : null
  const detailOrder = Number(details?.questionOrder)
  if (Number.isInteger(detailOrder) && detailOrder > 0) return detailOrder - 1

  const message = String(issue.message || '')
  const matches = [
    message.match(/question\s+(\d+)/i),
    message.match(/(\d+)-savol/i),
  ]
  for (const match of matches) {
    const value = Number(match?.[1])
    if (Number.isInteger(value) && value > 0) return value - 1
  }
  return undefined
}

const questionIsComplete = (question: ExamQuestionDraft): boolean => {
  if (!question.promptText.trim()) return false

  if (isMcqFormat(question.formatType)) {
    const filledOptions = question.options.map((option) => option.trim()).filter(Boolean)
    return filledOptions.length >= 2
      && question.correctIndex >= 0
      && question.correctIndex < question.options.length
      && question.options.every((option, index) => index >= filledOptions.length ? true : option.trim().length > 0)
  }

  return true
}

export default function ManagedExamWorkspace({
  subjects,
  subjectIdFilter,
  sectionTypeLock,
}: ManagedExamWorkspaceProps): JSX.Element {
  const { t } = useLang()
  const toast = useToast()
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  const [exams, setExams] = useState<TeacherExamSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editorStep, setEditorStep] = useState<EditorStep>('setup')
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [draft, setDraft] = useState<EditableExamDraft | null>(null)
  const [dirty, setDirty] = useState(false)
  const [panelError, setPanelError] = useState('')

  const subjectTitleById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.title])),
    [subjects],
  )

  const examStats = useMemo(() => ({
    total: exams.length,
    published: exams.filter((exam) => exam.status === 'published').length,
    pending: exams.filter((exam) => exam.status === 'pending_review').length,
  }), [exams])

  const refreshExamList = async () => {
    setLoadingList(true)
    try {
      const next = await examService.getTeacherExams()
      setExams(sortExams(next.filter((exam) => {
        if (subjectIdFilter && exam.subjectId !== subjectIdFilter) return false
        if (sectionTypeLock && exam.sectionType !== sectionTypeLock) return false
        return true
      })))
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    void refreshExamList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const workspaceIssues = useMemo<WorkspaceIssue[]>(() => {
    if (!draft) return []

    const issues: WorkspaceIssue[] = []

    if (!draft.subjectId) {
      issues.push({
        code: 'subject_required',
        message: t('adminExamReviewMissingSubject'),
        step: 'setup',
      })
    }

    if (!draft.title.trim()) {
      issues.push({
        code: 'title_required',
        message: t('adminExamReviewMissingTitle'),
        step: 'setup',
      })
    }

    if (draft.questions.length === 0) {
      issues.push({
        code: 'question_required',
        message: t('adminExamEditorQuestionRequired'),
        step: 'questions',
      })
    }

    draft.questions.forEach((question, index) => {
      if (!questionIsComplete(question)) {
        issues.push({
          code: 'invalid_question',
          message: t('adminExamReviewInvalidQuestion').replace('{index}', String(index + 1)),
          step: 'questions',
          questionIndex: index,
        })
      }
    })

    if (draft.questions.length < draft.requiredQuestionCount) {
      issues.push({
        code: 'question_gap',
        message: t('adminExamReviewQuestionGap').replace('{count}', String(draft.requiredQuestionCount - draft.questions.length)),
        step: 'questions',
      })
    }

    const remoteIssues = draft.validation?.issues ?? []
    remoteIssues.forEach((issue) => {
      issues.push({
        code: issue.code,
        message: issue.message,
        step: parseIssueQuestionIndex(issue) !== undefined ? 'questions' : 'review',
        questionIndex: parseIssueQuestionIndex(issue),
      })
    })

    return issues
  }, [draft, t])

  const validationSnapshot = useMemo<ExamValidation | null>(() => {
    if (!draft) return null

    const verifiedQuestions = draft.questions.reduce((sum, question) => (
      sum + (questionIsComplete(question) && question.keyVerified ? 1 : 0)
    ), 0)

    return {
      valid: workspaceIssues.length === 0,
      requiredQuestionCount: draft.requiredQuestionCount,
      questionCount: draft.questions.length,
      verifiedQuestions,
      issues: workspaceIssues.map((issue) => ({
        code: issue.code,
        message: issue.message,
      })),
    }
  }, [draft, workspaceIssues])

  const selectedExamId = draft?.id ?? null
  const activeQuestion = draft?.questions[activeQuestionIndex] ?? null
  const isPublished = draft?.status === 'published'

  const checklist = useMemo(() => ([
    {
      label: t('adminExamIssueSubject'),
      valid: Boolean(draft?.subjectId),
    },
    {
      label: t('adminExamIssueTitle'),
      valid: Boolean(draft?.title.trim()),
    },
    {
      label: t('adminExamIssueQuestion'),
      valid: Boolean((draft?.questions.length ?? 0) > 0),
    },
    {
      label: t('adminExamIssueInvalidQuestion'),
      valid: Boolean(draft?.questions.every(questionIsComplete)),
    },
    {
      label: t('adminExamChecklistValidation'),
      valid: Boolean(validationSnapshot?.valid),
    },
  ]), [draft, t, validationSnapshot?.valid])

  const insertPromptSymbol = (label: string, snippet: string) => {
    if (!draft || !activeQuestion) return
    const entry = { label, snippet, title: label }
    const insert = getAuthoringInsert(entry)
    const textarea = promptRef.current
    const value = activeQuestion.promptText
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const next = value.slice(0, start) + insert.text + value.slice(end)
    patchQuestion({ promptText: next })
    const nextCursor = start + (insert.cursor ?? insert.text.length)
    requestAnimationFrame(() => {
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const patchDraft = (recipe: (current: EditableExamDraft) => EditableExamDraft) => {
    setDraft((current) => {
      if (!current) return current
      return recipe(current)
    })
    setDirty(true)
  }

  const patchQuestion = (patch: Partial<ExamQuestionDraft>) => {
    patchDraft((current) => ({
      ...current,
      validation: null,
      questions: current.questions.map((question, questionIndex) => (
        questionIndex === activeQuestionIndex
          ? {
            ...question,
            ...patch,
            options: patch.options ?? question.options,
          }
          : question
      )),
    }))
  }

  const openNewExam = () => {
    if (subjects.length === 0) {
      toast.error(t('adminExamNoSubjectAccess'))
      return
    }

    setDraft({
      ...createEmptyDraft(subjectIdFilter ?? subjects[0]?.id ?? ''),
      sectionType: sectionTypeLock ?? '',
    })
    setActiveQuestionIndex(0)
    setEditorStep('setup')
    setDirty(true)
    setPanelError('')
  }

  const openExistingExam = async (exam: TeacherExamSummary) => {
    setLoadingEditor(true)
    setPanelError('')
    try {
      const [questions, validation] = await Promise.all([
        examService.getTeacherQuestions(exam.id),
        examService.getTeacherValidation(exam.id),
      ])

      const nextQuestions = normalizeQuestionOrders(questions.map(toEditableQuestion))
      const nextBlocks = Array.from(
        new Map(
          nextQuestions
            .filter((question) => question.blockOrder)
            .map((question) => [
              Number(question.blockOrder),
              {
                blockOrder: Number(question.blockOrder),
                title: question.blockOrder && question.blockTitle
                  ? question.blockTitle
                  : t('adminExamSectionDefaultLabel').replace('{index}', String(question.blockOrder ?? 1)),
              },
            ]),
        ).values(),
      )

      setDraft({
        id: exam.id,
        subjectId: exam.subjectId,
        sectionType: (exam.sectionType as SectionType | null | undefined) ?? '',
        title: exam.title,
        description: exam.description ?? '',
        requiredQuestionCount: (exam.requiredQuestionCount as 35 | 45 | 50 | undefined) ?? 35,
        priceUzs: Number(exam.priceUzs ?? 0),
        isActive: Boolean(exam.isActive),
        status: exam.status,
        blocks: nextBlocks,
        questions: nextQuestions.length > 0 ? nextQuestions : [createBlankQuestion(1)],
        validation,
        isNew: false,
      })
      setActiveQuestionIndex(0)
      setEditorStep('questions')
      setDirty(false)
    } catch (error) {
      const message = resolveUiErrorMessage(error, t, 'adminActionFailed')
      setPanelError(message)
      toast.error(message)
    } finally {
      setLoadingEditor(false)
    }
  }

  const handleToggleVisibility = async (examId: string, currentIsActive: boolean) => {
    try {
      const updated = await examService.updateTeacherExam(examId, { isActive: !currentIsActive })
      setExams((current) => sortExams(current.map((exam) => (exam.id === updated.id ? updated : exam))))
      if (draft?.id === examId) {
        setDraft({ ...draft, isActive: Boolean(updated.isActive) })
      }
      toast.success(updated.isActive ? (t('adminContentSubjectVisible') || 'Exam visible') : (t('adminContentSubjectHidden') || 'Exam hidden'))
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    }
  }

  const handleDeleteExam = async (examId: string) => {
    try {
      await examService.deleteTeacherExam(examId)
      setExams((current) => sortExams(current.filter((exam) => exam.id !== examId)))
      if (draft?.id === examId) {
        setDraft(null)
        setActiveQuestionIndex(0)
      }
      toast.success(t('adminSubjectDeleted') || 'Deleted')
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    }
  }

  const handleAddQuestion = () => {
    patchDraft((current) => {
      const nextQuestions = normalizeQuestionOrders([
        ...current.questions,
        createBlankQuestion(current.questions.length + 1),
      ])
      return {
        ...current,
        validation: null,
        questions: nextQuestions,
      }
    })
    setActiveQuestionIndex(draft?.questions.length ?? 0)
    setEditorStep('questions')
  }

  const handleInsertNextQuestion = () => {
    if (!draft) return
    patchDraft((current) => {
      const nextQuestions = current.questions.slice()
      nextQuestions.splice(activeQuestionIndex + 1, 0, createBlankQuestion(activeQuestionIndex + 2))
      return {
        ...current,
        validation: null,
        questions: normalizeQuestionOrders(nextQuestions),
      }
    })
    setActiveQuestionIndex((current) => current + 1)
  }

  const handleDuplicateQuestion = () => {
    if (!draft || !activeQuestion) return
    patchDraft((current) => {
      const duplicate = {
        ...activeQuestion,
        id: undefined,
      }
      const nextQuestions = current.questions.slice()
      nextQuestions.splice(activeQuestionIndex + 1, 0, duplicate)
      return {
        ...current,
        validation: null,
        questions: normalizeQuestionOrders(nextQuestions),
      }
    })
    setActiveQuestionIndex((current) => current + 1)
  }

  const handleRemoveQuestion = () => {
    if (!draft || draft.questions.length <= 1) return
    patchDraft((current) => ({
      ...current,
      validation: null,
      questions: normalizeQuestionOrders(
        current.questions.filter((_, questionIndex) => questionIndex !== activeQuestionIndex),
      ),
    }))
    setActiveQuestionIndex((current) => Math.max(0, current - 1))
  }

  const handleAddSection = () => {
    patchDraft((current) => {
      const nextOrder = current.blocks.length > 0
        ? Math.max(...current.blocks.map((block) => block.blockOrder)) + 1
        : 1
      return {
        ...current,
        blocks: [...current.blocks, {
          blockOrder: nextOrder,
          title: t('adminExamSectionDefaultLabel').replace('{index}', String(nextOrder)),
        }],
      }
    })
    setEditorStep('setup')
  }

  const persistDraft = async (submitForReview = false) => {
    if (!draft) return null

    const localBlocking = workspaceIssues.filter((issue) => issue.code === 'subject_required' || issue.code === 'title_required' || issue.code === 'question_required' || issue.code === 'invalid_question')
    if (localBlocking.length > 0) {
      toast.error(t('adminExamSaveBlocked'))
      setEditorStep(localBlocking[0]?.step ?? 'setup')
      if (localBlocking[0]?.questionIndex != null) setActiveQuestionIndex(localBlocking[0].questionIndex)
      return null
    }

    const payload = {
      subjectId: subjectIdFilter ?? draft.subjectId,
      sectionType: (sectionTypeLock ?? draft.sectionType) || undefined,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      requiredQuestionCount: draft.requiredQuestionCount,
      priceUzs: Math.max(0, Number(draft.priceUzs || 0)),
      isActive: Boolean(draft.isActive),
      blocks: draft.blocks
        .filter((block) => block.title.trim())
        .map((block, index) => ({
          blockOrder: index + 1,
          title: block.title.trim(),
        })),
      questions: normalizeQuestionOrders(draft.questions).map((question) => ({
        id: question.id,
        blockOrder: question.blockOrder || undefined,
        questionOrder: question.questionOrder,
        promptText: question.promptText.trim(),
        promptRich: question.promptRich,
        imageUrl: question.imageUrl.trim() || undefined,
        options: isMcqFormat(question.formatType)
          ? question.options.map((option) => option.trim()).filter(Boolean)
          : [],
        correctIndex: isMcqFormat(question.formatType) ? question.correctIndex : undefined,
        keyVerified: Boolean(question.keyVerified),
        explanation: question.explanation.trim() || undefined,
        difficulty: question.difficulty || undefined,
        sourceRef: question.sourceRef.trim() || undefined,
        formatType: question.formatType,
        writtenAnswer: question.formatType === 'WRITTEN'
          ? (question.writtenAnswer.trim() || undefined)
          : undefined,
      })),
    }

    const saved = draft.id
      ? await examService.updateTeacherExam(draft.id, payload)
      : await examService.createTeacherExam(payload)

    const refreshedValidation = await examService.getTeacherValidation(saved.id).catch(() => null)

    setExams((current) => {
      const next = current.some((exam) => exam.id === saved.id)
        ? current.map((exam) => (exam.id === saved.id ? saved : exam))
        : [saved, ...current]
      return sortExams(next)
    })

    setDraft((current) => current ? {
      ...current,
      id: saved.id,
      status: saved.status,
      isActive: Boolean(saved.isActive),
      validation: refreshedValidation,
      isNew: false,
    } : current)
    setDirty(false)

    toast.success(submitForReview
      ? t('adminExamSubmitReviewSuccess')
      : (draft.id ? t('adminExamSaved') : t('adminExamCreated')))

    return saved
  }

  const handleSave = async () => {
    if (!draft) return
    try {
      setSaving(true)
      setPanelError('')
      await persistDraft(false)
    } catch (error) {
      const message = resolveUiErrorMessage(error, t, 'adminActionFailed')
      setPanelError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!draft) return
    if (draft.status === 'pending_review') {
      toast.info(t('adminExamSubmitPending'))
      return
    }

    if (!validationSnapshot?.valid) {
      toast.error(t('adminExamSubmitBlocked'))
      setEditorStep('review')
      return
    }

    try {
      setSubmitting(true)
      setPanelError('')
      const saved = dirty || !draft.id ? await persistDraft(true) : { id: draft.id }
      if (!saved?.id) return
      await examService.submitReview(saved.id)
      setDraft((current) => current ? { ...current, status: 'pending_review' } : current)
      setExams((current) => sortExams(current.map((exam) => (
        exam.id === saved.id ? { ...exam, status: 'pending_review' } : exam
      ))))
    } catch (error) {
      const message = resolveUiErrorMessage(error, t, 'adminExamSubmitReviewFailed')
      setPanelError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const jumpToIssue = (issue: WorkspaceIssue) => {
    setEditorStep(issue.step === 'review' ? 'questions' : issue.step)
    if (issue.questionIndex != null) {
      setActiveQuestionIndex(Math.max(0, issue.questionIndex))
    }
  }

  return (
    <section className={styles.contentPane}>
      {subjects.length === 0 ? (
        <Alert variant="info">{t('adminExamNoSubjectAccess')}</Alert>
      ) : null}
      {panelError ? <Alert variant="warning">{panelError}</Alert> : null}

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

        {loadingList ? (
          <div className={styles.emptyState}>{t('adminLoading')}</div>
        ) : (
          <div className={styles.inventoryGrid}>
            <button
              type="button"
              className={`${styles.inventoryCard} ${styles.inventoryCardCreate} ${draft?.isNew ? styles.inventoryCardActive : ''}`}
              onClick={openNewExam}
              disabled={subjects.length === 0}
              aria-label={t('adminExamCreateCardTitle')}
            >
              <div className={styles.inventoryCreateIcon}>
                <PlusCircle size={20} aria-hidden="true" />
              </div>
              <strong>{t('adminExamCreateCardTitle')}</strong>
              <p>{t('adminExamCreateCardSubtitle')}</p>
            </button>

            {exams.length === 0 ? (
              <div className={styles.emptyState}>{t('adminExamNoExams') || 'No exams yet'}</div>
            ) : exams.map((exam) => {
              const visual = getSubjectVisual(exam.subjectId)
              const active = selectedExamId === exam.id

              return (
                <article
                  key={exam.id}
                  className={`${styles.inventoryCard} ${active ? styles.inventoryCardActive : ''}`}
                >
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
                                : 'adminExamStatusDraft',
                        )}
                      </span>
                    </div>

                    <div className={styles.inventoryMetricRow}>
                      <span><FileQuestion size={14} aria-hidden="true" /> {exam.questionCount ?? 0}</span>
                      <span><BadgeCheck size={14} aria-hidden="true" /> {exam.verifiedQuestions ?? 0}</span>
                      <span><Clock3 size={14} aria-hidden="true" /> {Math.round((exam.durationSec ?? 0) / 60)} {t('minutesShort')}</span>
                    </div>

                    <div className={styles.inventoryActions} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button variant="ghost" size="sm" onClick={() => void openExistingExam(exam)}>
                        <Eye size={14} aria-hidden="true" />
                        {t('adminExamOpenEditor')}
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => void handleToggleVisibility(exam.id, Boolean(exam.isActive))}>
                        {exam.isActive ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                        {exam.isActive ? (t('adminContentActionHide') || 'Hide') : (t('adminContentActionShow') || 'Show')}
                      </Button>

                      {!exam.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => void handleDeleteExam(exam.id)} className={styles.dangerText}>
                          <Trash2 size={14} aria-hidden="true" />
                          {t('adminContentActionDelete') || 'Delete'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {loadingEditor ? (
        <section className={styles.examWorkspace}>
          <div className={styles.workspaceLoading}>{t('adminLoading')}</div>
        </section>
      ) : !draft ? (
        <section className={styles.examWorkspace}>
          <div className={styles.workspaceEmptyCard}>
            <p className={styles.commandDeckEyebrow}>{t('adminExamEditingEyebrow')}</p>
            <h3 className={styles.commandDeckTitle}>{t('adminExamEditorEmptyTitle')}</h3>
            <p className={styles.commandDeckSubtitle}>{t('adminExamEditorEmptySubtitle')}</p>
          </div>
        </section>
      ) : (
        <section className={styles.examWorkspace}>
          <div className={styles.examWorkspaceHeader}>
            <div>
              <p className={styles.commandDeckEyebrow}>
                {draft.isNew ? t('adminExamDraftEyebrow') : t('adminExamEditingEyebrow')}
              </p>
              <h3 className={styles.examWorkspaceTitle}>
                {draft.title.trim() || t('adminExamEditorUntitled')}
              </h3>
              <p className={styles.inventorySubtitle}>{t('adminExamEditorSubtitle')}</p>
            </div>

            <div className={styles.examWorkspaceActions}>
              <Button variant="ghost" onClick={() => setEditorStep('setup')}>
                {t('adminExamGoToSetup')}
              </Button>
              <Button variant="ghost" onClick={() => setEditorStep('questions')}>
                {t('adminExamGoToQuestions')}
              </Button>
              <Button variant="ghost" onClick={handleSave} disabled={saving || isPublished}>
                <Save size={14} aria-hidden="true" />
                {t('adminExamSaveAction')}
              </Button>
              <Button onClick={handleSubmitReview} disabled={submitting || isPublished || draft.status === 'pending_review'}>
                <Send size={14} aria-hidden="true" />
                {t('adminExamSubmitForReview')}
              </Button>
            </div>
          </div>

          {isPublished ? (
            <Alert variant="warning">{t('adminExamEditorPublishedLock')}</Alert>
          ) : null}

          <div className={styles.stepper}>
            {([
              ['setup', 'adminExamStepSetup'],
              ['questions', 'adminExamStepQuestions'],
              ['review', 'adminExamStepReview'],
            ] as const).map(([step, label]) => (
              <button
                key={step}
                type="button"
                className={`${styles.stepItem} ${editorStep === step ? styles.stepItemActive : ''}`}
                onClick={() => setEditorStep(step)}
              >
                <span className={styles.stepText}>{t(label)}</span>
              </button>
            ))}
          </div>

          <div className={styles.examSummaryGrid}>
            <div className={styles.examSummaryCard}>
              <span>{t('adminExamFixedDuration')}</span>
              <strong>{Math.round(120)}</strong>
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
              <strong>{validationSnapshot?.verifiedQuestions ?? 0}</strong>
            </div>
          </div>

          {editorStep === 'setup' ? (
            <div className={styles.examEditorMain}>
              <section className={styles.editorPanel}>
                <div className={styles.rowHeader}>
                  <h4>{t('adminExamStepSetup')}</h4>
                  <span className={styles.stepHintInline}>{t('adminExamSetupStepHint')}</span>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>{t('adminSubject')}</span>
                    {subjectIdFilter ? (
                      <input
                        className={styles.input}
                        value={subjectTitleById.get(subjectIdFilter) ?? draft.subjectId}
                        readOnly
                      />
                    ) : (
                      <select
                        className={styles.sectionSelect}
                        value={draft.subjectId}
                        onChange={(event) => patchDraft((current) => ({ ...current, subjectId: event.target.value, validation: null }))}
                      >
                        <option value="">{t('adminContentSelectSubjectPlaceholder')}</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>{subject.title}</option>
                        ))}
                      </select>
                    )}
                  </label>

                  <label className={styles.field}>
                    <span>{t('adminContentSectionTitle')}</span>
                    {sectionTypeLock ? (
                      <input
                        className={styles.input}
                        value={sectionTypeLock === 'milliy'
                          ? 'Milliy sertifikat'
                          : sectionTypeLock === 'general'
                            ? 'Umumiy'
                            : 'Attestatsiya'}
                        readOnly
                      />
                    ) : (
                      <select
                        className={styles.sectionSelect}
                        value={draft.sectionType}
                        onChange={(event) => patchDraft((current) => ({ ...current, sectionType: event.target.value as SectionType, validation: null }))}
                      >
                        <option value="">{t('adminExamQuestionSectionNone')}</option>
                        <option value="attestation">Attestatsiya</option>
                        <option value="general">Umumiy</option>
                        <option value="milliy">Milliy sertifikat</option>
                      </select>
                    )}
                  </label>

                  <label className={styles.fieldWide}>
                    <span>{t('adminExamImportExamTitle')}</span>
                    <input
                      className={styles.input}
                      value={draft.title}
                      onChange={(event) => patchDraft((current) => ({ ...current, title: event.target.value, validation: null }))}
                    />
                  </label>

                  <label className={styles.fieldWide}>
                    <span>{t('description')}</span>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={draft.description}
                      onChange={(event) => patchDraft((current) => ({ ...current, description: event.target.value, validation: null }))}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>{t('adminExamImportRequiredQuestions')}</span>
                    <select
                      className={styles.sectionSelect}
                      value={String(draft.requiredQuestionCount)}
                      onChange={(event) => patchDraft((current) => ({
                        ...current,
                        requiredQuestionCount: Number(event.target.value) as 35 | 45 | 50,
                        validation: null,
                      }))}
                    >
                      <option value="35">35</option>
                      <option value="45">45</option>
                      <option value="50">50</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>{t('priceLabel')}</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={String(draft.priceUzs)}
                      onChange={(event) => patchDraft((current) => ({
                        ...current,
                        priceUzs: Number(event.target.value) || 0,
                        validation: null,
                      }))}
                    />
                  </label>
                </div>

                <label className={styles.examToggle}>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) => patchDraft((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>{t('adminExamVisibilityLabel')}</span>
                </label>

                <details className={styles.examSectionBoard} open>
                  <summary>{t('adminExamSectionsTitle')}</summary>
                  <p className={styles.detailsHint}>{t('adminExamSectionsOptionalHint')}</p>

                  <div className={styles.examSectionList}>
                    {draft.blocks.length === 0 ? (
                      <p className={styles.sectionEditorEmpty}>{t('adminExamSectionsEmpty')}</p>
                    ) : draft.blocks.map((block, index) => (
                      <div key={`${block.blockOrder}-${index}`} className={styles.examSectionItem}>
                        <div className={styles.sectionOrderPill}>#{index + 1}</div>
                        <label className={styles.field}>
                          <span>{t('adminExamSectionTitle')}</span>
                          <input
                            className={styles.input}
                            value={block.title}
                            onChange={(event) => patchDraft((current) => ({
                              ...current,
                              blocks: current.blocks.map((entry, blockIndex) => (
                                blockIndex === index
                                  ? { ...entry, title: event.target.value }
                                  : entry
                              )),
                            }))}
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.iconDangerBtn}
                          onClick={() => patchDraft((current) => ({
                            ...current,
                            blocks: current.blocks.filter((_, blockIndex) => blockIndex !== index),
                            questions: current.questions.map((question) => (
                              question.blockOrder === block.blockOrder
                                ? { ...question, blockOrder: null }
                                : question
                            )),
                          }))}
                          aria-label={t('adminContentActionDelete')}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button variant="ghost" size="sm" onClick={handleAddSection}>
                    <PlusCircle size={14} aria-hidden="true" />
                    {t('adminExamAddSection')}
                  </Button>
                </details>
              </section>
            </div>
          ) : null}

          {editorStep === 'questions' ? (
            <div className={styles.quizBuilderGrid}>
              <section className={styles.questionRail}>
                <div className={styles.railHead}>
                  <h4>{t('adminExamQuestionRailTitle')}</h4>
                </div>
                <p className={styles.stepHintInline}>{t('adminExamQuestionRailHint')}</p>

                <div className={styles.questionNavList}>
                  {draft.questions.map((question, index) => {
                    const ready = questionIsComplete(question)
                    return (
                      <button
                        key={`${question.id ?? 'draft'}-${question.questionOrder}-${index}`}
                        type="button"
                        className={`${styles.questionNavItem} ${index === activeQuestionIndex ? styles.questionNavItemActive : ''}`}
                        onClick={() => setActiveQuestionIndex(index)}
                      >
                        <strong>{t('adminExamQuestionItem').replace('{index}', String(index + 1))}</strong>
                        <span>{question.promptText.trim() || t('adminExamQuestionUntitled')}</span>
                        <small>{ready ? t('adminExamQuestionReady') : t('adminExamQuestionNeedsWork')}</small>
                      </button>
                    )
                  })}
                </div>

                <div className={styles.inlineActions}>
                  <Button variant="ghost" size="sm" onClick={handleAddQuestion}>
                    <PlusCircle size={14} aria-hidden="true" />
                    {t('adminContentAddQuestion')}
                  </Button>
                </div>
              </section>

              <section className={styles.editorPanel}>
                <div className={styles.rowHeader}>
                  <h4>{t('adminExamQuestionsTitle')}</h4>
                  <div className={styles.inlineActions}>
                    <Button variant="ghost" size="sm" onClick={handleInsertNextQuestion}>
                      {t('adminExamInsertNextQuestion')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDuplicateQuestion}>
                      {t('adminExamDuplicateQuestion')}
                    </Button>
                  </div>
                </div>

                {!activeQuestion ? (
                  <div className={styles.emptyState}>{t('adminExamQuestionSelectHint')}</div>
                ) : (
                  <div className={styles.questionEditor}>
                    <div className={styles.mathToolbar} role="toolbar" aria-label={t('adminExamMathToolbar')}>
                      {MATH_SYMBOLS.map((item, index) => (
                        'sep' in item ? (
                          <span key={`sep-${index}`} className={styles.mathToolbarSep} />
                        ) : (
                          <button
                            key={`${item.label}-${index}`}
                            type="button"
                            className={styles.mathToolbarBtn}
                            title={item.title}
                            onClick={() => insertPromptSymbol(item.label, item.snippet)}
                          >
                            {item.label}
                          </button>
                        )
                      ))}
                    </div>

                    <label className={styles.fieldWide}>
                      <span>{t('adminContentQuestionText')}</span>
                      <textarea
                        ref={promptRef}
                        aria-label={t('adminContentQuestionText')}
                        className={styles.textarea}
                        rows={4}
                        value={activeQuestion.promptText}
                        onChange={(event) => patchQuestion({ promptText: event.target.value })}
                      />
                    </label>

                    {activeQuestion.promptText ? (
                      <div className={styles.mathPreviewBox}>
                        <span className={styles.mathPreviewLabel}>{t('adminExamLivePreview')}</span>
                        <div className={styles.mathPreviewContent}>
                          <MathText>{activeQuestion.promptText}</MathText>
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        <span>{t('adminExamQuestionSection')}</span>
                        <select
                          className={styles.sectionSelect}
                          value={activeQuestion.blockOrder ?? ''}
                          onChange={(event) => patchQuestion({
                            blockOrder: event.target.value ? Number(event.target.value) : null,
                          })}
                        >
                          <option value="">{t('adminExamQuestionSectionNone')}</option>
                          {draft.blocks.map((block) => (
                            <option key={block.blockOrder} value={block.blockOrder}>
                              {block.title || t('adminExamSectionDefaultLabel').replace('{index}', String(block.blockOrder))}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.field}>
                        <span>{t('adminExamQuestionDifficulty')}</span>
                        <select
                          className={styles.sectionSelect}
                          value={activeQuestion.difficulty}
                          onChange={(event) => patchQuestion({ difficulty: event.target.value as QuestionDifficulty })}
                        >
                          <option value="">{t('adminExamQuestionDifficultyUnset')}</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </label>

                      <label className={styles.field}>
                        <span>{t('adminExamImportSourceType')}</span>
                        <select
                          className={styles.sectionSelect}
                          value={activeQuestion.formatType}
                          onChange={(event) => patchQuestion({
                            formatType: event.target.value as QuestionFormatType,
                            keyVerified: false,
                          })}
                        >
                          <option value="MCQ4">MCQ</option>
                          <option value="MCQ8">MCQ / Matching</option>
                          <option value="WRITTEN">Written</option>
                        </select>
                      </label>

                      <label className={styles.field}>
                        <span>{t('adminContentQuestionImageUrl')}</span>
                        <input
                          className={styles.input}
                          value={activeQuestion.imageUrl}
                          onChange={(event) => patchQuestion({ imageUrl: event.target.value })}
                        />
                      </label>
                    </div>

                    {isMcqFormat(activeQuestion.formatType) ? (
                      <>
                        <div className={styles.examOptionList}>
                          {activeQuestion.options.map((option, optionIndex) => (
                            <div key={`${activeQuestion.questionOrder}-${optionIndex}`} className={styles.examOptionRow}>
                              <label className={styles.optionCorrectPick}>
                                <input
                                  type="radio"
                                  name="exam-correct-option"
                                  checked={activeQuestion.correctIndex === optionIndex}
                                  onChange={() => patchQuestion({ correctIndex: optionIndex, keyVerified: false })}
                                />
                                <span>{String.fromCharCode(65 + optionIndex)}</span>
                              </label>

                              <input
                                className={styles.input}
                                value={option}
                                onChange={(event) => patchQuestion({
                                  options: activeQuestion.options.map((entry, index) => (
                                    index === optionIndex ? event.target.value : entry
                                  )),
                                  keyVerified: false,
                                })}
                              />

                              <button
                                type="button"
                                className={styles.iconDangerBtn}
                                onClick={() => patchQuestion({
                                  options: activeQuestion.options.length <= 2
                                    ? activeQuestion.options
                                    : activeQuestion.options.filter((_, index) => index !== optionIndex),
                                  correctIndex: activeQuestion.correctIndex >= optionIndex && activeQuestion.correctIndex > 0
                                    ? activeQuestion.correctIndex - 1
                                    : activeQuestion.correctIndex,
                                  keyVerified: false,
                                })}
                                disabled={activeQuestion.options.length <= 2}
                                aria-label={t('adminContentDeleteOption')}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className={styles.inlineActions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => patchQuestion({
                              options: [...activeQuestion.options, ''],
                              formatType: activeQuestion.options.length + 1 > 4 ? 'MCQ8' : activeQuestion.formatType,
                              keyVerified: false,
                            })}
                          >
                            <PlusCircle size={14} aria-hidden="true" />
                            {t('adminContentAddOption')}
                          </Button>
                        </div>

                        {activeQuestion.options.some((option) => option.trim()) ? (
                          <div className={styles.mathPreviewBox}>
                            <span className={styles.mathPreviewLabel}>{t('adminExamOptionsLivePreview')}</span>
                            <div className={styles.mathPreviewContent}>
                              {activeQuestion.options.map((option, optionIndex) => option.trim() ? (
                                <div key={`preview-${optionIndex}`} className={styles.mathPreviewOption}>
                                  <strong>{String.fromCharCode(65 + optionIndex)}.</strong> <MathText>{option}</MathText>
                                </div>
                              ) : null)}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <label className={styles.fieldWide}>
                        <span>{t('adminExamImportCorrectAnswer')}</span>
                        <textarea
                          className={styles.textarea}
                          rows={4}
                          value={activeQuestion.writtenAnswer}
                          onChange={(event) => patchQuestion({ writtenAnswer: event.target.value, keyVerified: false })}
                        />
                      </label>
                    )}

                    <details className={styles.advancedDetails}>
                      <summary>{t('adminExamQuestionAdvancedTitle')}</summary>
                      <p className={styles.detailsHint}>{t('adminExamQuestionAdvancedHint')}</p>

                      <div className={styles.formGrid}>
                        <label className={styles.fieldWide}>
                          <span>{t('adminExamQuestionSource')}</span>
                          <input
                            className={styles.input}
                            value={activeQuestion.sourceRef}
                            onChange={(event) => patchQuestion({ sourceRef: event.target.value })}
                          />
                        </label>

                        <label className={styles.fieldWide}>
                          <span>{t('adminExamQuestionExplanation')}</span>
                          <textarea
                            className={styles.textarea}
                            rows={3}
                            value={activeQuestion.explanation}
                            onChange={(event) => patchQuestion({ explanation: event.target.value })}
                          />
                        </label>
                      </div>
                    </details>

                    <label className={styles.examToggle}>
                      <input
                        type="checkbox"
                        checked={activeQuestion.keyVerified}
                        onChange={(event) => patchQuestion({ keyVerified: event.target.checked })}
                      />
                      <span>{t('adminExamImportKeyVerification')}</span>
                    </label>

                    <div className={styles.inlineActions}>
                      <Button variant="danger" size="sm" onClick={handleRemoveQuestion} disabled={draft.questions.length <= 1}>
                        <Trash2 size={14} aria-hidden="true" />
                        {t('adminContentDeleteQuestion')}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {editorStep === 'review' ? (
            <div className={styles.examEditorGrid}>
              <section className={styles.editorPanel}>
                <div className={styles.rowHeader}>
                  <h4>{t('adminExamChecklistTitle')}</h4>
                </div>

                <div className={styles.validationChecklist}>
                  <ul className={styles.validationChecklistList}>
                    {checklist.map((item) => (
                      <li
                        key={item.label}
                        className={`${styles.validationChecklistItem} ${item.valid ? styles.validationChecklistItemValid : ''}`}
                      >
                        {item.valid ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.validationBox}>
                  <h5>
                    <ShieldAlert size={14} aria-hidden="true" />
                    {t('adminExamValidationSummary')
                      .replace('{verified}', String(validationSnapshot?.verifiedQuestions ?? 0))
                      .replace('{questions}', String(draft.questions.length))}
                  </h5>
                </div>
              </section>

              <section className={styles.previewPanel}>
                <div className={styles.rowHeader}>
                  <h4>{t('adminExamProgressTitle')}</h4>
                </div>

                {workspaceIssues.length === 0 ? (
                  <p className={styles.validState}>
                    <CircleCheckBig size={14} aria-hidden="true" />
                    {t('adminExamProgressReady')}
                  </p>
                ) : (
                  <div className={styles.reviewActionList}>
                    {workspaceIssues.map((issue, index) => (
                      <div key={`${issue.code}-${issue.message}-${index}`} className={styles.reviewActionCard}>
                        <div>
                          <strong>{issue.message}</strong>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => jumpToIssue(issue)}>
                          {issue.questionIndex != null ? t('adminExamFixQuestion') : issue.step === 'setup' ? t('adminExamGoToSetup') : t('adminExamGoToQuestions')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </section>
      )}
    </section>
  )
}
