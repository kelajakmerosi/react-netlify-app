import bcrypt from 'bcryptjs'
import { pool } from '../config/db'

const OTP_DIGITS = 6

const generateCode = () => {
  const max = 10 ** OTP_DIGITS
  const min = 10 ** (OTP_DIGITS - 1)
  return String(Math.floor(Math.random() * (max - min)) + min)
}

interface CreateCodeParams {
  phone: string
  requestIp?: string | null
  ttlSec?: number
  maxAttempts?: number
  purpose?: string | null
  userId?: string | number | null
}

const createCode = async ({
  phone,
  requestIp,
  ttlSec = 300,
  maxAttempts = 5,
  purpose = 'legacy_login',
  userId = null,
}: CreateCodeParams) => {
  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + ttlSec * 1000)

  const { rows } = await pool.query(
    `INSERT INTO phone_auth_codes (phone, code_hash, expires_at, max_attempts, request_ip, purpose, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [phone, codeHash, expiresAt, maxAttempts, requestIp || null, purpose, userId]
  )

  return { id: rows[0]?.id, code, expiresAt }
}

const getLastActiveCode = async (phone: string, purpose: string | null = null) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM phone_auth_codes
     WHERE phone = $1
       AND ($2::text IS NULL OR purpose = $2)
       AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose]
  )
  return rows[0] ?? null
}

interface CountRecentParams {
  phone: string
  requestIp?: string | null
  windowSec: number
  purpose?: string | null
}

const countRecentRequests = async ({ phone, requestIp, windowSec, purpose = null }: CountRecentParams) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM phone_auth_codes
     WHERE phone = $1
       AND created_at >= NOW() - ($2::text || ' seconds')::interval
       AND ($3::text IS NULL OR request_ip = $3)
       AND ($4::text IS NULL OR purpose = $4)`,
    [phone, String(windowSec), requestIp || null, purpose]
  )
  return rows[0]?.count ?? 0
}

interface VerifyCodeParams {
  phone: string
  code: string
  purpose?: string | null
}

const verifyCode = async ({ phone, code, purpose = null }: VerifyCodeParams) => {
  const row = await getLastActiveCode(phone, purpose)
  if (!row) return { ok: false, reason: 'not_found' }

  const now = Date.now()
  if (row.consumed_at) return { ok: false, reason: 'consumed' }
  if (new Date(row.expires_at).getTime() < now) return { ok: false, reason: 'expired', row }
  if (row.attempts >= row.max_attempts) return { ok: false, reason: 'attempts_exceeded', row }

  const matched = await bcrypt.compare(code, row.code_hash)
  if (!matched) {
    await pool.query(
      `UPDATE phone_auth_codes
       SET attempts = attempts + 1
       WHERE id = $1`,
      [row.id]
    )
    return { ok: false, reason: 'invalid', row }
  }

  await pool.query(
    `UPDATE phone_auth_codes
     SET consumed_at = NOW()
     WHERE id = $1`,
    [row.id]
  )

  return { ok: true, row }
}

const deleteById = async (id: string | number) => {
  await pool.query('DELETE FROM phone_auth_codes WHERE id = $1', [id])
}

export default {
  createCode,
  getLastActiveCode,
  countRecentRequests,
  verifyCode,
  deleteById,
}
