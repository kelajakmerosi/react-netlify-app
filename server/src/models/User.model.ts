import bcrypt from 'bcryptjs'
import { pool } from '../config/db'
import {
  getAdminSource,
  getAnyAdminEmails,
  getAnyAdminPhones,
  isAdminUser,
  isSuperAdminUser,
  normalizeEmail,
  normalizePhone,
} from '../utils/adminAccess'

const PUBLIC_USER_FIELDS = Object.freeze([
  'id',
  'name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'phone_verified',
  'avatar',
  'role',
  'can_teach',
  'can_buy',
  'can_learn',
  'is_suspended',
  'video_quota',
  'test_quota',
  'created_at',
  'password_set_at',
])

const PUBLIC_SELECT = `
  id,
  name,
  first_name,
  last_name,
  email,
  phone,
  phone_verified,
  avatar,
  role,
  can_teach,
  can_buy,
  can_learn,
  is_suspended,
  video_quota,
  test_quota,
  provider,
  password_set_at,
  created_at
`

const PRIVATE_SELECT = `${PUBLIC_SELECT}, password`

export const toPublic = (row: any) => {
  if (!row || typeof row !== 'object') return null
  const safe: Record<string, any> = {}
  for (const field of PUBLIC_USER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(row, field)) safe[field] = row[field]
  }

  const adminSource = getAdminSource(row)

  return {
    id: safe.id,
    name: safe.name,
    firstName: safe.first_name ?? null,
    lastName: safe.last_name ?? null,
    email: safe.email ?? null,
    phone: safe.phone ?? null,
    phoneVerified: safe.phone_verified ?? false,
    avatar: safe.avatar,
    role: isSuperAdminUser(row)
      ? 'superadmin'
      : (isAdminUser(row) ? 'admin' : 'student'),
    capabilities: {
      canTeach: Boolean(safe.can_teach),
      canBuy: safe.can_buy !== false,
      canLearn: safe.can_learn !== false,
    },
    isSuspended: Boolean(safe.is_suspended),
    dbRole: safe.role ?? 'student',
    adminSource,
    quotas: {
      videoQuota: Number(safe.video_quota ?? 0),
      testQuota: Number(safe.test_quota ?? 0),
    },
    passwordSetAt: safe.password_set_at ?? null,
    createdAt: safe.created_at,
  }
}

export const findByEmail = async (email?: string | null, { withPassword = false } = {}) => {
  if (!email) return null
  const cols = withPassword ? PRIVATE_SELECT : PUBLIC_SELECT
  const { rows } = await pool.query(
    `SELECT ${cols}
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizeEmail(email)]
  )
  return rows[0] ?? null
}

export const findByPhone = async (phone?: string | null, { withPassword = false } = {}) => {
  if (!phone) return null
  const cols = withPassword ? PRIVATE_SELECT : PUBLIC_SELECT

  const { rows } = await pool.query(
    `SELECT ${cols}
     FROM users
     WHERE phone = $1
     LIMIT 1`,
    [normalizePhone(phone)]
  )
  return rows[0] ?? null
}

export interface FindIdentityParams {
  email?: string | null
  phone?: string | null
}

export const findByIdentity = async ({ email, phone }: FindIdentityParams, { withPassword = false } = {}) => {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedEmail && !normalizedPhone) return null

  const cols = withPassword ? PRIVATE_SELECT : PUBLIC_SELECT
  const { rows } = await pool.query(
    `SELECT ${cols}
     FROM users
     WHERE ($1::text IS NOT NULL AND email = $1)
        OR ($2::text IS NOT NULL AND phone = $2)
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail || null, normalizedPhone || null]
  )

  return rows[0] ?? null
}

export const findById = async (id: string | number) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_SELECT}
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export const listPublicSummaries = async () => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_SELECT}
     FROM users
     ORDER BY created_at DESC
     LIMIT 500`
  )
  return rows.map((row: any) => toPublic(row)).filter(Boolean)
}

export const countDbRoleAdmins = async () => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role IN ('admin', 'superadmin')`
  )
  return rows[0]?.count ?? 0
}

export const countDbRoleSuperAdmins = async () => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role = 'superadmin'`
  )
  return rows[0]?.count ?? 0
}

export const countAllowlistAdmins = async () => {
  const emails = Array.from(getAnyAdminEmails() || [])
  const phones = Array.from(getAnyAdminPhones() || [])
  if (emails.length === 0 && phones.length === 0) return 0

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE ($1::text[] IS NOT NULL AND email = ANY($1::text[]))
        OR ($2::text[] IS NOT NULL AND phone = ANY($2::text[]))`,
    [emails.length > 0 ? emails : null, phones.length > 0 ? phones : null]
  )
  return rows[0]?.count ?? 0
}

export interface CreateUserParams {
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  password?: string | null
  provider?: string | null
  googleId?: string | null
  phoneVerified?: boolean
}

export const create = async ({
  name,
  firstName = null,
  lastName = null,
  email = null,
  phone = null,
  password = null,
  provider = 'local',
  googleId = null,
  phoneVerified = false,
}: CreateUserParams) => {
  const hashed = password ? await bcrypt.hash(password, 12) : null
  const resolvedName = (name || '').trim() || [firstName, lastName].filter(Boolean).join(' ').trim() || `User ${String(phone || '').slice(-4)}`

  const { rows } = await pool.query(
    `INSERT INTO users (
      name,
      first_name,
      last_name,
      email,
      phone,
      phone_verified,
      password,
      provider,
      google_id,
      password_set_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $7::text IS NULL THEN NULL ELSE NOW() END)
     RETURNING ${PUBLIC_SELECT}`,
    [
      resolvedName,
      firstName,
      lastName,
      email ? normalizeEmail(email) : null,
      phone ? normalizePhone(phone) : null,
      Boolean(phoneVerified),
      hashed,
      provider,
      googleId,
    ]
  )
  return rows[0]
}

