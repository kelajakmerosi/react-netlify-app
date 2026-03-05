const { pool } = require('../config/db')

const PLAN_ORDER = ['free', 'pro', 'premium']

const parseIso = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const buildRange = ({ from, to } = {}) => {
  const end = parseIso(to) || new Date().toISOString()
  const fallbackStart = new Date(new Date(end).getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString()
  const start = parseIso(from) || fallbackStart
  return { from: start, to: end }
}

const toNumber = (value) => Number(value || 0)

const getPricingCatalog = async () => {
  const [plansRes, coursesRes] = await Promise.all([
    pool.query(
      `SELECT key, title, description, price_monthly_uzs, is_active, features, updated_at
       FROM pricing_plans`
    ),
    pool.query(
      `SELECT id, subject_id, subject_title, price_uzs, is_active, updated_at
       FROM course_prices
       ORDER BY subject_id ASC`
    ),
  ])

  const plans = plansRes.rows
    .sort((a, b) => PLAN_ORDER.indexOf(a.key) - PLAN_ORDER.indexOf(b.key))
    .map((row) => ({
      key: row.key,
      title: row.title,
      description: row.description || '',
      priceMonthlyUzs: toNumber(row.price_monthly_uzs),
      isActive: Boolean(row.is_active),
      features: Array.isArray(row.features) ? row.features : [],
      updatedAt: row.updated_at,
    }))

  const coursePrices = coursesRes.rows.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    subjectTitle: row.subject_title || '',
    priceUzs: toNumber(row.price_uzs),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at,
  }))

  return { plans, coursePrices }
}

const upsertPlan = async ({
  planKey,
  title,
  description = '',
  priceMonthlyUzs,
  isActive = true,
  features = [],
}) => {
  const { rows } = await pool.query(
    `INSERT INTO pricing_plans (key, title, description, price_monthly_uzs, is_active, features, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
       SET title = EXCLUDED.title,
           description = EXCLUDED.description,
           price_monthly_uzs = EXCLUDED.price_monthly_uzs,
           is_active = EXCLUDED.is_active,
           features = EXCLUDED.features,
           updated_at = NOW()
     RETURNING key, title, description, price_monthly_uzs, is_active, features, updated_at`,
    [planKey, title, description, priceMonthlyUzs, Boolean(isActive), JSON.stringify(features || [])]
  )

  const row = rows[0]
  return {
    key: row.key,
    title: row.title,
    description: row.description || '',
    priceMonthlyUzs: toNumber(row.price_monthly_uzs),
    isActive: Boolean(row.is_active),
    features: Array.isArray(row.features) ? row.features : [],
    updatedAt: row.updated_at,
  }
}

const upsertCoursePrice = async ({
  subjectId,
  subjectTitle = '',
  priceUzs,
  isActive = true,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO course_prices (subject_id, subject_title, price_uzs, is_active, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (subject_id) DO UPDATE
       SET subject_title = EXCLUDED.subject_title,
           price_uzs = EXCLUDED.price_uzs,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
     RETURNING id, subject_id, subject_title, price_uzs, is_active, updated_at`,
    [subjectId, subjectTitle, priceUzs, Boolean(isActive)]
  )

  const row = rows[0]
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectTitle: row.subject_title || '',
    priceUzs: toNumber(row.price_uzs),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at,
  }
}

const getFinanceSummary = async ({ from, to } = {}) => {
  const range = buildRange({ from, to })

  const [summaryRes, providerRes, typeRes, dailyRes] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_uzs ELSE 0 END), 0)::numeric AS total_revenue_uzs,
         COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount_uzs ELSE 0 END), 0)::numeric AS refunded_uzs,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
         COUNT(*) FILTER (WHERE payment_type = 'subscription' AND status = 'paid')::int AS subscription_paid_count,
         COUNT(*) FILTER (WHERE payment_type = 'course_purchase' AND status = 'paid')::int AS course_paid_count
       FROM payments
       WHERE paid_at BETWEEN $1::timestamptz AND $2::timestamptz`,
      [range.from, range.to]
    ),
    pool.query(
      `SELECT provider, COUNT(*)::int AS count,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_uzs ELSE 0 END), 0)::numeric AS revenue_uzs
       FROM payments
       WHERE paid_at BETWEEN $1::timestamptz AND $2::timestamptz
       GROUP BY provider
       ORDER BY revenue_uzs DESC`,
      [range.from, range.to]
    ),
    pool.query(
      `SELECT payment_type,
              COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_uzs ELSE 0 END), 0)::numeric AS revenue_uzs
       FROM payments
       WHERE paid_at BETWEEN $1::timestamptz AND $2::timestamptz
       GROUP BY payment_type`,
      [range.from, range.to]
    ),
    pool.query(
      `SELECT DATE_TRUNC('day', paid_at)::date AS bucket,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_uzs ELSE 0 END), 0)::numeric AS revenue_uzs
       FROM payments
       WHERE paid_at BETWEEN $1::timestamptz AND $2::timestamptz
       GROUP BY bucket
       ORDER BY bucket ASC`,
      [range.from, range.to]
    ),
  ])

  const summary = summaryRes.rows[0] || {}
  return {
    totalRevenueUzs: toNumber(summary.total_revenue_uzs),
    refundedUzs: toNumber(summary.refunded_uzs),
    paidCount: Number(summary.paid_count || 0),
    failedCount: Number(summary.failed_count || 0),
    subscriptionPaidCount: Number(summary.subscription_paid_count || 0),
    coursePaidCount: Number(summary.course_paid_count || 0),
    byProvider: providerRes.rows.map((row) => ({
      provider: row.provider,
      count: Number(row.count || 0),
      revenueUzs: toNumber(row.revenue_uzs),
    })),
    byType: typeRes.rows.map((row) => ({
      type: row.payment_type,
      paidCount: Number(row.paid_count || 0),
      revenueUzs: toNumber(row.revenue_uzs),
    })),
    dailyRevenue: dailyRes.rows.map((row) => ({
      bucket: row.bucket,
      revenueUzs: toNumber(row.revenue_uzs),
    })),
    range,
  }
}

module.exports = {
  getPricingCatalog,
  upsertPlan,
  upsertCoursePrice,
  getFinanceSummary,
}
