const { pool } = require('../config/db')

const mapJob = (row) => {
  if (!row) return null
  return {
    id: row.id,
    uploaderId: row.uploader_id,
    subjectId: row.subject_id,
    sourceType: row.source_type,
    status: row.status,
    sourceStorageKey: row.source_storage_key,
    parseOutput: row.parse_output_json || {},
    error: row.error_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const create = async ({
  uploaderId,
  subjectId,
  sourceType,
  sourceStorageKey,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO content_upload_jobs (uploader_id, subject_id, source_type, status, source_storage_key)
     VALUES ($1, $2, $3, 'uploaded', $4)
     RETURNING id, uploader_id, subject_id, source_type, status, source_storage_key, parse_output_json, error_json, created_at, updated_at`,
    [uploaderId, subjectId, sourceType, sourceStorageKey],
  )

  return mapJob(rows[0])
}

const markNeedsReview = async ({ jobId, parseOutput }) => {
  const { rows } = await pool.query(
    `UPDATE content_upload_jobs
     SET status = 'needs_review',
         parse_output_json = $2::jsonb,
         error_json = '{}'::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, uploader_id, subject_id, source_type, status, source_storage_key, parse_output_json, error_json, created_at, updated_at`,
    [jobId, JSON.stringify(parseOutput || {})],
  )
  return mapJob(rows[0])
}

const markFailed = async ({ jobId, error }) => {
  const { rows } = await pool.query(
    `UPDATE content_upload_jobs
     SET status = 'failed',
         error_json = $2::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, uploader_id, subject_id, source_type, status, source_storage_key, parse_output_json, error_json, created_at, updated_at`,
    [jobId, JSON.stringify(error || {})],
  )
  return mapJob(rows[0])
}

const getById = async (jobId) => {
  const { rows } = await pool.query(
    `SELECT id, uploader_id, subject_id, source_type, status, source_storage_key, parse_output_json, error_json, created_at, updated_at
     FROM content_upload_jobs
     WHERE id = $1
     LIMIT 1`,
    [jobId],
  )
  return mapJob(rows[0])
}

module.exports = {
  create,
  markNeedsReview,
  markFailed,
  getById,
}
