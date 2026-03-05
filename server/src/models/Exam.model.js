const { pool } = require('../config/db')

const toNumber = (value) => Number(value || 0)
const FIXED_EXAM_DURATION_SEC = 120 * 60
const FIXED_EXAM_PASS_PERCENT = 80
const DEFAULT_REQUIRED_EXAM_QUESTION_COUNT = 50

const normalizeQuestion = (question, idx) => ({
  id: question.id,
  promptText: question.promptText,
  promptRich: question.promptRich || {},
  imageUrl: question.imageUrl || null,
  options: Array.isArray(question.options) ? question.options : [],
  correctIndex: Number(question.correctIndex ?? 0),
  explanation: question.explanation || null,
  difficulty: question.difficulty || null,
  sourceRef: question.sourceRef || null,
  keyVerified: question.keyVerified === undefined ? true : Boolean(question.keyVerified),
  blockOrder: Number(question.blockOrder || 0),
  questionOrder: Number(question.questionOrder || idx + 1),
  blockTitle: question.blockTitle || null,
})

const mapExam = (row) => {
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
  }
}

const mapAttempt = (row) => {
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

const canTransitionStatus = (currentStatus, nextStatus) => {
  if (!currentStatus || !nextStatus) return false
  if (currentStatus === nextStatus) return true

  const transitions = {
    draft: new Set(['pending_review', 'archived']),
    pending_review: new Set(['published', 'draft', 'archived']),
    published: new Set(['archived']),
    archived: new Set(['draft']),
  }

  return Boolean(transitions[currentStatus]?.has(nextStatus))
}

const createDraft = async ({
  subjectId,
  ownerUserId,
  title,
  description = '',
  priceUzs = 0,
  requiredQuestionCount = DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
}) => {
  const safeDurationSec = FIXED_EXAM_DURATION_SEC
  const safePassPercent = FIXED_EXAM_PASS_PERCENT
  const { rows } = await pool.query(
    `INSERT INTO exams (subject_id, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, TRUE)
     RETURNING id, subject_id, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at`,
    [subjectId, ownerUserId, title, description, safeDurationSec, safePassPercent, requiredQuestionCount, priceUzs],
  )

  return mapExam(rows[0])
}

const getById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, subject_id, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at
     FROM exams
     WHERE id = $1
     LIMIT 1`,
    [id],
  )

  return mapExam(rows[0])
}

const updateDraft = async (id, patch = {}) => {
  const { rows } = await pool.query(
    `UPDATE exams
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         duration_sec = $3,
         pass_percent = $4,
         required_question_count = COALESCE($5, required_question_count),
         price_uzs = COALESCE($6, price_uzs),
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
     WHERE id = $8
     RETURNING id, subject_id, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at`,
    [
      patch.title ?? null,
      patch.description ?? null,
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

const setStatus = async (id, { status, reviewerId = null }) => {
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
     RETURNING id, subject_id, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at`,
    [status, reviewerId, publishNow, id],
  )

  return mapExam(rows[0])
}

const listPublishedCatalog = async ({ subjectId } = {}) => {
  const params = []
  let subjectClause = ''
  if (subjectId) {
    params.push(subjectId)
    subjectClause = `AND subject_id = $${params.length}`
  }

  const { rows } = await pool.query(
    `SELECT id, subject_id, owner_user_id, title, description, duration_sec, pass_percent, required_question_count, status, price_uzs, is_active, approved_by, published_at, created_at, updated_at
     FROM exams
     WHERE status = 'published'
       AND is_active = TRUE
       ${subjectClause}
     ORDER BY created_at DESC`,
    params,
  )

  return rows.map(mapExam)
}

const replaceStructure = async ({ examId, blocks = [], questions = [] }) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query('DELETE FROM exam_questions WHERE exam_id = $1', [examId])
    await client.query('DELETE FROM exam_blocks WHERE exam_id = $1', [examId])

    const blockIdByOrder = new Map()
    const normalizedBlocks = (blocks || []).map((block, idx) => ({
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
          options_json, correct_index, key_verified, explanation, difficulty, source_ref, updated_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $10, $11, $12, NOW())`,
        [
          examId,
          blockId,
          Number(q.questionOrder || idx + 1),
          q.promptText,
          JSON.stringify(q.promptRich || {}),
          q.imageUrl,
          JSON.stringify(q.options || []),
          Number(q.correctIndex || 0),
          q.keyVerified === undefined ? true : Boolean(q.keyVerified),
          q.explanation,
          q.difficulty,
          q.sourceRef,
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

const listQuestions = async (examId) => {
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
       b.block_order,
       b.title AS block_title
     FROM exam_questions q
     LEFT JOIN exam_blocks b ON b.id = q.block_id
     WHERE q.exam_id = $1
     ORDER BY COALESCE(b.block_order, 9999) ASC, q.question_order ASC`,
    [examId],
  )

  return rows.map((row) => ({
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
  }))
}

