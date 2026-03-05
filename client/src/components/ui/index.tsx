import styles from '../../styles/components.module.css'
import { cn, initials as getInitials } from '../../utils'
import type { TopicStatus } from '../../types'
import type { ReactNode } from 'react'
export { Input } from './Input'
export { Modal } from './Modal'
export { Select } from './Select'
export { Textarea } from './Textarea'
export { SegmentedControl } from './SegmentedControl'
export { IconButton } from './IconButton'
import { 
  CheckCircle2, Circle, PauseCircle, Lock, 
  AlertTriangle, AlertCircle, Info 
} from 'lucide-react'

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
const STATUS_ICONS: Record<TopicStatus, ReactNode> = {
  completed:  <CheckCircle2 size={14} strokeWidth={2.5} />, 
  inprogress: <Circle size={14} strokeWidth={2.5} fill="currentColor" />, 
  onhold:     <PauseCircle size={14} strokeWidth={2.5} />, 
  locked:     <Lock size={14} strokeWidth={2.5} />,
}

interface StatusBadgeProps { status: TopicStatus; label: string; className?: string }
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn(styles.badge, BADGE_CLASSES[status], className)}>
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

const ALERT_ICONS: Record<AlertVariant, ReactNode> = {
  warning: <AlertTriangle size={20} />, 
  error:   <AlertCircle size={20} />, 
  success: <CheckCircle2 size={20} />, 
  info:    <Info size={20} />
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
    <div className={styles.tabs} role="tablist" aria-label="Topic sections">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`tab-panel-${tab.id}`}
          className={cn(styles.tab, active === tab.id && styles.tabActive)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

import { GlassCard } from './GlassCard'

// ─── StatCard ────────────────────────────────────────────
interface StatCardProps { icon: ReactNode; value: string | number; label: string }
export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <GlassCard className={styles.glassCard}>
      <div className={styles.statCardContent}>
        <div className={styles.statIcon}>{icon}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </GlassCard>
  )
}
