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

export interface Subject {
  id: string | number
  title: string
  description?: string
  icon?: string
  color?: string
  order?: number
  topics?: SubjectTopic[]
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
    'SELECT * FROM subjects WHERE id = $1 LIMIT 1', [id]
  )
  return rows[0] ?? null
}

export interface CreateSubjectParams {
  title: string
  description?: string
  icon?: string
  color?: string
  order?: number
  topics?: SubjectTopic[]
  is_hidden?: boolean
  track?: string
}

const create = async (data: CreateSubjectParams): Promise<Subject> => {
  const { title, description = '', icon = '', color = '#6366f1', order = 0, topics = [], is_hidden = false, track = 'foundation' } = data
  const { rows } = await pool.query(
    `INSERT INTO subjects (title, description, icon, color, "order", topics, is_hidden, track)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [title, description, icon, color, order, JSON.stringify(topics), is_hidden, track]
  )
  return rows[0]
}

export interface UpdateSubjectParams {
  title?: string
  description?: string
  icon?: string
  color?: string
  order?: number
  topics?: SubjectTopic[]
  is_hidden?: boolean
  track?: string
}

const update = async (id: string | number, data: UpdateSubjectParams): Promise<Subject | null> => {
  const { title, description, icon, color, order, topics, is_hidden, track } = data
  const { rows } = await pool.query(
    `UPDATE subjects
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         icon  = COALESCE($3, icon),
         color = COALESCE($4, color),
         "order" = COALESCE($5, "order"),
         topics = COALESCE($6, topics),
         is_hidden = COALESCE($7, is_hidden),
         track = COALESCE($8, track),
         updated_at = NOW()
     WHERE id = $9 RETURNING *`,
    [title, description, icon, color, order, topics ? JSON.stringify(topics) : null, is_hidden ?? null, track ?? null, id]
  )
  return rows[0] ?? null
}

const remove = async (id: string | number): Promise<boolean> => {
  const { rowCount } = await pool.query('DELETE FROM subjects WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}

const replaceTopics = async (id: string | number, topics: SubjectTopic[]): Promise<Subject | null> => {
  const { rows } = await pool.query(
    `UPDATE subjects
     SET topics = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(topics || []), id]
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
