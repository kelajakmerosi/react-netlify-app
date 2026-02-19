import styles from '../../styles/components.module.css'
import { cn, initials as getInitials } from '../../utils'
import type { TopicStatus } from '../../types'
import type { ReactNode } from 'react'

// ─── Avatar ───────────────────────────────────────────────
interface AvatarProps { name: string; size?: number }
export function Avatar({ name, size = 40 }: AvatarProps) {
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────
const BADGE_CLASSES: Record<TopicStatus, string> = {
  completed:  styles.badgeCompleted,
  inprogress: styles.badgeInprogress,
  onhold:     styles.badgeOnhold,
  locked:     styles.badgeLocked,
}
const STATUS_ICONS: Record<TopicStatus, string> = {
  completed:'●', inprogress:'●', onhold:'●', locked:'○',
}

interface StatusBadgeProps { status: TopicStatus; label: string }
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={cn(styles.badge, BADGE_CLASSES[status])}>
      <span>{STATUS_ICONS[status]}</span>
      {label}
    </span>
  )
}

// ─── ProgressBar ─────────────────────────────────────────
interface ProgressBarProps { value: number; color?: string; height?: number }
export function ProgressBar({ value, color, height = 6 }: ProgressBarProps) {
  return (
    <div className={styles.progressBar} style={{ height }}>
      <div
        className={styles.progressFill}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || undefined }}
      />
    </div>
  )
}

// ─── Alert ────────────────────────────────────────────────
type AlertVariant = 'warning' | 'error' | 'success' | 'info'
const ALERT_CLASSES: Record<AlertVariant, string> = {
  warning: styles.alertWarning,
  error:   styles.alertError,
  success: styles.alertSuccess,
  info:    styles.alertInfo,
}
const ALERT_ICONS: Record<AlertVariant, string> = {
  warning:'⚠', error:'⚠', success:'✅', info:'ℹ',
}

interface AlertProps { variant: AlertVariant; children: ReactNode; className?: string }
export function Alert({ variant, children, className }: AlertProps) {
  return (
    <div className={cn(styles.alert, ALERT_CLASSES[variant], className)}>
      <span>{ALERT_ICONS[variant]}</span>
      {children}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────
interface DividerProps { margin?: string }
export function Divider({ margin }: DividerProps) {
  return <div className={styles.divider} style={margin ? { margin } : undefined} />
}

// ─── Tabs ─────────────────────────────────────────────────
interface Tab { id: string; label: string }
interface TabsProps { tabs: Tab[]; active: string; onChange: (id: string) => void }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className={styles.tabs}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(styles.tab, active === tab.id && styles.tabActive)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── StatCard ────────────────────────────────────────────
interface StatCardProps { icon: string; value: string | number; label: string }
export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div style={{ textAlign:'center', padding:'20px 16px' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div className={styles.statNumber}>{value}</div>
      <div style={{ fontSize: 13, color:'var(--text-2)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
