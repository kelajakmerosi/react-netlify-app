import crypto from 'crypto'
import { pool } from '../config/db'

const toNumber = (value: any) => Number(value || 0)

const toPublicPayment = (row: any) => {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    paymentType: row.payment_type,
    planKey: row.plan_key,
    subjectId: row.subject_id,
    amountUzs: toNumber(row.amount_uzs),
    provider: row.provider,
    status: row.status,
    externalId: row.external_id,
    payload: row.payload || {},
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }
}

const createCheckoutIntent = async ({
  userId,
  paymentType,
  provider,
  amountUzs,
  subjectId = null,
  planKey = null,
  payload = {},
}: any) => {
  const externalId = payload.externalId || crypto.randomUUID()
  const isManualProvider = provider === 'manual'
  const status = isManualProvider ? 'paid' : 'pending'

  const { rows } = await pool.query(
    `INSERT INTO payments (user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CASE WHEN $7 = 'paid' THEN NOW() ELSE NULL END)
     RETURNING id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at`,
    [
      userId,
      paymentType,
      planKey,
      subjectId,
      amountUzs,
      provider,
      status,
      externalId,
      JSON.stringify(payload || {}),
    ],
  )

  return toPublicPayment(rows[0])
}

const findByProviderExternalId = async ({ provider, externalId }: any) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at
     FROM payments
     WHERE provider = $1
       AND external_id = $2
     LIMIT 1`,
    [provider, externalId],
  )

  return toPublicPayment(rows[0])
}

const getById = async (id: any) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at
     FROM payments
     WHERE id = $1
     LIMIT 1`,
    [id],
  )

  return toPublicPayment(rows[0])
}

const findByUserId = async (userId: any) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at
     FROM payments
     WHERE user_id = $1::uuid
     ORDER BY created_at DESC`,
    [userId],
  )

  return rows.map(toPublicPayment) as any
}

const attachCheckoutContext = async ({ paymentId, userId, checkoutContext = {} }: any) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const currentRes = await client.query(
      `SELECT id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at
       FROM payments
       WHERE id = $1
         AND user_id = $2
       LIMIT 1
       FOR UPDATE`,
      [paymentId, userId],
    )

    const current = currentRes.rows[0]
    if (!current) {
      await client.query('ROLLBACK')
      return null
    }

    const mergedPayload = {
      ...(current.payload || {}),
      checkoutContext: {
        ...(current.payload?.checkoutContext || {}),
        ...(checkoutContext || {}),
        updatedAt: new Date().toISOString(),
      },
    }

    const updatedRes = await client.query(
      `UPDATE payments
       SET payload = $1::jsonb
       WHERE id = $2
       RETURNING id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at`,
      [JSON.stringify(mergedPayload), paymentId],
    )

    await client.query('COMMIT')
    return toPublicPayment(updatedRes.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const markWebhookStatus = async ({ provider, externalId, status, payload = {} }: any) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const currentRes = await client.query(
      `SELECT id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at
       FROM payments
       WHERE provider = $1
         AND external_id = $2
       LIMIT 1
       FOR UPDATE`,
      [provider, externalId],
    )

    const current = currentRes.rows[0]
    if (!current) {
      await client.query('ROLLBACK')
      return { payment: null, changed: false }
    }

    const mergedPayload = {
      ...(current.payload || {}),
      webhook: {
        ...(current.payload?.webhook || {}),
        ...payload,
      },
    }

    const shouldSetPaidAt = status === 'paid' && current.status !== 'paid'

    const updatedRes = await client.query(
      `UPDATE payments
       SET status = $1,
           payload = $2::jsonb,
           paid_at = CASE WHEN $3::boolean THEN NOW() ELSE paid_at END
       WHERE id = $4
       RETURNING id, user_id, payment_type, plan_key, subject_id, amount_uzs, provider, status, external_id, payload, paid_at, created_at`,
      [status, JSON.stringify(mergedPayload), shouldSetPaidAt, current.id],
    )

    await client.query('COMMIT')

    return {
      payment: toPublicPayment(updatedRes.rows[0]),
      changed: current.status !== status,
      wasPaidBefore: current.status === 'paid',
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const Payment = {
  createCheckoutIntent,
  findByProviderExternalId,
  getById,
  findByUserId,
  attachCheckoutContext,
  markWebhookStatus,
}
export default Payment
