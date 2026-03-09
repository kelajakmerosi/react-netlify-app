const DEFAULT_SUPERADMIN_EMAILS = ['kelajakmerosi@gmail.com']

export const normalizeEmail = (value?: string | null): string => String(value || '').trim().toLowerCase()

export const normalizePhone = (value?: string | null): string => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('+')) return raw
  const digitsOnly = raw.replace(/\D/g, '')
  if (digitsOnly.startsWith('998') && digitsOnly.length === 12) return `+${digitsOnly}`
  return raw
}

const parseList = (rawValue: string | undefined, normalizer: (val: string) => string): string[] =>
  String(rawValue || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizer(entry))

export const getAdminEmails = (): Set<string> => new Set(parseList(process.env.ADMIN_EMAILS, normalizeEmail))
export const getAdminPhones = (): Set<string> => new Set(parseList(process.env.ADMIN_PHONES, normalizePhone))

export const getSuperAdminEmails = (): Set<string> => {
  const configured = parseList(process.env.SUPERADMIN_EMAILS, normalizeEmail)
  if (configured.length > 0) return new Set(configured)
  return new Set(DEFAULT_SUPERADMIN_EMAILS.map((email) => normalizeEmail(email)))
}

export const getSuperAdminPhones = (): Set<string> => new Set(parseList(process.env.SUPERADMIN_PHONES, normalizePhone))

export const getAnyAdminEmails = (): Set<string> => new Set([...Array.from(getAdminEmails()), ...Array.from(getSuperAdminEmails())])
export const getAnyAdminPhones = (): Set<string> => new Set([...Array.from(getAdminPhones()), ...Array.from(getSuperAdminPhones())])

export interface AdminAccessUser {
  email?: string | null
  phone?: string | null
  role?: string | null
}

export const isAllowlistAdmin = (user?: AdminAccessUser | null): boolean => {
  if (!user || typeof user !== 'object') return false
  const email = normalizeEmail(user.email)
  const phone = normalizePhone(user.phone)
  const emails = getAdminEmails()
  const phones = getAdminPhones()
  return Boolean((email && emails.has(email)) || (phone && phones.has(phone)))
}

export const isAllowlistSuperAdmin = (user?: AdminAccessUser | null): boolean => {
  if (!user || typeof user !== 'object') return false
  const email = normalizeEmail(user.email)
  const phone = normalizePhone(user.phone)
  const emails = getSuperAdminEmails()
  const phones = getSuperAdminPhones()
  return Boolean((email && emails.has(email)) || (phone && phones.has(phone)))
}

export const isDbRoleAdmin = (user?: AdminAccessUser | null): boolean => {
  if (!user || typeof user !== 'object') return false
  const role = String(user.role || '').toLowerCase()
  return role === 'admin' || role === 'superadmin'
}

export const isDbRoleSuperAdmin = (user?: AdminAccessUser | null): boolean => {
  if (!user || typeof user !== 'object') return false
  return String(user.role || '').toLowerCase() === 'superadmin'
}

export const getAdminLevel = (user?: AdminAccessUser | null): 'superadmin' | 'admin' | 'none' => {
  if (isDbRoleSuperAdmin(user) || isAllowlistSuperAdmin(user)) return 'superadmin'
  if (isDbRoleAdmin(user) || isAllowlistAdmin(user)) return 'admin'
  return 'none'
}

export const getAdminSource = (user?: AdminAccessUser | null): 'both' | 'db_role' | 'allowlist' | 'none' => {
  const hasDbRole = isDbRoleAdmin(user) || isDbRoleSuperAdmin(user)
  const hasAllowlist = isAllowlistAdmin(user) || isAllowlistSuperAdmin(user)

  if (hasDbRole && hasAllowlist) return 'both'
  if (hasDbRole) return 'db_role'
  if (hasAllowlist) return 'allowlist'
  return 'none'
}

export const isAdminUser = (user?: AdminAccessUser | null): boolean => getAdminLevel(user) !== 'none'
export const isSuperAdminUser = (user?: AdminAccessUser | null): boolean => getAdminLevel(user) === 'superadmin'

// Backward-compatible alias
export const isConfiguredAdmin = (user?: AdminAccessUser | null): boolean => isAdminUser(user)
