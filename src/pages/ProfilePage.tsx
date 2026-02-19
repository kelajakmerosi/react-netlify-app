import { useLang }          from '../hooks'
import { useAuth }           from '../hooks/useAuth'
import { useSubjectStats }  from '../hooks/useSubjectStats'
import { GlassCard }         from '../components/ui/GlassCard'
import { Avatar, ProgressBar } from '../components/ui/index'
import { SUBJECT_NAMES }    from '../constants'
import styles               from './ProfilePage.module.css'

export function ProfilePage() {
  const { t, lang }  = useLang()
  const { user, isGuest } = useAuth()
  const subjectStats = useSubjectStats()

  return (
    <div className="page-content fade-in">
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>👤 {t('profile')}</h2>
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
              <span className={styles.guestChip}>👤 {t('guestMode')}</span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Per-subject stats */}
      <h3 className={styles.sectionTitle}>📊 {t('subjects')} {t('progress')}</h3>
      <div className={styles.subjectList}>
        {subjectStats.map(({ subject, tests, correct, incorrect, pct, completed, total }) => (
          <GlassCard key={subject.id} padding={22}>
            {/* Subject header */}
            <div className={styles.subHead}>
              <div className={styles.subName}>
                <span style={{ fontSize: 26 }}>{subject.icon}</span>
                <span className={styles.subLabel}>{SUBJECT_NAMES[lang][subject.id]}</span>
              </div>
              <span className={styles.subPct} style={{ color: subject.color }}>
                {pct}%
              </span>
            </div>

            <ProgressBar value={pct} color={subject.gradient} height={8} />

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              {([
                { label: t('totalTests'),     value: tests     },
                { label: t('correct'),        value: correct   },
                { label: t('incorrect'),      value: incorrect },
                { label: t('completed'),      value: `${completed}/${total}` },
              ] as const).map(s => (
                <div key={s.label} className={styles.statItem}>
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
