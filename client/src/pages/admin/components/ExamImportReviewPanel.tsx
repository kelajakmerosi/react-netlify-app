import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Alert } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { GlassCard } from '../../../components/ui/GlassCard'
import { useLang } from '../../../hooks'
import examService from '../../../services/exam.service'
import { resolveUiErrorMessage } from '../../../utils/errorPresentation'
import styles from '../AdminWorkspace.module.css'

interface SubjectItem {
  id: string
  title: string
}

interface ExamImportReviewPanelProps {
  subjects: SubjectItem[]
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface TeacherQuestion {
  id: string
  promptText: string
  options: string[]
  correctIndex: number
  keyVerified: boolean
}

export default function ExamImportReviewPanel({
  subjects,
  onSuccess,
  onError,
}: ExamImportReviewPanelProps): JSX.Element {
  const { t } = useLang()
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [sourcePath, setSourcePath] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<'docx' | 'pdf'>('docx')
  const [title, setTitle] = useState(() => t('adminExamImportDefaultTitle'))
  const [requiredQuestionCount, setRequiredQuestionCount] = useState<35 | 50>(35)
  const [importing, setImporting] = useState(false)
  const [examId, setExamId] = useState('')
  const [validation, setValidation] = useState<{
    valid: boolean
    requiredQuestionCount: number
    questionCount: number
    verifiedQuestions: number
    issues: Array<{ code: string; message: string }>
  } | null>(null)
  const [questions, setQuestions] = useState<TeacherQuestion[]>([])
  const [savingQuestionId, setSavingQuestionId] = useState('')

  const missingFields = !subjectId || !title.trim() || (!sourceFile && !sourcePath.trim())

  useEffect(() => {
    if (subjectId || !subjects.length) return
    setSubjectId(subjects[0].id)
  }, [subjectId, subjects])

  const loadReviewData = async (targetExamId: string) => {
    const [validationPayload, questionPayload] = await Promise.all([
      examService.getTeacherValidation(targetExamId),
      examService.getTeacherQuestions(targetExamId),
    ])
    setValidation(validationPayload)
    setQuestions(questionPayload as TeacherQuestion[])
  }

  const handleImport = async () => {
    if (missingFields) return
    setImporting(true)
    try {
      const imported = await examService.importSource({
        subjectId,
        sourcePath: sourcePath.trim() || undefined,
        file: sourceFile ?? undefined,
        sourceType,
        title: title.trim(),
        requiredQuestionCount,
      })
      setExamId(imported.examId)
      await loadReviewData(imported.examId)
      onSuccess(`${t('adminExamImportSuccess')}: ${imported.examId}`)
    } catch (err) {
      onError(resolveUiErrorMessage(err, t, 'adminExamImportFailed'))
    } finally {
      setImporting(false)
    }
  }

  const handleUpdateQuestion = async (question: TeacherQuestion, patch: Partial<TeacherQuestion>) => {
    if (!examId) return
    setSavingQuestionId(question.id)
    try {
      const nextCorrect = patch.correctIndex ?? question.correctIndex
      const nextVerified = patch.keyVerified ?? question.keyVerified
      const updated = await examService.updateQuestionKey(examId, question.id, {
        correctIndex: nextCorrect,
        keyVerified: nextVerified,
      })
      setValidation(updated.validation)
      setQuestions((prev) => prev.map((entry) => (entry.id === question.id
        ? { ...entry, correctIndex: nextCorrect, keyVerified: nextVerified }
        : entry)))
      onSuccess(t('adminExamKeyUpdated'))
    } catch (err) {
      onError(resolveUiErrorMessage(err, t, 'adminExamKeyUpdateFailed'))
    } finally {
      setSavingQuestionId('')
    }
  }

  const handleSubmitReview = async () => {
    if (!examId) return
    try {
      await examService.submitReview(examId)
      onSuccess(t('adminExamSubmitReviewSuccess'))
    } catch (err) {
      onError(resolveUiErrorMessage(err, t, 'adminExamSubmitReviewFailed'))
    }
  }

  const reviewProgress = useMemo(() => {
    if (!validation) return ''
    return `${validation.verifiedQuestions}/${validation.requiredQuestionCount}`
  }, [validation])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null
    setSourceFile(nextFile)
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    if (lower.endsWith('.pdf')) setSourceType('pdf')
    if (lower.endsWith('.docx')) setSourceType('docx')
  }

