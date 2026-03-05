const { pool } = require('../config/db')

const listAdminScopes = async ({ userId, subjectId } = {}) => {
  const params = []
  const where = []

  if (userId) {
    params.push(userId)
    where.push(`admin_user_id = $${params.length}`)
  }
  if (subjectId) {
    params.push(subjectId)
    where.push(`subject_id = $${params.length}`)
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

const assignAdminScope = async ({ adminUserId, subjectId, canManageContent = true, canManagePricing = false, createdBy = null }) => {
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

const revokeAdminScope = async (scopeId) => {
  const { rows } = await pool.query(
    `DELETE FROM admin_subject_scopes
     WHERE id = $1
     RETURNING id, admin_user_id, subject_id`,
    [scopeId],
  )
  return rows[0] ?? null
}

const hasAdminScope = async ({ userId, subjectId, requireContent = false, requirePricing = false }) => {
  const { rows } = await pool.query(
    `SELECT id, can_manage_content, can_manage_pricing
     FROM admin_subject_scopes
     WHERE admin_user_id = $1
       AND subject_id = $2
     LIMIT 1`,
    [userId, subjectId],
  )

  const row = rows[0]
  if (!row) return false
  if (requireContent && !row.can_manage_content) return false
  if (requirePricing && !row.can_manage_pricing) return false
  return true
}

const listTeacherScopes = async ({ userId, subjectId, status } = {}) => {
  const params = []
  const where = []

  if (userId) {
    params.push(userId)
    where.push(`teacher_user_id = $${params.length}`)
  }
  if (subjectId) {
    params.push(subjectId)
    where.push(`subject_id = $${params.length}`)
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

const assignTeacherScope = async ({ teacherUserId, subjectId, status = 'active', approvedBy = null }) => {
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

const revokeTeacherScope = async (scopeId) => {
  const { rows } = await pool.query(
    `DELETE FROM teacher_subject_scopes
     WHERE id = $1
     RETURNING id, teacher_user_id, subject_id`,
    [scopeId],
  )

  return rows[0] ?? null
}

const hasTeacherScope = async ({ userId, subjectId }) => {
  const { rows } = await pool.query(
    `SELECT id
     FROM teacher_subject_scopes
     WHERE teacher_user_id = $1
       AND subject_id = $2
       AND status = 'active'
     LIMIT 1`,
    [userId, subjectId],
  )

  return Boolean(rows[0])
}

module.exports = {
  listAdminScopes,
  assignAdminScope,
  revokeAdminScope,
  hasAdminScope,
  listTeacherScopes,
  assignTeacherScope,
  revokeTeacherScope,
  hasTeacherScope,
}
