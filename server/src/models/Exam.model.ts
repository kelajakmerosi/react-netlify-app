import { pool } from '../config/db'

export interface ExamQuestion {
  id?: string;
  promptText: string;
  promptRich?: any;
  imageUrl?: string | null;
  options: string[];
  correctIndex?: number | null;
  explanation?: string | null;
  difficulty?: string | null;
  sourceRef?: string | null;
  keyVerified?: boolean;
  blockOrder?: number;
  questionOrder?: number;
  blockTitle?: string | null;
  formatType?: string;
  writtenAnswer?: string | null;
}

export interface ExamEntity {
  id: string;
  subjectId: string;
  ownerUserId: string;
  title: string;
  description: string;
  durationSec: number;
  passPercent: number;
  requiredQuestionCount: number;
  status: string;
  priceUzs: number;
  isActive: boolean;
  approvedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  topicId?: string | null;
  sectionType?: string | null;
  purchased?: boolean;
  attemptsRemaining?: number;
  subjectTitle?: string | null;
  questionCount?: number;
  verifiedQuestions?: number;
}

export interface ExamAttempt {
  id: string;
  entitlementId: string;
  userId: string;
  examId: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  correctCount: number | null;
  totalQuestions: number | null;
  scorePercent: number | null;
  passed: boolean | null;
  snapshot: any;
  createdAt: string;
  examTitle?: string;
}


const toNumber = (value: any): number => Number(value || 0)
const FIXED_EXAM_DURATION_SEC = 120 * 60
const FIXED_EXAM_PASS_PERCENT = 80
const DEFAULT_REQUIRED_EXAM_QUESTION_COUNT = 50

const normalizeQuestion = (question: any, idx: number): ExamQuestion => ({
  id: question.id,
  promptText: question.promptText,
  promptRich: question.promptRich || {},
  imageUrl: question.imageUrl || null,
  options: Array.isArray(question.options) ? question.options : [],
  correctIndex: question.correctIndex != null ? Number(question.correctIndex) : null,
  explanation: question.explanation || null,
  difficulty: question.difficulty || null,
  sourceRef: question.sourceRef || null,
  keyVerified: question.keyVerified === undefined ? true : Boolean(question.keyVerified),
  blockOrder: Number(question.blockOrder || 0),
  questionOrder: Number(question.questionOrder || idx + 1),
  blockTitle: question.blockTitle || null,
  formatType: question.formatType || 'MCQ4',
  writtenAnswer: question.writtenAnswer || null,
})

const mapExam = (row: any): ExamEntity | null => {
  if (!row) return null
  return {
    id: row.id,
    subjectId: row.subject_id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description || '',
    durationSec: row.duration_sec,
    passPercent: row.pass_percent,
    requiredQuestionCount: row.required_question_count || DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
    status: row.status,
    priceUzs: toNumber(row.price_uzs),
    isActive: Boolean(row.is_active),
    approvedBy: row.approved_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    topicId: row.topic_id || null,
    sectionType: row.section_type || null,
  }
}

const mapAttempt = (row: any): ExamAttempt | null => {
  if (!row) return null
  return {
    id: row.id,
    entitlementId: row.entitlement_id,
    userId: row.user_id,
    examId: row.exam_id,
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    submittedAt: row.submitted_at,
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    scorePercent: row.score_percent,
    passed: Boolean(row.passed),
    snapshot: row.snapshot_json || {},
    createdAt: row.created_at,
  }
}

const canTransitionStatus = (currentStatus: string | null, nextStatus: string | null): boolean => {
  if (!currentStatus || !nextStatus) return false
  if (currentStatus === nextStatus) return true

  const transitions: Record<string, Set<string>> = {
    draft: new Set(['pending_review', 'archived']),
    pending_review: new Set(['published', 'draft', 'archived']),
    published: new Set(['archived']),
    archived: new Set(['draft']),
  }

  return Boolean(transitions[currentStatus]?.has(nextStatus))
}

