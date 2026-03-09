import { pool } from '../config/db'

const DATE_TRUNC_BY_GRANULARITY: Record<string, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
}

const toIsoDate = (value?: string | Date | null) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const buildRange = ({ from, to }: { from?: string | Date | null, to?: string | Date | null } = {}) => {
  const end = toIsoDate(to) || new Date().toISOString()
  const startDefault = new Date(new Date(end).getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString()
  const start = toIsoDate(from) || startDefault
  return { from: start, to: end }
}

export interface TrackEventParams {
  eventType?: string | null
  userId?: string | null
  subjectId?: string | null
  topicId?: string | null
  source?: string | null
  payload?: any
}

const trackEvent = async ({
  eventType,
  userId = null,
  subjectId = null,
  topicId = null,
  source = null,
  payload = {},
}: TrackEventParams) => {
  if (!eventType) return null
  const { rows } = await pool.query(
    `INSERT INTO analytics_events (
      event_type, user_id, subject_id, topic_id, source, payload
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING id`,
    [eventType, userId, subjectId, topicId, source, JSON.stringify(payload || {})]
  )
  return rows[0] ?? null
}

const getSummary = async ({ from, to, subjectId, userId }: { from?: string, to?: string, subjectId?: string, userId?: string } = {}) => {
  const range = buildRange({ from, to })

  const [usersResult, activeResult, completionResult, quizResult, authSourceResult] = await Promise.all([
    userId
      ? pool.query('SELECT 1::int AS total_users')
      : pool.query('SELECT COUNT(*)::int AS total_users FROM users'),
    (() => {
      const activeParams: any[] = [range.to]
      let userClause = ''
      if (userId) {
        activeParams.push(userId)
        userClause = 'AND user_id = $2::uuid'
      }

      return pool.query(
        `SELECT
           COUNT(DISTINCT CASE WHEN activity_date = $1::date THEN user_id END)::int AS dau,
           COUNT(DISTINCT CASE WHEN activity_date >= ($1::date - INTERVAL '6 days') THEN user_id END)::int AS wau,
           COUNT(DISTINCT CASE WHEN activity_date >= ($1::date - INTERVAL '29 days') THEN user_id END)::int AS mau
         FROM user_activity_days
         WHERE 1=1 ${userClause}`,
        activeParams
      )
    })(),
    (() => {
      const completionParams: any[] = []
      const completionWhere: string[] = []

      if (subjectId) {
        completionParams.push(subjectId)
        completionWhere.push(`subject_id = $${completionParams.length}::text`)
      }
      if (userId) {
        completionParams.push(userId)
        completionWhere.push(`user_id = $${completionParams.length}::uuid`)
      }

      return pool.query(
        `SELECT
           COUNT(*)::int AS tracked_topics,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_topics
         FROM user_lesson_progress
         ${completionWhere.length > 0 ? `WHERE ${completionWhere.join(' AND ')}` : ''}`,
        completionParams
      )
    })(),
    (() => {
      const quizParams: any[] = [range.from, range.to]
      const whereClauses: string[] = []
      if (subjectId) {
        quizParams.push(subjectId)
        whereClauses.push(`subject_id = $${quizParams.length}::text`)
      }
      if (userId) {
        quizParams.push(userId)
        whereClauses.push(`user_id = $${quizParams.length}::uuid`)
      }

      return pool.query(
        `SELECT
           COALESCE(AVG(
             CASE WHEN total_questions > 0
               THEN (quiz_score::numeric / total_questions::numeric) * 100
               ELSE NULL
             END
           ), 0)::float AS avg_quiz_score
         FROM user_quiz_attempts
         WHERE attempted_at BETWEEN $1::timestamptz AND $2::timestamptz
           ${whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : ''}`,
        quizParams
      )
    })(),
    (() => {
      const authParams: any[] = [range.from, range.to]
      let userClause = ''
      if (userId) {
        authParams.push(userId)
        userClause = `AND user_id = $3::uuid`
      }

      return pool.query(
        `SELECT COALESCE(source, 'unknown') AS source, COUNT(*)::int AS value
         FROM analytics_events
         WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
           AND event_type = 'signin_success'
           ${userClause}
         GROUP BY COALESCE(source, 'unknown')
         ORDER BY value DESC`,
        authParams
      )
    })(),
  ])

  const trackedTopics = completionResult.rows[0]?.tracked_topics ?? 0
  const completedTopics = completionResult.rows[0]?.completed_topics ?? 0
  const completionRate = trackedTopics > 0
    ? Number(((completedTopics / trackedTopics) * 100).toFixed(2))
    : 0

  return {
    totalUsers: usersResult.rows[0]?.total_users ?? 0,
    dau: activeResult.rows[0]?.dau ?? 0,
    wau: activeResult.rows[0]?.wau ?? 0,
    mau: activeResult.rows[0]?.mau ?? 0,
    trackedTopics,
    completedTopics,
    completionRate,
    avgQuizScore: Number((quizResult.rows[0]?.avg_quiz_score ?? 0).toFixed(2)),
    authSources: authSourceResult.rows.map((row: any) => ({
      source: row.source,
      value: row.value,
    })),
    range,
  }
}

const getTimeseries = async ({ from, to, subjectId, userId, metric = 'active_users', granularity = 'day' }: any = {}) => {
  const range = buildRange({ from, to })
  const dateTrunc = DATE_TRUNC_BY_GRANULARITY[granularity] || DATE_TRUNC_BY_GRANULARITY.day

  let query = ''
  let queryParams: any[] = [range.from, range.to]

  if (metric === 'user_growth') {
    let userClause = ''
    if (userId) {
      queryParams.push(userId)
      userClause = `AND id = $3::uuid`
    }

    query = `
      SELECT DATE_TRUNC('${dateTrunc}', created_at)::date AS bucket, COUNT(*)::int AS value
      FROM users
      WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
        ${userClause}
      GROUP BY bucket
      ORDER BY bucket ASC`
  } else if (metric === 'completion_trend') {
    const whereClauses: string[] = []
    if (subjectId) {
      queryParams.push(subjectId)
      whereClauses.push(`subject_id = $${queryParams.length}::text`)
    }
    if (userId) {
      queryParams.push(userId)
      whereClauses.push(`user_id = $${queryParams.length}::uuid`)
    }

    query = `
      SELECT DATE_TRUNC('${dateTrunc}', completed_at)::date AS bucket, COUNT(*)::int AS value
      FROM user_lesson_progress
      WHERE completed_at BETWEEN $1::timestamptz AND $2::timestamptz
        AND status = 'completed'
        ${whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : ''}
      GROUP BY bucket
      ORDER BY bucket ASC`
  } else if (metric === 'quiz_score_trend') {
    const whereClauses: string[] = []
    if (subjectId) {
      queryParams.push(subjectId)
      whereClauses.push(`subject_id = $${queryParams.length}::text`)
    }
    if (userId) {
      queryParams.push(userId)
      whereClauses.push(`user_id = $${queryParams.length}::uuid`)
    }

    query = `
      SELECT DATE_TRUNC('${dateTrunc}', attempted_at)::date AS bucket,
             COALESCE(AVG(
               CASE WHEN total_questions > 0
                 THEN (quiz_score::numeric / total_questions::numeric) * 100
                 ELSE NULL
               END
             ), 0)::float AS value
      FROM user_quiz_attempts
      WHERE attempted_at BETWEEN $1::timestamptz AND $2::timestamptz
        ${whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : ''}
      GROUP BY bucket
      ORDER BY bucket ASC`
  } else {
    let userClause = ''
    if (userId) {
      queryParams.push(userId)
      userClause = `AND user_id = $3::uuid`
    }

    query = `
      SELECT DATE_TRUNC('${dateTrunc}', activity_date::timestamptz)::date AS bucket,
             COUNT(DISTINCT user_id)::int AS value
      FROM user_activity_days
      WHERE activity_date BETWEEN $1::date AND $2::date
        ${userClause}
      GROUP BY bucket
      ORDER BY bucket ASC`
  }

  const { rows } = await pool.query(query, queryParams)
  return {
    metric,
    granularity,
    points: rows.map((row: any) => ({
      bucket: row.bucket,
      value: Number(row.value),
    })),
    range,
  }
}

const getBreakdown = async ({ from, to, subjectId, userId, type = 'subject' }: any = {}) => {
  const range = buildRange({ from, to })

  let query = ''
  let queryParams: any[] = [range.from, range.to]

  if (type === 'auth_source') {
    if (userId) {
      queryParams.push(userId)
    }
    query = `
      SELECT COALESCE(source, 'unknown') AS label, COUNT(*)::int AS value
      FROM analytics_events
      WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
        AND event_type = 'signin_success'
        ${userId ? 'AND user_id = $3::uuid' : ''}
      GROUP BY COALESCE(source, 'unknown')
      ORDER BY value DESC`
  } else if (type === 'quiz_distribution') {
    const whereClauses = []
    if (subjectId) {
      queryParams.push(subjectId)
      whereClauses.push(`subject_id = $${queryParams.length}::text`)
    }
    if (userId) {
      queryParams.push(userId)
      whereClauses.push(`user_id = $${queryParams.length}::uuid`)
    }

    query = `
      WITH scored AS (
        SELECT CASE
          WHEN total_questions <= 0 THEN NULL
          ELSE (quiz_score::numeric / total_questions::numeric) * 100
        END AS pct
        FROM user_quiz_attempts
        WHERE attempted_at BETWEEN $1::timestamptz AND $2::timestamptz
          ${whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : ''}
      )
      SELECT
        CASE
          WHEN pct < 20 THEN '0-19%'
          WHEN pct < 40 THEN '20-39%'
          WHEN pct < 60 THEN '40-59%'
          WHEN pct < 80 THEN '60-79%'
          ELSE '80-100%'
        END AS label,
        COUNT(*)::int AS value
      FROM scored
      WHERE pct IS NOT NULL
      GROUP BY label
      ORDER BY label ASC`
  } else {
    const whereClauses = []
    if (subjectId) {
      queryParams.push(subjectId)
      whereClauses.push(`subject_id = $${queryParams.length}::text`)
    }
    if (userId) {
      queryParams.push(userId)
      whereClauses.push(`user_id = $${queryParams.length}::uuid`)
    }

    query = `
      SELECT subject_id AS label,
             COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
             COUNT(*)::int AS total
      FROM user_lesson_progress
      WHERE updated_at BETWEEN $1::timestamptz AND $2::timestamptz
        ${whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : ''}
      GROUP BY subject_id
      ORDER BY subject_id ASC`
  }

  const { rows } = await pool.query(query, queryParams)

  if (type === 'subject') {
    return {
      type,
      items: rows.map((row: any) => ({
        label: row.label,
        completed: row.completed,
        total: row.total,
        completionRate: row.total > 0 ? Number(((row.completed / row.total) * 100).toFixed(2)) : 0,
      })),
      range,
    }
  }

  return {
    type,
    items: rows.map((row: any) => ({
      label: row.label,
      value: Number(row.value),
    })),
    range,
  }
}

export default {
  trackEvent,
  getSummary,
  getTimeseries,
  getBreakdown,
}
