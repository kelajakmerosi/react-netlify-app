import { pool } from '../config/db'

export interface ListAdminScopesParams {
  userId?: string | number
  subjectId?: string | number
}

const listAdminScopes = async ({ userId, subjectId }: ListAdminScopesParams = {}) => {
  const params: any[] = []
  const where: string[] = []

  if (userId) {
    params.push(userId)
    where.push(`admin_user_id = $${params.length}`)
  }
  if (subjectId) {
    params.push(subjectId)
    where.push(`subject_id = $${params.length}::text`)
  }

  const { rows } = await pool.query(
    `SELECT id, admin_user_id, subject_id, can_manage_content, can_manage_pricing, created_by, created_at
     FROM admin_subject_scopes
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC`,
    params,
  )

  return rows
}

export interface AssignAdminScopeParams {
  adminUserId: string | number
  subjectId: string | number
  canManageContent?: boolean
  canManagePricing?: boolean
  createdBy?: string | number | null
}

const assignAdminScope = async ({ adminUserId, subjectId, canManageContent = true, canManagePricing = false, createdBy = null }: AssignAdminScopeParams) => {
  const { rows } = await pool.query(
    `INSERT INTO admin_subject_scopes (admin_user_id, subject_id, can_manage_content, can_manage_pricing, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (admin_user_id, subject_id) DO UPDATE
       SET can_manage_content = EXCLUDED.can_manage_content,
           can_manage_pricing = EXCLUDED.can_manage_pricing,
           created_by = EXCLUDED.created_by
     RETURNING id, admin_user_id, subject_id, can_manage_content, can_manage_pricing, created_by, created_at`,
    [adminUserId, subjectId, Boolean(canManageContent), Boolean(canManagePricing), createdBy],
  )

  return rows[0] ?? null
}

const revokeAdminScope = async (scopeId: string | number) => {
  const { rows } = await pool.query(
    `DELETE FROM admin_subject_scopes
     WHERE id = $1
     RETURNING id, admin_user_id, subject_id`,
    [scopeId],
  )
  return rows[0] ?? null
}

export interface HasAdminScopeParams {
  userId: string | number
  subjectId: string | number
  requireContent?: boolean
  requirePricing?: boolean
}

const hasAdminScope = async ({ userId, subjectId, requireContent = false, requirePricing = false }: HasAdminScopeParams) => {
  const { rows } = await pool.query(
    `SELECT id, can_manage_content, can_manage_pricing
     FROM admin_subject_scopes
     WHERE admin_user_id = $1::uuid
       AND subject_id = $2::text
     LIMIT 1`,
    [userId, subjectId],
  )

  const row = rows[0]
  if (!row) return false
  if (requireContent && !row.can_manage_content) return false
  if (requirePricing && !row.can_manage_pricing) return false
  return true
}

export interface ListTeacherScopesParams {
  userId?: string | number
  subjectId?: string | number
  status?: string
}

const listTeacherScopes = async ({ userId, subjectId, status }: ListTeacherScopesParams = {}) => {
  const params: any[] = []
  const where: string[] = []

  if (userId) {
    params.push(userId)
    where.push(`teacher_user_id = $${params.length}`)
  }
  if (subjectId) {
    params.push(subjectId)
    where.push(`subject_id = $${params.length}::text`)
  }
  if (status) {
    params.push(status)
    where.push(`status = $${params.length}`)
  }

  const { rows } = await pool.query(
    `SELECT id, teacher_user_id, subject_id, status, approved_by, created_at
     FROM teacher_subject_scopes
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC`,
    params,
  )

  return rows
}

export interface AssignTeacherScopeParams {
  teacherUserId: string | number
  subjectId: string | number
  status?: string
  approvedBy?: string | number | null
}

const assignTeacherScope = async ({ teacherUserId, subjectId, status = 'active', approvedBy = null }: AssignTeacherScopeParams) => {
  const { rows } = await pool.query(
    `INSERT INTO teacher_subject_scopes (teacher_user_id, subject_id, status, approved_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (teacher_user_id, subject_id) DO UPDATE
       SET status = EXCLUDED.status,
           approved_by = EXCLUDED.approved_by
     RETURNING id, teacher_user_id, subject_id, status, approved_by, created_at`,
    [teacherUserId, subjectId, status, approvedBy],
  )

  return rows[0] ?? null
}

const revokeTeacherScope = async (scopeId: string | number) => {
  const { rows } = await pool.query(
    `DELETE FROM teacher_subject_scopes
     WHERE id = $1
     RETURNING id, teacher_user_id, subject_id`,
    [scopeId],
  )

  return rows[0] ?? null
}

export interface HasTeacherScopeParams {
  userId: string | number
  subjectId: string | number
}

const hasTeacherScope = async ({ userId, subjectId }: HasTeacherScopeParams) => {
  const { rows } = await pool.query(
    `SELECT id
     FROM teacher_subject_scopes
     WHERE teacher_user_id = $1::uuid
       AND subject_id = $2::text
       AND status = 'active'
     LIMIT 1`,
    [userId, subjectId],
  )

  return Boolean(rows[0])
}

export default {
  listAdminScopes,
  assignAdminScope,
  revokeAdminScope,
  hasAdminScope,
  listTeacherScopes,
  assignTeacherScope,
  revokeTeacherScope,
  hasTeacherScope,
}
