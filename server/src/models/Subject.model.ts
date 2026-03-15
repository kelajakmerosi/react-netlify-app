import { pool } from '../config/db'

export interface SubjectQuestion {
  id?: number | string
  [key: string]: any
}

export interface SubjectTopic {
  id: string
  questions?: SubjectQuestion[]
  [key: string]: any
}

export interface SubjectSection {
  id: string
  type: 'attestation' | 'general' | 'milliy'
  title: string
  topicIds: string[]
  comingSoon?: boolean
}

export interface Subject {
  id: string | number
  catalog_key?: string | null
  title: string
  description?: string
  icon?: string
  color?: string
  image_url?: string | null
  order?: number
  topics?: SubjectTopic[]
  sections?: SubjectSection[]
  is_hidden?: boolean
  track?: string
  created_at?: Date | string
  updated_at?: Date | string
}

const findAll = async (): Promise<Subject[]> => {
  const { rows } = await pool.query(
    'SELECT * FROM subjects WHERE is_hidden = FALSE ORDER BY "order" ASC'
  )
  return rows
}

const findAllAdmin = async (): Promise<Subject[]> => {
  const { rows } = await pool.query(
    'SELECT * FROM subjects ORDER BY is_hidden ASC, "order" ASC'
  )
  return rows
}

const findById = async (id: string | number): Promise<Subject | null> => {
  const { rows } = await pool.query(
    `SELECT *
     FROM subjects
     WHERE id::text = $1 OR catalog_key = $1
     ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [String(id)],
  )
  return rows[0] ?? null
}

export interface CreateSubjectParams {
  title: string
  description?: string
  icon?: string
  color?: string
  image_url?: string | null
  order?: number
  catalog_key?: string | null
  topics?: SubjectTopic[]
  sections?: SubjectSection[]
  is_hidden?: boolean
  track?: string
}

const normalizeCatalogKey = (value?: string | null): string | null => {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized : null
}

const create = async (data: CreateSubjectParams): Promise<Subject> => {
  const {
    title,
    description = '',
    icon = '',
    color = '#6366f1',
    image_url = null,
    order = 0,
    catalog_key = null,
    topics = [],
    sections = [],
    is_hidden = false,
    track = 'foundation',
  } = data
  const { rows } = await pool.query(
    `INSERT INTO subjects (title, description, icon, color, image_url, "order", catalog_key, topics, sections, is_hidden, track)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      title,
      description,
      icon,
      color,
      image_url,
      order,
      normalizeCatalogKey(catalog_key),
      JSON.stringify(topics),
      JSON.stringify(sections),
      is_hidden,
      track,
    ]
  )
  return rows[0]
}

export interface UpdateSubjectParams {
  title?: string
  description?: string
  icon?: string
  color?: string
  image_url?: string | null
  order?: number
  catalog_key?: string | null
  topics?: SubjectTopic[]
  sections?: SubjectSection[]
  is_hidden?: boolean
  track?: string
}

const update = async (id: string | number, data: UpdateSubjectParams): Promise<Subject | null> => {
  const current = await findById(id)
  if (!current) return null

  const { title, description, icon, color, image_url, order, topics, sections, is_hidden, track } = data
  const shouldUpdateImageUrl = Object.prototype.hasOwnProperty.call(data, 'image_url')
  const nextImageUrl = shouldUpdateImageUrl ? image_url ?? null : null
  const nextCatalogKey = Object.prototype.hasOwnProperty.call(data, 'catalog_key')
    ? normalizeCatalogKey(data.catalog_key)
    : undefined
  const { rows } = await pool.query(
    `UPDATE subjects
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         icon  = COALESCE($3, icon),
         color = COALESCE($4, color),
         image_url = CASE WHEN $5 THEN $6 ELSE image_url END,
         "order" = COALESCE($7, "order"),
         catalog_key = COALESCE($8, catalog_key),
         topics = COALESCE($9, topics),
         sections = COALESCE($10, sections),
         is_hidden = COALESCE($11, is_hidden),
         track = COALESCE($12, track),
         updated_at = NOW()
     WHERE id = $13 RETURNING *`,
    [
      title,
      description,
      icon,
      color,
      shouldUpdateImageUrl,
      nextImageUrl,
      order,
      nextCatalogKey ?? null,
      topics ? JSON.stringify(topics) : null,
      sections ? JSON.stringify(sections) : null,
      is_hidden ?? null,
      track ?? null,
      current.id,
    ]
  )
  return rows[0] ?? null
}

