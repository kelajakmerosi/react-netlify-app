#!/usr/bin/env node
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { Pool } = require('pg')
const {
  PAPER_KEY,
  PAPER_TITLE,
  BLOCKS,
  QUESTIONS,
  REQUIRED_QUESTION_COUNT,
  STATUS,
  PRICE_UZS,
  IS_ACTIVE,
  DESCRIPTION,
} = require('./data/milliy-sertifikat-math-2026-02-28-2-smena')

const FIXED_EXAM_DURATION_SEC = 120 * 60
const FIXED_EXAM_PASS_PERCENT = 80

const getArg = (name, fallback = '') => {
  const prefix = `--${name}=`
  const raw = process.argv.slice(2).find((entry) => entry.startsWith(prefix))
  return raw ? raw.slice(prefix.length) : fallback
}

const parseDbEndpoint = (connectionString) => {
  if (!connectionString) return { host: null, port: null }
  try {
    const parsed = new URL(connectionString)
    return {
      host: parsed.hostname || null,
      port: parsed.port ? Number(parsed.port) : 5432,
    }
  } catch {
    return { host: null, port: null }
  }
}

const toSupabaseDirectConnectionString = (connectionString) => {
  if (!connectionString) return null

  try {
    const parsed = new URL(connectionString)
    if (!parsed.hostname.endsWith('.pooler.supabase.com')) return null

    const [, projectRef] = parsed.username.split('.')
    if (!projectRef) return null

    parsed.hostname = `db.${projectRef}.supabase.co`
    parsed.port = '5432'
    parsed.username = 'postgres'
    return parsed.toString()
  } catch {
    return null
  }
}

const buildPool = (connectionString) => new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  max: 4,
  idleTimeoutMillis: 30000,
})

const buildCandidates = (connectionString) => {
  const direct = toSupabaseDirectConnectionString(connectionString)
  return [
    { label: 'primary', connectionString },
    ...(direct && direct !== connectionString
      ? [{ label: 'supabase-direct-fallback', connectionString: direct }]
      : []),
  ]
}

const isRetryableConnectionError = (error) => {
  const code = String(error?.code || error?.cause?.code || '').trim()
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'].includes(code)) return true
  const message = String(error?.message || '').toLowerCase()
  return message.includes('timeout')
    || message.includes('connection terminated unexpectedly')
    || message.includes('could not connect')
}

const connectPool = async () => {
  const candidates = buildCandidates(process.env.DATABASE_URL)
  let lastError = null

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const endpoint = parseDbEndpoint(candidate.connectionString)
    const pool = buildPool(candidate.connectionString)

    try {
      const client = await pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      console.log(`[seed] connected via ${candidate.label} (${endpoint.host || 'unknown'}:${endpoint.port || 'unknown'})`)
      return pool
    } catch (error) {
      lastError = error
      await pool.end().catch(() => {})
      const shouldFallback = candidate.label === 'primary' && index < candidates.length - 1 && isRetryableConnectionError(error)
      console[shouldFallback ? 'warn' : 'error'](`[seed] db connection failed (${candidate.label}):`, error.message)
      if (shouldFallback) continue
      throw error
    }
  }

  throw lastError || new Error('Unable to connect to database')
}

const dedupeTopicIds = (topicIds = []) => Array.from(new Set(topicIds.filter(Boolean)))

const normalizeSections = (sections = []) => (
  Array.isArray(sections) ? sections.map((section) => ({
    ...section,
    topicIds: dedupeTopicIds(section.topicIds || []),
  })) : []
)

const resolveSubject = async (client, explicitSubjectId) => {
  if (explicitSubjectId) {
    const direct = await client.query(
      `SELECT *
       FROM subjects
       WHERE id::text = $1 OR catalog_key = $1
       ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [explicitSubjectId],
    )
    if (direct.rows[0]) return direct.rows[0]
  }

  const byCatalogKey = await client.query(
    `SELECT *
     FROM subjects
     WHERE catalog_key = '5'
     LIMIT 1`,
  )
  if (byCatalogKey.rows[0]) return byCatalogKey.rows[0]

  const byTitle = await client.query(
    `SELECT *
     FROM subjects
     WHERE lower(title) IN ('matematika', 'mathematics', 'math')
     ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
     LIMIT 1`,
  )
  return byTitle.rows[0] || null
}

const resolveOwner = async (client, explicitOwnerUserId) => {
  if (explicitOwnerUserId) {
    const res = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [explicitOwnerUserId])
    if (res.rows[0]) return res.rows[0]
  }

  const res = await client.query(
    `SELECT id
     FROM users
     WHERE role IN ('superadmin', 'admin')
     ORDER BY CASE WHEN role = 'superadmin' THEN 0 ELSE 1 END, created_at ASC
     LIMIT 1`,
  )

  if (res.rows[0]) return res.rows[0]

  const teacherFallback = await client.query(
    `SELECT id
     FROM users
     WHERE can_teach = TRUE
     ORDER BY created_at ASC
     LIMIT 1`,
  )

  return teacherFallback.rows[0] || null
}

const ensureMilliySection = async (client, subjectId, rawSections) => {
  const sections = normalizeSections(rawSections)
  const nextSections = sections.slice()
  const existingIndex = nextSections.findIndex((section) => section.id === 'mil-5')

  const nextSection = {
    id: 'mil-5',
    type: 'milliy',
    title: 'Milliy sertifikat',
    topicIds: dedupeTopicIds([...(existingIndex >= 0 ? nextSections[existingIndex].topicIds || [] : []), PAPER_KEY]),
    comingSoon: false,
  }

  if (existingIndex >= 0) {
    nextSections[existingIndex] = {
      ...nextSections[existingIndex],
      ...nextSection,
    }
  } else {
    nextSections.push(nextSection)
  }

  await client.query(
    `UPDATE subjects
     SET catalog_key = COALESCE(catalog_key, '5'),
         sections = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(nextSections), subjectId],
  )
}

