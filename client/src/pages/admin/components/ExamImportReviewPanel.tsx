import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AlertCircle, FileUp, ShieldCheck } from 'lucide-react'
import { Alert } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { useLang } from '../../../hooks'
import examService from '../../../services/exam.service'
import { resolveUiErrorMessage } from '../../../utils/errorPresentation'
import styles from '../content/ContentBuilder.module.css'

interface SubjectItem {
  id: string
  title: string
}

interface ExamImportReviewPanelProps {
  subjects: SubjectItem[]
}

interface TeacherQuestion {
  id: string
  promptText: string
  options: string[]
  correctIndex: number
  keyVerified: boolean
}

type Notice = { type: 'error' | 'success'; message: string } | null

export default function ExamImportReviewPanel({
  subjects,
}: ExamImportReviewPanelProps): JSX.Element {
  const { t } = useLang()
  const hasSubjects = subjects.length > 0
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
  const [notice, setNotice] = useState<Notice>(null)

  const missingFields = !hasSubjects || !subjectId || !title.trim() || (!sourceFile && !sourcePath.trim())

  useEffect(() => {
    if (subjectId || !subjects.length) return
    setSubjectId(subjects[0].id)
  }, [subjectId, subjects])

  const reviewProgress = useMemo(() => {
    if (!validation) return ''
    return `${validation.verifiedQuestions}/${validation.requiredQuestionCount}`
  }, [validation])

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
    setNotice(null)
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
      setNotice({ type: 'success', message: `${t('adminExamImportSuccess')}: ${imported.examId}` })
    } catch (error) {
      setNotice({ type: 'error', message: resolveUiErrorMessage(error, t, 'adminExamImportFailed') })
    } finally {
      setImporting(false)
    }
  }

  const handleUpdateQuestion = async (question: TeacherQuestion, patch: Partial<TeacherQuestion>) => {
    if (!examId) return
    setSavingQuestionId(question.id)
    setNotice(null)
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
      setNotice({ type: 'success', message: t('adminExamKeyUpdated') })
    } catch (error) {
      setNotice({ type: 'error', message: resolveUiErrorMessage(error, t, 'adminExamKeyUpdateFailed') })
    } finally {
      setSavingQuestionId('')
    }
  }

  const handleSubmitReview = async () => {
    if (!examId) return
    setNotice(null)
    try {
      await examService.submitReview(examId)
      setNotice({ type: 'success', message: t('adminExamSubmitReviewSuccess') })
    } catch (error) {
      setNotice({ type: 'error', message: resolveUiErrorMessage(error, t, 'adminExamSubmitReviewFailed') })
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null
    setSourceFile(nextFile)
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    if (lower.endsWith('.pdf')) setSourceType('pdf')
    if (lower.endsWith('.docx')) setSourceType('docx')
  }

  return (
    <section className={styles.contentPane}>
      {notice ? <Alert variant={notice.type === 'error' ? 'warning' : 'success'}>{notice.message}</Alert> : null}
      {!hasSubjects ? <Alert variant="info">{t('adminExamNoSubjectAccess')}</Alert> : null}

      <section className={styles.inventorySection}>
        <div className={styles.inventoryHeader}>
          <div>
            <p className={styles.commandDeckEyebrow}>{t('adminContentSubtabImports')}</p>
            <h3 className={styles.inventoryTitle}>{t('adminExamImportsTabTitle')}</h3>
            <p className={styles.inventorySubtitle}>{t('adminExamImportsTabSubtitle')}</p>
          </div>
        </div>

        <div className={styles.inventoryGrid}>
          <section className={`${styles.inventoryCard} ${styles.inventoryCardCreate} ${styles.importCardFix}`}>
            <div className={styles.rowHeader}>
              <div>
                <h4>{t('adminExamImportTitle')}</h4>
                <p className={styles.inventorySubtitle}>{t('adminExamImportSubtitle')}</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <Input label={t('adminExamImportExamTitle')} value={title} onChange={(event) => setTitle(event.target.value)} />
              <Select label={t('adminSubject')} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                {!hasSubjects ? <option value="">{t('adminContentSelectSubjectPlaceholder')}</option> : null}
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.title}</option>
                ))}
              </Select>
              <Select label={t('adminExamImportSourceType')} value={sourceType} onChange={(event) => setSourceType(event.target.value as 'docx' | 'pdf')}>
                <option value="docx">DOCX</option>
                <option value="pdf">PDF</option>
              </Select>
              <Select
                label={t('adminExamImportRequiredQuestions')}
                value={String(requiredQuestionCount)}
                onChange={(event) => setRequiredQuestionCount(Number(event.target.value) as 35 | 50)}
              >
                <option value="35">35</option>
                <option value="50">50</option>
              </Select>
              <Input
                label={t('adminExamImportSourceFile')}
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                helperText={sourceFile ? `${t('adminExamImportSelectedFile')}: ${sourceFile.name}` : t('adminExamImportChooseHint')}
                fieldClassName={styles.fieldWide}
              />
            </div>

            <details className={styles.advancedDetails}>
              <summary>{t('adminExamImportAdvanced')}</summary>
              <div className={styles.formGrid}>
                <Input
                  label={t('adminExamImportSourcePath')}
                  value={sourcePath}
                  onChange={(event) => setSourcePath(event.target.value)}
                  helperText={t('adminExamImportSourcePathHint')}
                  fieldClassName={styles.fieldWide}
                />
              </div>
            </details>

            <div className={styles.commandCardActions}>
              <Button onClick={() => void handleImport()} disabled={missingFields || importing}>
                <FileUp size={14} aria-hidden="true" />
                {importing ? t('adminExamImportImporting') : t('adminExamImportAction')}
              </Button>
              {examId ? (
                <Button variant="ghost" onClick={() => void loadReviewData(examId)}>
                  {t('adminExamImportRefreshValidation')}
                </Button>
              ) : null}
            </div>
          </section>

          <section className={styles.inventoryCard}>
            <div className={styles.inventoryBody}>
              <div className={styles.rowHeader}>
                <div>
                  <h4>{t('adminExamImportReviewTitle')}</h4>
                  <p className={styles.inventorySubtitle}>{t('adminExamImportReviewSubtitle')}</p>
                </div>
              </div>

              {!examId ? (
                <div className={styles.workspaceEmptyCard}>
                  <p className={styles.commandDeckEyebrow}>{t('adminExamImportTitle')}</p>
                  <h3 className={styles.commandDeckTitle}>{t('adminExamImportIdleTitle')}</h3>
                  <p className={styles.commandDeckSubtitle}>{t('adminExamImportIdleHint')}</p>
                </div>
              ) : (
                <div className={styles.importReviewStack}>
                  <Alert variant="info">{t('adminExamImportExamId')}: {examId}</Alert>

                  {validation ? (
                    <Alert variant={validation.valid ? 'success' : 'warning'}>
                      {t('adminExamImportValidation')}: {validation.valid ? t('adminExamImportReady') : t('adminExamImportNeedsFixes')}
                      {' '}| {t('adminExamImportQuestions')}: {validation.questionCount}/{validation.requiredQuestionCount}
                      {' '}| {t('adminExamImportVerifiedKeys')}: {reviewProgress}
                    </Alert>
                  ) : null}

                  {validation && !validation.valid && validation.issues.length > 0 ? (
                    <div className={styles.validationChecklist}>
                      <div className={styles.rowHeader}>
                        <h4>{t('adminExamChecklistTitle')}</h4>
                        <span className={styles.stepHintInline}>
                          <AlertCircle size={14} aria-hidden="true" />
                          {t('adminExamSubmitBlocked')}
                        </span>
                      </div>
                      <ul className={styles.issueList}>
                        {validation.issues.slice(0, 8).map((issue) => (
                          <li key={`${issue.code}-${issue.message}`}>
                            <AlertCircle size={14} aria-hidden="true" />
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {questions.length > 0 ? (
                    <div className={styles.importQuestionGrid}>
                      {questions.map((question, index) => (
                        <article key={question.id} className={styles.importQuestionCard}>
                          <p><strong>{t('adminExamImportQuestion')} {index + 1}:</strong> {question.promptText}</p>
                          <div className={styles.formGrid}>
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
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {validation ? (
                    <div className={styles.commandCardActions}>
                      <Button onClick={() => void handleSubmitReview()} disabled={!validation.valid}>
                        <ShieldCheck size={14} aria-hidden="true" />
                        {t('adminExamSubmitForReview')}
                      </Button>
                      <Button variant="ghost" onClick={() => { setExamId(''); setValidation(null); setQuestions([]); }}>
                        {t('adminCancel')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </section>
  )
}