export interface FindOrCreatePhoneParams {
  phone: string
  name?: string | null
  allowCreate?: boolean
}

export const findOrCreateByPhone = async ({ phone, name, allowCreate = true }: FindOrCreatePhoneParams) => {
  const normalizedPhone = normalizePhone(phone)
  const existing = await findByPhone(normalizedPhone)
  if (existing) {
    await pool.query(
      `UPDATE users
       SET phone_verified = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [existing.id]
    )
    return { ...existing, phone_verified: true }
  }

  if (!allowCreate) return null

  const resolvedName = (name || '').trim() || `User ${normalizedPhone ? normalizedPhone.slice(-4) : ''}`
  const { rows } = await pool.query(
    `INSERT INTO users (name, phone, provider, phone_verified)
     VALUES ($1, $2, 'local', TRUE)
     RETURNING ${PUBLIC_SELECT}`,
    [resolvedName, normalizedPhone]
  )
  return rows[0]
}

export const verifyPassword = async (password?: string, passwordHash?: string | null) => {
  if (!passwordHash || !password) return false
  return bcrypt.compare(password, passwordHash)
}

export const setPassword = async (userId: string | number, newPassword: string) => {
  const hashed = await bcrypt.hash(newPassword, 12)
  const { rows } = await pool.query(
    `UPDATE users
     SET password = $1,
         password_set_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING ${PUBLIC_SELECT}`,
    [hashed, userId]
  )
  return rows[0] ?? null
}

export const markPhoneVerified = async (userId: string | number) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET phone_verified = TRUE,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${PUBLIC_SELECT}`,
    [userId]
  )
  return rows[0] ?? null
}

export const update = async (id: string | number, { name, avatar }: { name?: string, avatar?: string }) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE($1, name),
         avatar = COALESCE($2, avatar),
         updated_at = NOW()
     WHERE id = $3
     RETURNING ${PUBLIC_SELECT}`,
    [name, avatar, id]
  )
  return rows[0] ?? null
}

export interface UpdateProfileParams {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export const updateProfile = async (id: string | number, { firstName, lastName, email, phone }: UpdateProfileParams) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         name = TRIM(COALESCE($1, first_name, '') || ' ' || COALESCE($2, last_name, '')),
         updated_at = NOW()
     WHERE id = $5
     RETURNING ${PUBLIC_SELECT}`,
    [firstName, lastName, email, phone, id]
  )
  return rows[0] ?? null
}

export const setSuspension = async (id: string | number, isSuspended: boolean) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET is_suspended = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING ${PUBLIC_SELECT}`,
    [Boolean(isSuspended), id]
  )
  return rows[0] ?? null
}

export const updateRole = async (id: string | number, role: string) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET role = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING ${PUBLIC_SELECT}`,
    [role, id]
  )
  return rows[0] ?? null
}

export interface UpdateCapabilitiesParams {
  canTeach?: boolean
  canBuy?: boolean
  canLearn?: boolean
}

export const updateCapabilities = async (id: string | number, { canTeach, canBuy, canLearn }: UpdateCapabilitiesParams) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET can_teach = COALESCE($1, can_teach),
         can_buy = COALESCE($2, can_buy),
         can_learn = COALESCE($3, can_learn),
         updated_at = NOW()
     WHERE id = $4
     RETURNING ${PUBLIC_SELECT}`,
    [
      canTeach === undefined ? null : Boolean(canTeach),
      canBuy === undefined ? null : Boolean(canBuy),
      canLearn === undefined ? null : Boolean(canLearn),
      id,
    ]
  )
  return rows[0] ?? null
}

export interface GoogleUpsertParams {
  googleId: string
  email: string
  name?: string | null
  avatar?: string | null
}

export const upsertGoogle = async ({ googleId, email, name, avatar }: GoogleUpsertParams) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone, avatar, provider, google_id)
     VALUES ($1, $2, NULL, $3, 'google', $4)
     ON CONFLICT (email) DO UPDATE
       SET google_id = EXCLUDED.google_id,
           avatar = COALESCE(EXCLUDED.avatar, users.avatar),
           provider = 'google',
           updated_at = NOW()
     RETURNING ${PUBLIC_SELECT}`,
    [name, normalizeEmail(email), avatar ?? '', googleId]
  )
  return rows[0]
}

export const deleteById = async (id: string | number) => {
  const { rows } = await pool.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING ${PUBLIC_SELECT}`,
    [id]
  )
  return rows[0] ?? null
}

export default {
  findByEmail,
  findByPhone,
  findByIdentity,
  findById,
  findOrCreateByPhone,
  listPublicSummaries,
  countDbRoleAdmins,
  countDbRoleSuperAdmins,
  countAllowlistAdmins,
  create,
  verifyPassword,
  setPassword,
  markPhoneVerified,
  deleteById,
  update,
  updateProfile,
  setSuspension,
  updateRole,
  updateCapabilities,
  upsertGoogle,
  toPublic,
}
