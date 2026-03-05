const DEFAULT_SUPERADMIN_EMAILS = ['kelajakmerosi@gmail.com']

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const normalizePhone = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('+')) return raw
  const digitsOnly = raw.replace(/\D/g, '')
  if (digitsOnly.startsWith('998') && digitsOnly.length === 12) return `+${digitsOnly}`
  return raw
}

const parseList = (rawValue, normalizer) =>
  String(rawValue || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizer(entry))

const getAdminEmails = () => new Set(parseList(process.env.ADMIN_EMAILS, normalizeEmail))
const getAdminPhones = () => new Set(parseList(process.env.ADMIN_PHONES, normalizePhone))

const getSuperAdminEmails = () => {
  const configured = parseList(process.env.SUPERADMIN_EMAILS, normalizeEmail)
  if (configured.length > 0) return new Set(configured)
  return new Set(DEFAULT_SUPERADMIN_EMAILS.map((email) => normalizeEmail(email)))
}

const getSuperAdminPhones = () => new Set(parseList(process.env.SUPERADMIN_PHONES, normalizePhone))

const getAnyAdminEmails = () => new Set([...getAdminEmails(), ...getSuperAdminEmails()])
const getAnyAdminPhones = () => new Set([...getAdminPhones(), ...getSuperAdminPhones()])

const isAllowlistAdmin = (user) => {
  if (!user || typeof user !== 'object') return false
  const email = normalizeEmail(user.email)
  const phone = normalizePhone(user.phone)
  const emails = getAdminEmails()
  const phones = getAdminPhones()
  return Boolean((email && emails.has(email)) || (phone && phones.has(phone)))
}

const isAllowlistSuperAdmin = (user) => {
  if (!user || typeof user !== 'object') return false
  const email = normalizeEmail(user.email)
  const phone = normalizePhone(user.phone)
  const emails = getSuperAdminEmails()
  const phones = getSuperAdminPhones()
  return Boolean((email && emails.has(email)) || (phone && phones.has(phone)))
}

const isDbRoleAdmin = (user) => {
  if (!user || typeof user !== 'object') return false
  const role = String(user.role || '').toLowerCase()
  return role === 'admin' || role === 'superadmin'
}

const isDbRoleSuperAdmin = (user) => {
  if (!user || typeof user !== 'object') return false
  return String(user.role || '').toLowerCase() === 'superadmin'
}

const getAdminLevel = (user) => {
  if (isDbRoleSuperAdmin(user) || isAllowlistSuperAdmin(user)) return 'superadmin'
  if (isDbRoleAdmin(user) || isAllowlistAdmin(user)) return 'admin'
  return 'none'
}

const getAdminSource = (user) => {
  const hasDbRole = isDbRoleAdmin(user) || isDbRoleSuperAdmin(user)
  const hasAllowlist = isAllowlistAdmin(user) || isAllowlistSuperAdmin(user)

  if (hasDbRole && hasAllowlist) return 'both'
  if (hasDbRole) return 'db_role'
  if (hasAllowlist) return 'allowlist'
  return 'none'
}

const isAdminUser = (user) => getAdminLevel(user) !== 'none'
const isSuperAdminUser = (user) => getAdminLevel(user) === 'superadmin'

// Backward-compatible alias
const isConfiguredAdmin = (user) => isAdminUser(user)

module.exports = {
  isConfiguredAdmin,
  isAllowlistAdmin,
  isAllowlistSuperAdmin,
  isDbRoleAdmin,
  isDbRoleSuperAdmin,
  isAdminUser,
  isSuperAdminUser,
  getAdminLevel,
  getAdminSource,
  getAdminEmails,
  getAdminPhones,
  getSuperAdminEmails,
  getSuperAdminPhones,
  getAnyAdminEmails,
  getAnyAdminPhones,
  normalizeEmail,
  normalizePhone,
}
