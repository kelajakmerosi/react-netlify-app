const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)
}

const isFeatureEnabled = (name, fallback = false) => toBool(process.env[name], fallback)

const isPaymeClickEnabled = () => isFeatureEnabled('FEATURE_PAYME_CLICK', false)
const isExamsCommerceEnabled = () => isFeatureEnabled('FEATURE_EXAMS_COMMERCE', true)

module.exports = {
  isFeatureEnabled,
  isPaymeClickEnabled,
  isExamsCommerceEnabled,
}