const remove = async (id: string | number): Promise<boolean> => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query(
      `SELECT id::text AS id, catalog_key
       FROM subjects
       WHERE id::text = $1 OR catalog_key = $1
       ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [String(id)],
    )
    const subject = existing.rows[0]
    if (!subject) {
      await client.query('ROLLBACK')
      return false
    }

    const identifiers = Array.from(new Set(
      [String(subject.id), normalizeCatalogKey(subject.catalog_key)].filter((value): value is string => Boolean(value)),
    ))

    // Remove dependent subject-scoped records before deleting the subject row itself.
    await client.query('DELETE FROM admin_subject_scopes WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM teacher_subject_scopes WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM user_lesson_progress WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM user_quiz_attempts WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM analytics_events WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM content_upload_jobs WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM course_prices WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM payments WHERE subject_id = ANY($1::text[])', [identifiers])

    // Exams and material packs cascade into their own questions, attempts, assets, and entitlements.
    await client.query('DELETE FROM exams WHERE subject_id = ANY($1::text[])', [identifiers])
    await client.query('DELETE FROM material_packs WHERE subject_id = ANY($1::text[])', [identifiers])

    const { rowCount } = await client.query('DELETE FROM subjects WHERE id = $1', [subject.id])
    await client.query('COMMIT')
    return (rowCount ?? 0) > 0
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const replaceTopics = async (id: string | number, topics: SubjectTopic[]): Promise<Subject | null> => {
  const current = await findById(id)
  if (!current) return null
  const { rows } = await pool.query(
    `UPDATE subjects
     SET topics = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(topics || []), current.id]
  )
  return rows[0] ?? null
}

const addTopic = async (id: string | number, topic: SubjectTopic): Promise<Subject | null> => {
  const subject = await findById(id)
  if (!subject) return null

  const nextTopics = [...(subject.topics || []), topic]
  return replaceTopics(id, nextTopics)
}

const updateTopic = async (id: string | number, topicId: string, patch: Partial<SubjectTopic>) => {
  const subject = await findById(id)
  if (!subject) return null
  const topics = subject.topics || []
  const nextTopics = topics.map((topic) => (
    topic.id === topicId ? { ...topic, ...patch } : topic
  ))

  if (!nextTopics.some((topic) => topic.id === topicId)) {
    return { subject, topicFound: false }
  }

  const updated = await replaceTopics(id, nextTopics)
  return { subject: updated, topicFound: true }
}

const removeTopic = async (id: string | number, topicId: string) => {
  const subject = await findById(id)
  if (!subject) return null
  const topics = subject.topics || []
  const nextTopics = topics.filter((topic) => topic.id !== topicId)
  if (nextTopics.length === topics.length) {
    return { subject, topicFound: false }
  }
  const updated = await replaceTopics(id, nextTopics)
  return { subject: updated, topicFound: true }
}

const reorderTopics = async (id: string | number, topicIds: string[]) => {
  const subject = await findById(id)
  if (!subject) return null

  const topics = subject.topics || []
  const byId = new Map(topics.map((topic) => [topic.id, topic]))
  const reordered = topicIds.map((topicId) => byId.get(topicId)).filter((t): t is SubjectTopic => Boolean(t))

  if (reordered.length !== topics.length) {
    return { subject, valid: false }
  }

  const updated = await replaceTopics(id, reordered)
  return { subject: updated, valid: true }
}

export default {
  findAll,
  findAllAdmin,
  findById,
  create,
  update,
  remove,
  replaceTopics,
  addTopic,
  updateTopic,
  removeTopic,
  reorderTopics,
}