  return (
    <GlassCard padding={16} className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{t('adminExamImportTitle')}</h3>
          <p className={styles.sectionSubtitle}>{t('adminExamImportSubtitle')}</p>
        </div>
      </div>

      <div className={styles.sectionBody}>
        <div className={styles.quickOps}>
          <Input label={t('adminExamImportExamTitle')} value={title} onChange={(event) => setTitle(event.target.value)} />
          <Select label={t('adminSubject')} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.title}</option>
            ))}
          </Select>
          <Select label={t('adminExamImportSourceType')} value={sourceType} onChange={(event) => setSourceType(event.target.value as 'docx' | 'pdf')}>
            <option value="docx">DOCX</option>
            <option value="pdf">PDF</option>
          </Select>
        </div>

        <div className={styles.quickOps} style={{ marginTop: 10 }}>
          <Input
            label={t('adminExamImportSourceFile')}
            type="file"
            accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            helperText={sourceFile ? `${t('adminExamImportSelectedFile')}: ${sourceFile.name}` : t('adminExamImportChooseHint')}
          />
          <Input
            label={t('adminExamImportSourcePath')}
            value={sourcePath}
            onChange={(event) => setSourcePath(event.target.value)}
            helperText={t('adminExamImportSourcePathHint')}
          />
          <Select
            label={t('adminExamImportRequiredQuestions')}
            value={String(requiredQuestionCount)}
            onChange={(event) => setRequiredQuestionCount(Number(event.target.value) as 35 | 50)}
          >
            <option value="35">35</option>
            <option value="50">50</option>
          </Select>
          <div className={styles.actionsRow}>
            <Button onClick={() => void handleImport()} disabled={missingFields || importing}>
              {importing ? t('adminExamImportImporting') : t('adminExamImportAction')}
            </Button>
            {examId ? (
              <Button variant="ghost" onClick={() => void loadReviewData(examId)}>
                {t('adminExamImportRefreshValidation')}
              </Button>
            ) : null}
          </div>
        </div>

        {examId ? <Alert variant="info">{t('adminExamImportExamId')}: {examId}</Alert> : null}
        {validation ? (
          <Alert variant={validation.valid ? 'success' : 'warning'}>
            {t('adminExamImportValidation')}: {validation.valid ? t('adminExamImportReady') : t('adminExamImportNeedsFixes')}
            {' '}| {t('adminExamImportQuestions')}: {validation.questionCount}/{validation.requiredQuestionCount}
            {' '}| {t('adminExamImportVerifiedKeys')}: {reviewProgress}
          </Alert>
        ) : null}

        {validation && !validation.valid && validation.issues.length > 0 ? (
          <GlassCard padding={12}>
            <ul>
              {validation.issues.slice(0, 8).map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>
                  {issue.message}
                </li>
              ))}
            </ul>
          </GlassCard>
        ) : null}

        {questions.length > 0 ? (
          <div className={styles.sectionGrid}>
            {questions.map((question, index) => (
              <GlassCard key={question.id} padding={12} className={styles.sectionCard}>
                <p><strong>{t('adminExamImportQuestion')} {index + 1}:</strong> {question.promptText}</p>
                <div className={styles.quickOps}>
                  <Select
                    label={t('adminExamImportCorrectAnswer')}
                    value={String(question.correctIndex)}
                    onChange={(event) => void handleUpdateQuestion(question, { correctIndex: Number(event.target.value) })}
                    disabled={savingQuestionId === question.id}
                  >
                    {question.options.map((option, optionIndex) => (
                      <option key={`${question.id}-${optionIndex}`} value={optionIndex}>
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={t('adminExamImportKeyVerification')}
                    value={question.keyVerified ? 'verified' : 'pending'}
                    onChange={(event) => void handleUpdateQuestion(question, { keyVerified: event.target.value === 'verified' })}
                    disabled={savingQuestionId === question.id}
                  >
                    <option value="pending">{t('adminExamImportPending')}</option>
                    <option value="verified">{t('adminExamImportVerified')}</option>
                  </Select>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : null}

        {validation ? (
          <div className={styles.actionsRow}>
            <Button onClick={() => void handleSubmitReview()} disabled={!validation.valid}>
              {t('adminExamSubmitForReview')}
            </Button>
          </div>
        ) : null}
      </div>
    </GlassCard>
  )
}