const createDraft = async ({

  subjectId,
  topicId = null,
  sectionType = null,
  ownerUserId,
  title,
  description = '',
  priceUzs = 0,
  requiredQuestionCount = DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
}: any): Promise<ExamEntity | null> => {
  const safeDurationSec = FIXED_EXAM_DURATION_SEC
  const safePassPercent = FIXED_EXAM_PASS_PERCENT
  const { rows } = await pool.query(
    `INSERT INTO exams (subject_id, topic_id, section_type, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, TRUE)
     RETURNING id, subject_id, topic_id, section_type, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at`,
    [subjectId, topicId, sectionType, ownerUserId, title, description, safeDurationSec, safePassPercent, requiredQuestionCount, priceUzs],
  )

  return mapExam(rows[0])
}

const getById = async (id: string | number): Promise<ExamEntity | null> => {
  const { rows } = await pool.query(
    `SELECT id, subject_id, topic_id, section_type, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at
     FROM exams
     WHERE id = $1
     LIMIT 1`,
    [id],
  )

  return mapExam(rows[0])
}

const listManaged = async ({ userId, subjectIds = [], isSuperadmin = false }: any = {}): Promise<ExamEntity[]> => {
  const params = []
  const where = []

  if (!isSuperadmin) {
    params.push(userId)
    const ownerClause = `e.owner_user_id = $${params.length}`

    if (subjectIds.length > 0) {
      params.push(subjectIds)
      where.push(`(${ownerClause} OR e.subject_id = ANY($${params.length}::text[]))`)
    } else {
      where.push(ownerClause)
    }
  }

  const { rows } = await pool.query(
    `SELECT
       e.id,
       e.subject_id,
       e.topic_id,
       e.section_type,
       e.owner_user_id,
       e.title,
       e.description,
       e.duration_sec,
       e.pass_percent,
       e.required_question_count,
       e.status,
       e.price_uzs,
       e.is_active,
       e.approved_by,
       e.published_at,
       e.created_at,
       e.updated_at,
       s.title AS subject_title,
       COALESCE(q.question_count, 0)::int AS question_count,
       COALESCE(q.verified_count, 0)::int AS verified_count
     FROM exams e
     LEFT JOIN subjects s ON s.id::text = e.subject_id
     LEFT JOIN (
       SELECT
         exam_id,
         COUNT(*)::int AS question_count,
         COUNT(*) FILTER (WHERE key_verified)::int AS verified_count
       FROM exam_questions
       GROUP BY exam_id
     ) q ON q.exam_id = e.id
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY e.updated_at DESC, e.created_at DESC`,
    params,
  )

  return rows.map((row: any) => ({
    ...(mapExam(row) as ExamEntity),
    subjectTitle: row.subject_title || null,
    questionCount: Number(row.question_count || 0),
    verifiedQuestions: Number(row.verified_count || 0),
  }))
}

const updateDraft = async (id: string | number, patch: any = {}): Promise<ExamEntity | null> => {
  const { rows } = await pool.query(
    `UPDATE exams
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         topic_id = COALESCE($3, topic_id),
         section_type = COALESCE($4, section_type),
         duration_sec = $5,
         pass_percent = $6,
         required_question_count = COALESCE($7, required_question_count),
         price_uzs = COALESCE($8, price_uzs),
         is_active = COALESCE($9, is_active),
         updated_at = NOW()
     WHERE id = $10
     RETURNING id, subject_id, topic_id, section_type, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at`,
    [
      patch.title ?? null,
      patch.description ?? null,
      patch.topicId ?? null,
      patch.sectionType ?? null,
      FIXED_EXAM_DURATION_SEC,
      FIXED_EXAM_PASS_PERCENT,
      patch.requiredQuestionCount ?? null,
      patch.priceUzs ?? null,
      patch.isActive === undefined ? null : Boolean(patch.isActive),
      id,
    ],
  )

  return mapExam(rows[0])
}

const setStatus = async (id: string | number, { status, reviewerId = null }: any): Promise<ExamEntity | null> => {
  const currentRes = await pool.query(
    `SELECT status
     FROM exams
     WHERE id = $1
     LIMIT 1`,
    [id],
  )

  const currentStatus = currentRes.rows[0]?.status
  if (!currentStatus) return null
  if (!canTransitionStatus(currentStatus, status)) return null

  const publishNow = status === 'published'
  const { rows } = await pool.query(
    `UPDATE exams
     SET status = $1,
         approved_by = $2,
         published_at = CASE WHEN $3::boolean THEN NOW() ELSE published_at END,
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, subject_id, topic_id, section_type, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at`,
    [status, reviewerId, publishNow, id],
  )

  return mapExam(rows[0])
}

