// ─── Number helpers ───────────────────────────────────────
export const pct = (value: number, total: number): number =>
  total === 0 ? 0 : Math.round((value / total) * 100)

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

// ─── String helpers ───────────────────────────────────────
export const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

export const truncate = (str: string, len = 40) =>
  str.length > len ? str.slice(0, len) + '…' : str

// ─── Date helpers ─────────────────────────────────────────
export const relativeTime = (timestamp: number, lang = 'uz'): string => {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return lang === 'uz' ? 'Hozir' : 'Just now'
  if (mins < 60)  return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

// ─── Class name joiner ────────────────────────────────────
export const cn = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(' ')