const deleteExamDependencies = async (client, examId) => {
  await client.query('DELETE FROM exam_attempt_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = $1)', [examId])
  await client.query('DELETE FROM exam_attempts WHERE exam_id = $1', [examId])
  await client.query('DELETE FROM exam_entitlements WHERE exam_id = $1', [examId])
  await client.query('DELETE FROM exam_questions WHERE exam_id = $1', [examId])
  await client.query('DELETE FROM exam_blocks WHERE exam_id = $1', [examId])
}

const upsertExam = async (client, { subjectId, ownerUserId }) => {
  const existingRes = await client.query(
    `SELECT id
     FROM exams
     WHERE subject_id = $1
       AND (
         topic_id = $2
         OR (section_type = 'milliy' AND lower(title) = lower($3))
       )
     ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST`,
    [subjectId, PAPER_KEY, PAPER_TITLE],
  )

  const [canonical, ...duplicates] = existingRes.rows
  for (const duplicate of duplicates) {
    await deleteExamDependencies(client, duplicate.id)
    await client.query('DELETE FROM exams WHERE id = $1', [duplicate.id])
  }

  if (canonical) {
    await client.query(
      `UPDATE exams
       SET owner_user_id = $2,
           title = $3,
           description = $4,
           duration_sec = $5,
           pass_percent = $6,
           required_question_count = $7,
           status = $8,
           price_uzs = $9,
           is_active = $10,
           topic_id = $11,
           section_type = 'milliy',
           approved_by = NULL,
           published_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [
        canonical.id,
        ownerUserId,
        PAPER_TITLE,
        DESCRIPTION,
        FIXED_EXAM_DURATION_SEC,
        FIXED_EXAM_PASS_PERCENT,
        REQUIRED_QUESTION_COUNT,
        STATUS,
        PRICE_UZS,
        IS_ACTIVE,
        PAPER_KEY,
      ],
    )
    return canonical.id
  }

  const inserted = await client.query(
    `INSERT INTO exams (
      subject_id,
      topic_id,
      section_type,
      owner_user_id,
      title,
      description,
      duration_sec,
      pass_percent,
      required_question_count,
      status,
      price_uzs,
      is_active
    ) VALUES ($1, $2, 'milliy', $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      subjectId,
      PAPER_KEY,
      ownerUserId,
      PAPER_TITLE,
      DESCRIPTION,
      FIXED_EXAM_DURATION_SEC,
      FIXED_EXAM_PASS_PERCENT,
      REQUIRED_QUESTION_COUNT,
      STATUS,
      PRICE_UZS,
      IS_ACTIVE,
    ],
  )

  return inserted.rows[0].id
}

const replaceStructure = async (client, examId) => {
  await deleteExamDependencies(client, examId)

  const blockIdByOrder = new Map()

  for (const block of BLOCKS) {
    const blockRes = await client.query(
      `INSERT INTO exam_blocks (exam_id, block_order, title)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [examId, block.blockOrder, block.title],
    )
    blockIdByOrder.set(block.blockOrder, blockRes.rows[0].id)
  }

  for (const question of QUESTIONS) {
    await client.query(
      `INSERT INTO exam_questions (
        exam_id,
        block_id,
        question_order,
        prompt_text,
        prompt_rich,
        image_url,
        options_json,
        correct_index,
        key_verified,
        explanation,
        difficulty,
        source_ref,
        format_type,
        written_answer,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        examId,
        blockIdByOrder.get(question.blockOrder) || null,
        question.questionOrder,
        question.promptText,
        JSON.stringify(question.promptRich || {}),
        question.imageUrl || null,
        JSON.stringify(question.options || []),
        question.correctIndex ?? null,
        Boolean(question.keyVerified),
        question.explanation || null,
        question.difficulty || null,
        question.sourceRef || null,
        question.formatType || 'MCQ4',
        question.writtenAnswer || null,
      ],
    )
  }
}

const main = async () => {
  const pool = await connectPool()
  const client = await pool.connect()
  const subjectArg = getArg('subjectId')
  const ownerArg = getArg('ownerUserId')

  try {
    await client.query('BEGIN')

    const subject = await resolveSubject(client, subjectArg)
    if (!subject) throw new Error('Matematika subject not found')

    const owner = await resolveOwner(client, ownerArg)
    if (!owner) throw new Error('No admin/superadmin owner user found for draft exam')

    await ensureMilliySection(client, subject.id, subject.sections || [])
    const examId = await upsertExam(client, { subjectId: subject.id, ownerUserId: owner.id })
    await replaceStructure(client, examId)

    await client.query('COMMIT')

    console.log(`[seed] Paper seeded successfully`)
    console.log(`  subjectId: ${subject.id}`)
    console.log(`  examId: ${examId}`)
    console.log(`  paperKey: ${PAPER_KEY}`)
    console.log(`  questionCount: ${QUESTIONS.length}/${REQUIRED_QUESTION_COUNT}`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[seed] failed:', error)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end().catch(() => {})
  }
}

void main()