const listPublishedCatalog = async ({ subjectId, sectionType, userId }: any = {}): Promise<ExamEntity[]> => {
  const params = []
  let subjectClause = ''
  if (subjectId) {
    params.push(subjectId)
    subjectClause = `AND e.subject_id = $${params.length}::text`
  }
  let sectionClause = ''
  if (sectionType) {
    params.push(sectionType)
    sectionClause = `AND e.section_type = $${params.length}`
  }

  let entitlementJoin = ''
  let entitlementSelect = ''
  if (userId) {
    params.push(userId)
    entitlementJoin = `
      LEFT JOIN (
        SELECT exam_id, SUM(attempts_remaining) AS attempts_remaining
        FROM exam_entitlements
        WHERE user_id = $${params.length}
        GROUP BY exam_id
      ) ent ON ent.exam_id = e.id
    `
    entitlementSelect = `, COALESCE(ent.attempts_remaining, 0) > 0 AS purchased, COALESCE(ent.attempts_remaining, 0) AS attempts_remaining`
  }

  const { rows } = await pool.query(
    `SELECT e.id, e.subject_id, e.topic_id, e.section_type, e.owner_user_id, e.title, e.description, e.duration_sec, e.pass_percent, e.required_question_count, e.status, e.price_uzs, e.is_active, e.approved_by, e.published_at, e.created_at, e.updated_at${entitlementSelect}
     FROM exams e
     LEFT JOIN subjects s ON s.id::text = e.subject_id
     ${entitlementJoin}
     WHERE e.status = 'published'
       AND e.is_active = TRUE
       ${subjectClause ? `AND (e.subject_id = $1::text OR s.catalog_key = $1)` : ''}
       ${sectionClause}
     ORDER BY e.created_at DESC`,
    params,
  )

  return rows.map((row: any) => {
    const exam = mapExam(row)
    if (!exam) return null as any
    if (userId) {
      exam.purchased = row.purchased === true
      exam.attemptsRemaining = Number(row.attempts_remaining || 0)
    }
    return exam as ExamEntity
  }).filter(Boolean) as ExamEntity[]
}

