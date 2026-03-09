import { pool } from '../config/db'

const toNumber = (value: any) => Number(value || 0)

const mapPack = (row: any) => {
  if (!row) return null
  return {
    id: row.id,
    subjectId: row.subject_id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description || '',
    priceUzs: toNumber(row.price_uzs),
    status: row.status,
    isActive: Boolean(row.is_active),
    approvedBy: row.approved_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const createDraft = async ({ subjectId, ownerUserId, title, description = '', priceUzs = 0 }: any) => {
  const { rows } = await pool.query(
    `INSERT INTO material_packs (subject_id, owner_user_id, title, description, price_uzs, status, is_active)
     VALUES ($1, $2, $3, $4, $5, 'draft', TRUE)
     RETURNING id, subject_id, owner_user_id, title, description, price_uzs, status, is_active, approved_by, published_at, created_at, updated_at`,
    [subjectId, ownerUserId, title, description, priceUzs],
  )

  return mapPack(rows[0])
}

const getById = async (id: any) => {
  const { rows } = await pool.query(
    `SELECT id, subject_id, owner_user_id, title, description, price_uzs, status, is_active, approved_by, published_at, created_at, updated_at
     FROM material_packs
     WHERE id = $1
     LIMIT 1`,
    [id],
  )

  return mapPack(rows[0])
}

const updateDraft = async (id: any, patch: any = {}) => {
  const { rows } = await pool.query(
    `UPDATE material_packs
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         price_uzs = COALESCE($3, price_uzs),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, subject_id, owner_user_id, title, description, price_uzs, status, is_active, approved_by, published_at, created_at, updated_at`,
    [
      patch.title ?? null,
      patch.description ?? null,
      patch.priceUzs ?? null,
      patch.isActive === undefined ? null : Boolean(patch.isActive),
      id,
    ],
  )

  return mapPack(rows[0])
}

const setStatus = async (id: any, { status, reviewerId = null }: any) => {
  const publishNow = status === 'published'
  const { rows } = await pool.query(
    `UPDATE material_packs
     SET status = $1,
         approved_by = $2,
         published_at = CASE WHEN $3::boolean THEN NOW() ELSE published_at END,
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, subject_id, owner_user_id, title, description, price_uzs, status, is_active, approved_by, published_at, created_at, updated_at`,
    [status, reviewerId, publishNow, id],
  )

  return mapPack(rows[0])
}

const listPublishedCatalog = async ({ subjectId }: any = {}) => {
  const params = []
  let subjectClause = ''
  if (subjectId) {
    params.push(subjectId)
    subjectClause = `AND subject_id = $${params.length}::text`
  }

  const { rows } = await pool.query(
    `SELECT id, subject_id, owner_user_id, title, description, price_uzs, status, is_active, approved_by, published_at, created_at, updated_at
     FROM material_packs
     WHERE status = 'published'
       AND is_active = TRUE
       ${subjectClause}
     ORDER BY created_at DESC`,
    params,
  )

  return rows.map(mapPack)
}

const addAsset = async ({ packId, storageKey, fileName, mimeType = null, sizeBytes = 0, checksum = null, uploadedBy = null }: any) => {
  const { rows } = await pool.query(
    `INSERT INTO material_pack_assets (pack_id, storage_key, file_name, mime_type, size_bytes, checksum, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, pack_id, storage_key, file_name, mime_type, size_bytes, checksum, uploaded_by, created_at`,
    [packId, storageKey, fileName, mimeType, sizeBytes, checksum, uploadedBy],
  )

  return rows[0] ?? null
}

const listAssets = async (packId: any) => {
  const { rows } = await pool.query(
    `SELECT id, pack_id, storage_key, file_name, mime_type, size_bytes, checksum, uploaded_by, created_at
     FROM material_pack_assets
     WHERE pack_id = $1
     ORDER BY created_at ASC`,
    [packId],
  )

  return rows
}

const grantEntitlement = async ({ userId, packId, sourcePaymentId }: any) => {
  const { rows } = await pool.query(
    `INSERT INTO material_entitlements (user_id, pack_id, source_payment_id, granted_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (source_payment_id) DO NOTHING
     RETURNING id, user_id, pack_id, source_payment_id, granted_at, revoked_at`,
    [userId, packId, sourcePaymentId],
  )

  return rows[0] ?? null
}

const listLibraryByUser = async (userId: any) => {
  const { rows } = await pool.query(
    `SELECT
       me.id AS entitlement_id,
       me.granted_at,
       mp.id AS pack_id,
       mp.subject_id,
       mp.title,
       mp.description,
       mp.price_uzs,
       mpa.id AS asset_id,
       mpa.storage_key,
       mpa.file_name,
       mpa.mime_type,
       mpa.size_bytes,
       mpa.created_at AS asset_created_at
     FROM material_entitlements me
     JOIN material_packs mp ON mp.id = me.pack_id
     LEFT JOIN material_pack_assets mpa ON mpa.pack_id = mp.id
     WHERE me.user_id = $1::uuid
       AND me.revoked_at IS NULL
     ORDER BY me.granted_at DESC, mpa.created_at ASC`,
    [userId],
  )

  const byPack = new Map()
  for (const row of rows) {
    if (!byPack.has(row.pack_id)) {
      byPack.set(row.pack_id, {
        entitlementId: row.entitlement_id,
        grantedAt: row.granted_at,
        pack: {
          id: row.pack_id,
          subjectId: row.subject_id,
          title: row.title,
          description: row.description || '',
          priceUzs: toNumber(row.price_uzs),
        },
        assets: [],
      })
    }

    if (row.asset_id) {
      byPack.get(row.pack_id).assets.push({
        id: row.asset_id,
        storageKey: row.storage_key,
        fileName: row.file_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes || 0),
        createdAt: row.asset_created_at,
      })
    }
  }

  return Array.from(byPack.values())
}

const MaterialPack = {
  createDraft,
  getById,
  updateDraft,
  setStatus,
  listPublishedCatalog,
  addAsset,
  listAssets,
  grantEntitlement,
  listLibraryByUser,
}
export default MaterialPack
