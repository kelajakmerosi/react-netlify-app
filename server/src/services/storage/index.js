const trimSlash = (value) => String(value || '').replace(/\/+$/, '')

const buildObjectStorageUrl = (storageKey) => {
  const endpoint = trimSlash(process.env.S3_ENDPOINT)
  const bucket = String(process.env.S3_BUCKET || '').trim()
  if (!endpoint || !bucket) return null
  return `${endpoint}/${bucket}/${encodeURIComponent(storageKey)}`
}

const getAssetAccess = (storageKey) => {
  const provider = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase()

  if (provider === 's3' || provider === 'r2' || provider === 'minio') {
    return {
      provider,
      storageKey,
      url: buildObjectStorageUrl(storageKey),
    }
  }

  return {
    provider: 'local',
    storageKey,
    // In local mode we return key only; app can resolve to static/file server strategy.
    url: null,
  }
}

module.exports = {
  getAssetAccess,
}
