import type { CSSProperties } from 'react'
import { useLang } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { useSubjectStats } from '../hooks/useSubjectStats'
import { GlassCard } from '../components/ui/GlassCard'
import { Avatar, ProgressBar } from '../components/ui/index'
import { SUBJECT_NAMES } from '../constants'
import { renderSafeIcon } from '../utils/renderSafeIcon'
import {
  User,
  BarChart3,
  CheckCircle2,
  XCircle,
  GraduationCap,
  ClipboardCheck,
} from 'lucide-react'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { t, lang }  = useLang()
  const { user, isGuest } = useAuth()
  const subjectStats = useSubjectStats()

  return (
    <div className="page-content fade-in">
      <div className={styles.pageHeader}>
        <h2 className={styles.title}><User size={24} />{t('profile')}</h2>
      </div>

      {/* User card */}
      <GlassCard padding={28} style={{ marginBottom: 28 }}>
        <div className={styles.userRow}>
          <Avatar name={user?.name ?? 'Guest'} size={68} />
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>{user?.name ?? 'Guest'}</h3>
            {user?.email && (
              <p className={styles.userEmail}>{user.email}</p>
            )}
            {isGuest && (
              <span className={styles.guestChip}><User size={13} />{t('guestMode')}</span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Per-subject stats */}
      <h3 className={styles.sectionTitle}><BarChart3 size={18} />{t('subjects')} {t('progress')}</h3>
      <div className={styles.subjectList}>
        {subjectStats.map(({ subject, tests, correct, incorrect, pct, completed, total }) => (
          <GlassCard
            key={subject.id}
            padding={20}
            className={styles.subjectCard}
            style={
              {
                '--subject-color': subject.color,
                '--subject-gradient': subject.gradient,
              } as CSSProperties
            }
          >
            {/* Subject header */}
            <div className={styles.subHead}>
              <div className={styles.subName}>
                <span className={styles.subjectIconChip} style={{ background: subject.gradient }}>
                  <span className={styles.subjectIconGlyph}>{renderSafeIcon(subject.icon)}</span>
                </span>
                <div className={styles.subTextBlock}>
                  <span className={styles.subLabel}>{SUBJECT_NAMES[lang][subject.id]}</span>
                  <span className={styles.subMeta}>{completed}/{total} {t('completed')}</span>
                </div>
              </div>
              <span className={styles.subPct} style={{ color: subject.color }}>
                {pct}% {t('progress')}
              </span>
            </div>

            <ProgressBar value={pct} color={subject.gradient} height={10} />

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              {([
                { icon: <ClipboardCheck size={14} />, label: t('totalTests'), value: tests },
                { icon: <CheckCircle2 size={14} />, label: t('correct'), value: correct },
                { icon: <XCircle size={14} />, label: t('incorrect'), value: incorrect },
                { icon: <GraduationCap size={14} />, label: t('completed'), value: `${completed}/${total}` },
              ] as const).map(s => (
                <div key={s.label} className={styles.statItem}>
                  <span className={styles.statIcon}>{s.icon}</span>
                  <span className={styles.statVal}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