const replaceStructure = async ({ examId, blocks = [], questions = [] }: any): Promise<void> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query('DELETE FROM exam_questions WHERE exam_id = $1', [examId])
    await client.query('DELETE FROM exam_blocks WHERE exam_id = $1', [examId])

    const blockIdByOrder = new Map()
    const normalizedBlocks = (blocks || []).map((block: any, idx: number) => ({
      blockOrder: Number(block.blockOrder ?? idx + 1),
      title: String(block.title || `Block ${idx + 1}`),
    }))

    for (const block of normalizedBlocks) {
      const blockRes = await client.query(
        `INSERT INTO exam_blocks (exam_id, block_order, title)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [examId, block.blockOrder, block.title],
      )
      blockIdByOrder.set(block.blockOrder, blockRes.rows[0].id)
    }

    const normalizedQuestions = (questions || []).map(normalizeQuestion)
    for (let idx = 0; idx < normalizedQuestions.length; idx += 1) {
      const q = normalizedQuestions[idx]
      const blockId = q.blockOrder ? blockIdByOrder.get(Number(q.blockOrder)) || null : null

      await client.query(
        `INSERT INTO exam_questions (
          exam_id, block_id, question_order, prompt_text, prompt_rich, image_url,
          options_json, correct_index, key_verified, explanation, difficulty, source_ref,
          format_type, written_answer, updated_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          examId,
          blockId,
          Number(q.questionOrder || idx + 1),
          q.promptText,
          JSON.stringify(q.promptRich || {}),
          q.imageUrl,
          JSON.stringify(q.options || []),
          q.correctIndex != null ? Number(q.correctIndex) : null,
          q.keyVerified === undefined ? true : Boolean(q.keyVerified),
          q.explanation,
          q.difficulty,
          q.sourceRef,
          q.formatType || 'MCQ4',
          q.writtenAnswer || null,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const listQuestions = async (examId: string | number): Promise<ExamQuestion[]> => {
  const { rows } = await pool.query(
    `SELECT
       q.id,
       q.question_order,
       q.prompt_text,
       q.prompt_rich,
       q.image_url,
       q.options_json,
       q.correct_index,
       q.key_verified,
       q.explanation,
       q.difficulty,
       q.source_ref,
       q.format_type,
       q.written_answer,
       b.block_order,
       b.title AS block_title
     FROM exam_questions q
     LEFT JOIN exam_blocks b ON b.id = q.block_id
     WHERE q.exam_id = $1
     ORDER BY COALESCE(b.block_order, 9999) ASC, q.question_order ASC`,
    [examId],
  )

  return rows.map((row: any) => ({
    id: row.id,
    questionOrder: row.question_order,
    promptText: row.prompt_text,
    promptRich: row.prompt_rich || {},
    imageUrl: row.image_url,
    options: Array.isArray(row.options_json) ? row.options_json : [],
    correctIndex: row.correct_index,
    keyVerified: Boolean(row.key_verified),
    explanation: row.explanation,
    difficulty: row.difficulty,
    sourceRef: row.source_ref,
    blockOrder: row.block_order,
    blockTitle: row.block_title,
    formatType: row.format_type || 'MCQ4',
    writtenAnswer: row.written_answer || null,
  }))
}

const updateQuestionKey = async ({ examId, questionId, correctIndex, keyVerified = true }: any): Promise<any> => {
  const { rows } = await pool.query(
    `UPDATE exam_questions
     SET correct_index = $3,
         key_verified = $4,
         updated_at = NOW()
     WHERE exam_id = $1
       AND id = $2
     RETURNING id`,
    [examId, questionId, correctIndex, Boolean(keyVerified)],
  )

  return rows[0] ?? null
}

const buildExamStructureValidation = ({ exam, questions }: { exam: any, questions: any[] }): any => {
  const requiredQuestionCount = Number(
    exam?.required_question_count ?? exam?.requiredQuestionCount ?? DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
  )
  const normalizedRequiredCount = Number.isInteger(requiredQuestionCount) && requiredQuestionCount > 0
    ? requiredQuestionCount
    : DEFAULT_REQUIRED_EXAM_QUESTION_COUNT
  const issues = []
  let verifiedQuestions = 0

  if (questions.length !== normalizedRequiredCount) {
    issues.push({
      code: 'question_count_mismatch',
      message: `Exam requires exactly ${normalizedRequiredCount} questions`,
      details: { required: normalizedRequiredCount, actual: questions.length },
    })
  }

  questions.forEach((question: any) => {
    const order = Number(question.questionOrder || 0)
    const prompt = String(question.promptText || '').trim()
    const formatType = String(question.formatType || 'MCQ4').toUpperCase()
    const options = Array.isArray(question.options) ? question.options : []
    const correctIndex = Number(question.correctIndex)
    const writtenAnswer = String(question.writtenAnswer || '').trim()
    const keyVerified = question.keyVerified === undefined ? true : Boolean(question.keyVerified)

    if (!prompt) {
      issues.push({
        code: 'prompt_missing',
        message: `Question ${order} has an empty prompt`,
        details: { questionId: question.id, questionOrder: order },
      })
    }

    if (formatType === 'WRITTEN') {
      if (writtenAnswer && !keyVerified) {
        issues.push({
          code: 'answer_key_unverified',
          message: `Question ${order} answer key is not verified`,
          details: { questionId: question.id, questionOrder: order },
        })
      } else if (writtenAnswer && keyVerified) {
        verifiedQuestions += 1
      }
    } else {
      if (options.length < 2) {
        issues.push({
          code: 'options_insufficient',
          message: `Question ${order} must have at least two options`,
          details: { questionId: question.id, questionOrder: order },
        })
      }

      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        issues.push({
          code: 'correct_index_invalid',
          message: `Question ${order} has invalid correct answer index`,
          details: { questionId: question.id, questionOrder: order, correctIndex },
        })
      }
    }

    if (formatType !== 'WRITTEN' && !keyVerified) {
      issues.push({
        code: 'answer_key_unverified',
        message: `Question ${order} answer key is not verified`,
        details: { questionId: question.id, questionOrder: order },
      })
    } else if (formatType !== 'WRITTEN') {
      verifiedQuestions += 1
    }
  })

  return {
    valid: issues.length === 0,
    requiredQuestionCount: normalizedRequiredCount,
    questionCount: questions.length,
    verifiedQuestions,
    issues,
  }
}

const normalizeWrittenAnswerValue = (value: any): string => (
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
)

const validateExamStructure = async (examId: string | number): Promise<any> => {
  const exam = await getById(examId)
  if (!exam) {
    return {
      valid: false,
      requiredQuestionCount: DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
      questionCount: 0,
      verifiedQuestions: 0,
      issues: [
        {
          code: 'exam_not_found',
          message: 'Exam not found',
          details: { examId },
        },
      ],
    }
  }

  const questions = await listQuestions(examId)
  return buildExamStructureValidation({ exam, questions })
}

const grantEntitlement = async ({ userId, examId, attemptsTotal = 1, sourcePaymentId }: any): Promise<any> => {
  const { rows } = await pool.query(
    `INSERT INTO exam_entitlements (user_id, exam_id, attempts_total, attempts_used, attempts_remaining, source_payment_id)
     VALUES ($1, $2, $3, 0, $3, $4)
     ON CONFLICT (source_payment_id) DO NOTHING
     RETURNING id, user_id, exam_id, attempts_total, attempts_used, attempts_remaining, source_payment_id, created_at`,
    [userId, examId, attemptsTotal, sourcePaymentId],
  )

  return rows[0] ?? null
}

const startAttempt = async ({ userId, examId }: any): Promise<any> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const examRes = await client.query(
      `SELECT id, subject_id, topic_id, section_type, title, duration_sec, pass_percent, required_question_count, price_uzs, status, is_active
       FROM exams
       WHERE id = $1
       LIMIT 1
       FOR SHARE`,
      [examId],
    )
    const exam = examRes.rows[0]
    if (!exam || exam.status !== 'published' || !exam.is_active) {
      await client.query('ROLLBACK')
      return { attempt: null, reason: 'exam_unavailable' }
    }

    const existingAttemptRes = await client.query(
      `SELECT id, entitlement_id, user_id, exam_id, status, started_at, expires_at, submitted_at, correct_count, total_questions, score_percent, passed, snapshot_json, created_at
       FROM exam_attempts
       WHERE user_id = $1::uuid
         AND exam_id = $2
         AND status = 'in_progress'
         AND expires_at > NOW()
       ORDER BY started_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId, examId],
    )

    const existingAttempt = existingAttemptRes.rows[0]
    if (existingAttempt) {
      await client.query('COMMIT')
      return {
        attempt: mapAttempt(existingAttempt),
        reason: null,
        reused: true,
      }
    }

    const entitlementRes = await client.query(
      `SELECT id, attempts_remaining
       FROM exam_entitlements
       WHERE user_id = $1::uuid
         AND exam_id = $2
         AND attempts_remaining > 0
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId, examId],
    )

    let entitlement = entitlementRes.rows[0]
    if (!entitlement && Number(exam.price_uzs || 0) <= 0) {
      entitlement = await grantEntitlement({
        userId,
        examId,
        attemptsTotal: 1,
        sourcePaymentId: null,
      })
    }

    if (!entitlement) {
      await client.query('ROLLBACK')
      return { attempt: null, reason: 'no_entitlement' }
    }

    await client.query(
      `UPDATE exam_entitlements
       SET attempts_used = attempts_used + 1,
           attempts_remaining = attempts_remaining - 1
       WHERE id = $1`,
      [entitlement.id],
    )

    const questionsRes = await client.query(
      `SELECT
         q.id,
         q.question_order,
         q.prompt_text,
         q.prompt_rich,
         q.image_url,
         q.options_json,
         q.format_type,
         q.written_answer,
         q.correct_index,
         q.key_verified,
         q.explanation,
         q.difficulty,
         q.source_ref,
         b.block_order,
         b.title AS block_title
       FROM exam_questions q
       LEFT JOIN exam_blocks b ON b.id = q.block_id
       WHERE q.exam_id = $1
       ORDER BY COALESCE(b.block_order, 9999) ASC, q.question_order ASC`,
      [examId],
    )

    const questions = questionsRes.rows.map((row) => ({
      id: row.id,
      questionOrder: row.question_order,
      promptText: row.prompt_text,
      promptRich: row.prompt_rich || {},
      imageUrl: row.image_url,
      options: Array.isArray(row.options_json) ? row.options_json : [],
      formatType: row.format_type || 'MCQ4',
      writtenAnswer: row.written_answer || null,
      correctIndex: row.correct_index,
      keyVerified: Boolean(row.key_verified),
      explanation: row.explanation,
      difficulty: row.difficulty,
      sourceRef: row.source_ref,
      blockOrder: row.block_order,
      blockTitle: row.block_title,
    }))

    const structure = buildExamStructureValidation({ exam, questions })
    if (!structure.valid) {
      await client.query('ROLLBACK')
      return { attempt: null, reason: 'exam_invalid_structure', validation: structure }
    }

    const snapshot = {
      examId: exam.id,
      subjectId: exam.subject_id,
      topicId: exam.topic_id,
      sectionType: exam.section_type,
      examTitle: exam.title,
      durationSec: exam.duration_sec,
      passPercent: exam.pass_percent,
      requiredQuestionCount: exam.required_question_count,
      questions,
    }

    const attemptRes = await client.query(
      `INSERT INTO exam_attempts (entitlement_id, user_id, exam_id, status, started_at, expires_at, snapshot_json)
       VALUES ($1, $2, $3, 'in_progress', NOW(), NOW() + ($4 || ' seconds')::interval, $5::jsonb)
       RETURNING id, entitlement_id, user_id, exam_id, status, started_at, expires_at, submitted_at, correct_count, total_questions, score_percent, passed, snapshot_json, created_at`,
      [entitlement.id, userId, examId, String(exam.duration_sec), JSON.stringify(snapshot)],
    )

    await client.query('COMMIT')

    return {
      attempt: mapAttempt(attemptRes.rows[0]),
      reason: null,
      reused: false,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const saveAttemptAnswer = async ({ attemptId, userId, questionId, selectedIndex, writtenAnswer }: any): Promise<any> => {
  const attemptRes = await pool.query(
    `SELECT id, user_id, status, expires_at, snapshot_json
     FROM exam_attempts
     WHERE id = $1
     LIMIT 1`,
    [attemptId],
  )

  const attempt = attemptRes.rows[0]
  if (!attempt || attempt.user_id !== userId) return { updated: false, reason: 'attempt_not_found' }
  if (attempt.status !== 'in_progress') return { updated: false, reason: 'attempt_finalized' }
  if (new Date(attempt.expires_at).getTime() < Date.now()) return { updated: false, reason: 'attempt_expired' }

  const snapshotQuestions = Array.isArray(attempt.snapshot_json?.questions)
    ? attempt.snapshot_json.questions
    : []
  const targetQuestion = snapshotQuestions.find((question: any) => question.id === questionId)
  if (!targetQuestion) return { updated: false, reason: 'attempt_not_found' }
  const formatType = String(targetQuestion.formatType || 'MCQ4').toUpperCase()

  if (formatType === 'WRITTEN') {
    const safeWrittenAnswer = String(writtenAnswer || '').trim()
    if (!safeWrittenAnswer) {
      return { updated: false, reason: 'invalid_answer' }
    }

    await pool.query(
      `INSERT INTO exam_attempt_answers (attempt_id, question_id, selected_index, written_answer, answered_at)
       VALUES ($1, $2, NULL, $3, NOW())
       ON CONFLICT (attempt_id, question_id) DO UPDATE
         SET selected_index = NULL,
             written_answer = EXCLUDED.written_answer,
             answered_at = NOW()`,
      [attemptId, questionId, safeWrittenAnswer],
    )

    return { updated: true, reason: null }
  }

  const optionCount = Array.isArray(targetQuestion.options) ? targetQuestion.options.length : 0
  if (optionCount < 2 || selectedIndex < 0 || selectedIndex >= optionCount) {
    return { updated: false, reason: 'invalid_answer' }
  }

  await pool.query(
    `INSERT INTO exam_attempt_answers (attempt_id, question_id, selected_index, written_answer, answered_at)
     VALUES ($1, $2, $3, NULL, NOW())
     ON CONFLICT (attempt_id, question_id) DO UPDATE
       SET selected_index = EXCLUDED.selected_index,
           written_answer = NULL,
           answered_at = NOW()`,
    [attemptId, questionId, selectedIndex],
  )

  return { updated: true, reason: null }
}

const submitAttempt = async ({ attemptId, userId }: any): Promise<any> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const attemptRes = await client.query(
      `SELECT id, entitlement_id, user_id, exam_id, status, expires_at, snapshot_json
       FROM exam_attempts
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [attemptId],
    )

    const attempt = attemptRes.rows[0]
    if (!attempt || attempt.user_id !== userId) {
      await client.query('ROLLBACK')
      return { attempt: null, reason: 'attempt_not_found' }
    }

    if (attempt.status !== 'in_progress') {
      await client.query('ROLLBACK')
      return { attempt: null, reason: 'attempt_finalized' }
    }

    const now = Date.now()
    if (new Date(attempt.expires_at).getTime() < now) {
      await client.query(
        `UPDATE exam_attempts
         SET status = 'expired'
         WHERE id = $1
         RETURNING id`,
        [attemptId],
      )
      await client.query('COMMIT')
      return { attempt: null, reason: 'attempt_expired' }
    }

    const snapshot = attempt.snapshot_json || {}
    const questions = Array.isArray(snapshot.questions) ? snapshot.questions : []

    const answersRes = await client.query(
      `SELECT question_id, selected_index, written_answer
       FROM exam_attempt_answers
       WHERE attempt_id = $1`,
      [attemptId],
    )

    const answerMap = new Map(answersRes.rows.map((row) => [row.question_id, {
      selectedIndex: row.selected_index === null || row.selected_index === undefined ? null : Number(row.selected_index),
      writtenAnswer: row.written_answer == null ? null : String(row.written_answer),
    }]))

    let correctCount = 0
    let scoredQuestions = 0
    for (const question of questions) {
      const formatType = String(question.formatType || 'MCQ4').toUpperCase()
      const answer = answerMap.get(question.id)

      if (formatType === 'WRITTEN') {
        const expected = normalizeWrittenAnswerValue(question.writtenAnswer)
        const actual = normalizeWrittenAnswerValue(answer?.writtenAnswer)
        if (expected) {
          scoredQuestions += 1
          if (actual && actual === expected) {
            correctCount += 1
          }
        }
        continue
      }

      scoredQuestions += 1
      const selectedIndex = answer?.selectedIndex
      if (selectedIndex !== null && selectedIndex !== undefined && selectedIndex === Number(question.correctIndex)) {
        correctCount += 1
      }
    }

    const totalQuestions = scoredQuestions
    const scorePercent = scoredQuestions > 0
      ? Math.round((correctCount / scoredQuestions) * 100)
      : 0

    const passed = scorePercent >= Number(snapshot.passPercent || 80)

    const updatedRes = await client.query(
      `UPDATE exam_attempts
       SET status = 'submitted',
           submitted_at = NOW(),
           correct_count = $2,
           total_questions = $3,
           score_percent = $4,
           passed = $5
       WHERE id = $1
       RETURNING id, entitlement_id, user_id, exam_id, status, started_at, expires_at, submitted_at, correct_count, total_questions, score_percent, passed, snapshot_json, created_at`,
      [attemptId, correctCount, totalQuestions, scorePercent, passed],
    )

    await client.query('COMMIT')

    return { attempt: mapAttempt(updatedRes.rows[0]), reason: null }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const getAttemptSession = async ({ attemptId, userId }: any): Promise<any> => {
  const attemptRes = await pool.query(
    `SELECT id, entitlement_id, user_id, exam_id, status, started_at, expires_at, submitted_at, correct_count, total_questions, score_percent, passed, snapshot_json, created_at
     FROM exam_attempts
     WHERE id = $1
     LIMIT 1`,
    [attemptId],
  )

  const attempt = attemptRes.rows[0]
  if (!attempt || attempt.user_id !== userId) return null

  const answersRes = await pool.query(
    `SELECT question_id, selected_index, written_answer
     FROM exam_attempt_answers
     WHERE attempt_id = $1`,
    [attemptId],
  )
  const answerMap = new Map(answersRes.rows.map((row) => [row.question_id, {
    selectedIndex: row.selected_index === null || row.selected_index === undefined ? null : Number(row.selected_index),
    writtenResponse: row.written_answer == null ? '' : String(row.written_answer),
  }]))

  const snapshot = attempt.snapshot_json || {}
  const questions = (snapshot.questions || []).map((question: any) => ({
    questionId: question.id,
    questionOrder: question.questionOrder,
    promptText: question.promptText,
    promptRich: question.promptRich || {},
    imageUrl: question.imageUrl || null,
    options: question.options || [],
    formatType: question.formatType || 'MCQ4',
    selectedIndex: answerMap.get(question.id)?.selectedIndex ?? null,
    writtenResponse: answerMap.get(question.id)?.writtenResponse ?? '',
    difficulty: question.difficulty || null,
    blockOrder: question.blockOrder ?? null,
    blockTitle: question.blockTitle ?? null,
  }))

  return {
    ...mapAttempt(attempt),
    session: {
      examTitle: snapshot.examTitle || null,
      passPercent: Number(snapshot.passPercent || 80),
      requiredQuestionCount: Number(snapshot.requiredQuestionCount || questions.length),
    },
    questions,
  }
}

const getAttemptResult = async ({ attemptId, userId }: any): Promise<any> => {
  const attemptRes = await pool.query(
    `SELECT id, entitlement_id, user_id, exam_id, status, started_at, expires_at, submitted_at, correct_count, total_questions, score_percent, passed, snapshot_json, created_at
     FROM exam_attempts
     WHERE id = $1
     LIMIT 1`,
    [attemptId],
  )

  const attempt = attemptRes.rows[0]
  if (!attempt || attempt.user_id !== userId) return null

  const answersRes = await pool.query(
    `SELECT question_id, selected_index, written_answer, answered_at
     FROM exam_attempt_answers
     WHERE attempt_id = $1`,
    [attemptId],
  )

  const answerMap = new Map(answersRes.rows.map((row) => [row.question_id, {
    selectedIndex: row.selected_index === null || row.selected_index === undefined ? null : Number(row.selected_index),
    writtenResponse: row.written_answer == null ? '' : String(row.written_answer),
  }]))

  const snapshot = attempt.snapshot_json || {}
  const questions = (snapshot.questions || []).map((question: any) => {
    const formatType = String(question.formatType || 'MCQ4').toUpperCase()
    const answer = answerMap.get(question.id)
    const selectedIndex = answer?.selectedIndex
    const writtenResponse = answer?.writtenResponse ?? ''
    const expectedWrittenAnswer = String(question.writtenAnswer || '')
    const requiresManualReview = formatType === 'WRITTEN' && !expectedWrittenAnswer.trim()

    return {
      questionId: question.id,
      questionOrder: question.questionOrder,
      promptText: question.promptText,
      formatType,
      options: question.options || [],
      selectedIndex: selectedIndex === undefined ? null : selectedIndex,
      writtenResponse,
      expectedWrittenAnswer: expectedWrittenAnswer || null,
      requiresManualReview,
      correctIndex: question.correctIndex,
      isCorrect: formatType === 'WRITTEN'
        ? (requiresManualReview
          ? null
          : normalizeWrittenAnswerValue(writtenResponse) === normalizeWrittenAnswerValue(expectedWrittenAnswer))
        : (selectedIndex === undefined || selectedIndex === null ? false : selectedIndex === Number(question.correctIndex)),
      explanation: question.explanation || null,
    }
  })

  return {
    ...mapAttempt(attempt),
    review: questions,
  }
}

const findAttemptsByUserId = async (userId: string | number): Promise<any[]> => {
  const { rows } = await pool.query(
    `SELECT a.id, a.entitlement_id, a.user_id, a.exam_id, a.status, a.started_at, a.expires_at, a.submitted_at, a.correct_count, a.total_questions, a.score_percent, a.passed, a.snapshot_json, a.created_at, e.title as exam_title
     FROM exam_attempts a
     JOIN exams e ON a.exam_id = e.id
     WHERE a.user_id = $1::uuid
     ORDER BY a.created_at DESC`,
    [userId],
  )

  return rows.map((row: any) => ({
    ...mapAttempt(row),
    examTitle: row.exam_title,
  }))
}

const Exam = {
  FIXED_EXAM_DURATION_SEC,
  FIXED_EXAM_PASS_PERCENT,
  DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
  createDraft,
  getById,
  listManaged,
  updateDraft,
  setStatus,
  listPublishedCatalog,
  remove: async (id: string | number): Promise<boolean> => {
    const { rowCount } = await pool.query('DELETE FROM exams WHERE id = $1', [id])
    return (rowCount ?? 0) > 0
  },
  replaceStructure,
  listQuestions,
  updateQuestionKey,
  validateExamStructure,
  grantEntitlement,
  startAttempt,
  saveAttemptAnswer,
  submitAttempt,
  getAttemptSession,
  getAttemptResult,
  findAttemptsByUserId,
}

export default Exam