const updateQuestionKey = async ({ examId, questionId, correctIndex, keyVerified = true }) => {
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

const buildExamStructureValidation = ({ exam, questions }) => {
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

  questions.forEach((question) => {
    const order = Number(question.questionOrder || 0)
    const prompt = String(question.promptText || '').trim()
    const options = Array.isArray(question.options) ? question.options : []
    const correctIndex = Number(question.correctIndex)
    const keyVerified = question.keyVerified === undefined ? true : Boolean(question.keyVerified)

    if (!prompt) {
      issues.push({
        code: 'prompt_missing',
        message: `Question ${order} has an empty prompt`,
        details: { questionId: question.id, questionOrder: order },
      })
    }

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

    if (!keyVerified) {
      issues.push({
        code: 'answer_key_unverified',
        message: `Question ${order} answer key is not verified`,
        details: { questionId: question.id, questionOrder: order },
      })
    } else {
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

const validateExamStructure = async (examId) => {
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

const grantEntitlement = async ({ userId, examId, attemptsTotal = 1, sourcePaymentId }) => {
  const { rows } = await pool.query(
    `INSERT INTO exam_entitlements (user_id, exam_id, attempts_total, attempts_used, attempts_remaining, source_payment_id)
     VALUES ($1, $2, $3, 0, $3, $4)
     ON CONFLICT (source_payment_id) DO NOTHING
     RETURNING id, user_id, exam_id, attempts_total, attempts_used, attempts_remaining, source_payment_id, created_at`,
    [userId, examId, attemptsTotal, sourcePaymentId],
  )

  return rows[0] ?? null
}

const startAttempt = async ({ userId, examId }) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const examRes = await client.query(
      `SELECT id, subject_id, title, duration_sec, pass_percent, required_question_count, status, is_active
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
       WHERE user_id = $1
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
       WHERE user_id = $1
         AND exam_id = $2
         AND attempts_remaining > 0
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId, examId],
    )

    const entitlement = entitlementRes.rows[0]
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

const saveAttemptAnswer = async ({ attemptId, userId, questionId, selectedIndex }) => {
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
  const targetQuestion = snapshotQuestions.find((question) => question.id === questionId)
  if (!targetQuestion) return { updated: false, reason: 'attempt_not_found' }
  const optionCount = Array.isArray(targetQuestion.options) ? targetQuestion.options.length : 0
  if (optionCount < 2 || selectedIndex < 0 || selectedIndex >= optionCount) {
    return { updated: false, reason: 'invalid_answer' }
  }

  await pool.query(
    `INSERT INTO exam_attempt_answers (attempt_id, question_id, selected_index, answered_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (attempt_id, question_id) DO UPDATE
       SET selected_index = EXCLUDED.selected_index,
           answered_at = NOW()`,
    [attemptId, questionId, selectedIndex],
  )

  return { updated: true, reason: null }
}

const submitAttempt = async ({ attemptId, userId }) => {
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
      `SELECT question_id, selected_index
       FROM exam_attempt_answers
       WHERE attempt_id = $1`,
      [attemptId],
    )

    const answerMap = new Map(answersRes.rows.map((row) => [row.question_id, Number(row.selected_index)]))

    let correctCount = 0
    for (const question of questions) {
      const selectedIndex = answerMap.get(question.id)
      if (selectedIndex !== undefined && selectedIndex === Number(question.correctIndex)) {
        correctCount += 1
      }
    }

    const totalQuestions = questions.length
    const scorePercent = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
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

const getAttemptSession = async ({ attemptId, userId }) => {
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
    `SELECT question_id, selected_index
     FROM exam_attempt_answers
     WHERE attempt_id = $1`,
    [attemptId],
  )
  const answerMap = new Map(answersRes.rows.map((row) => [row.question_id, Number(row.selected_index)]))

  const snapshot = attempt.snapshot_json || {}
  const questions = (snapshot.questions || []).map((question) => ({
    questionId: question.id,
    questionOrder: question.questionOrder,
    promptText: question.promptText,
    promptRich: question.promptRich || {},
    imageUrl: question.imageUrl || null,
    options: question.options || [],
    selectedIndex: answerMap.has(question.id) ? answerMap.get(question.id) : null,
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

const getAttemptResult = async ({ attemptId, userId }) => {
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
    `SELECT question_id, selected_index, answered_at
     FROM exam_attempt_answers
     WHERE attempt_id = $1`,
    [attemptId],
  )

  const answerMap = new Map(answersRes.rows.map((row) => [row.question_id, Number(row.selected_index)]))

  const snapshot = attempt.snapshot_json || {}
  const questions = (snapshot.questions || []).map((question) => {
    const selectedIndex = answerMap.get(question.id)
    return {
      questionId: question.id,
      questionOrder: question.questionOrder,
      promptText: question.promptText,
      options: question.options || [],
      selectedIndex: selectedIndex === undefined ? null : selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect: selectedIndex === undefined ? false : selectedIndex === Number(question.correctIndex),
      explanation: question.explanation || null,
    }
  })

  return {
    ...mapAttempt(attempt),
    review: questions,
  }
}

module.exports = {
  FIXED_EXAM_DURATION_SEC,
  FIXED_EXAM_PASS_PERCENT,
  DEFAULT_REQUIRED_EXAM_QUESTION_COUNT,
  createDraft,
  getById,
  updateDraft,
  setStatus,
  listPublishedCatalog,
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
}
