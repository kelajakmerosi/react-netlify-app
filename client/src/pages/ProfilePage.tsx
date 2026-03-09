import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { useSubjectStats } from '../hooks/useSubjectStats'
import { Avatar, ProgressBar, PageHeader } from '../components/ui/index'
import { GlassCard } from '../components/ui/GlassCard'
import { SUBJECT_NAMES } from '../constants'
import { getSubjectVisual } from '../utils/subjectVisuals'
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Trophy,
  Mail,
  Shield,
  User,
  Settings,
  ArrowRight,
  Target,
  Layout
} from 'lucide-react'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { t, lang } = useLang()
  const { user, isGuest } = useAuth()
  const subjectStats = useSubjectStats()

  const totalTests = subjectStats.reduce((sum, entry) => sum + entry.tests, 0)
  const totalCorrect = subjectStats.reduce((sum, entry) => sum + entry.correct, 0)
  const totalTopics = subjectStats.reduce((sum, entry) => sum + entry.total, 0)
  const totalCompletedTopics = subjectStats.reduce((sum, entry) => sum + entry.completed, 0)
  const overallAccuracy = totalTests ? Math.round((totalCorrect / totalTests) * 100) : 0
  const overallCompletion = totalTopics ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0

  const roleLabel = user?.role && user.role !== 'student' ? t(user.role) : null

  return (
    <div className={`page-content fade-in ${styles.pageRoot}`}>
      <PageHeader
        breadcrumbs={[{ label: t('profile') }, { label: t('overview') }]}
        title={t('profile')}
        actions={
          <button className={styles.settingsBtn}>
            <Settings size={18} />
            <span>{t('settings')}</span>
          </button>
        }
      />

      <div className={styles.layoutContainer}>
        {/* Sidebar: Profile Info */}
        <aside className={styles.sidebar}>
          <GlassCard className={styles.profileCard} padding={0}>
             <div className={styles.profileHero}>
                <div className={styles.avatarContainer}>
                  <div className={styles.avatarPulse} />
                  <Avatar name={user?.name ?? t('guest')} size={110} />
                  {isGuest && (
                    <div className={styles.guestIndicator} title={t('guest')}>
                      <User size={14} />
                    </div>
                  )}
                </div>
                <div className={styles.profileNames}>
                   <h2 className={styles.userName}>{user?.name ?? t('guest')}</h2>
                   {roleLabel && (
                     <span className={styles.roleBadge}>
                       <Shield size={12} />
                       {roleLabel}
                     </span>
                   )}
                </div>
             </div>

             <div className={styles.profileDetails}>
                <div className={styles.detailItem}>
                   <Mail size={16} className={styles.detailIcon} />
                   <div className={styles.detailText}>
                      <span className={styles.detailLabel}>{t('email')}</span>
                      <span className={styles.detailValue}>{user?.email || 'N/A'}</span>
                   </div>
                </div>
                <div className={styles.detailItem}>
                   <Layout size={16} className={styles.detailIcon} />
                   <div className={styles.detailText}>
                      <span className={styles.detailLabel}>{t('id')}</span>
                      <span className={styles.detailValue}>#{user?.id?.slice(-8) || '00000000'}</span>
                   </div>
                </div>
             </div>

             <div className={styles.profileTags}>
                <span className={styles.tag}>{t('premium')}</span>
                <span className={styles.tag}>{t('earlyAdopter')}</span>
             </div>
          </GlassCard>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          {/* Top Level Metrics */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconBox} style={{ '--accent-soft': 'var(--accent-light)' } as CSSProperties}>
                <BookOpen size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>{t('subjects')}</span>
                <div className={styles.statValueRow}>
                  <span className={styles.statValue}>{subjectStats.length}</span>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconBox} style={{ '--accent-soft': 'rgba(59, 130, 246, 0.1)' } as CSSProperties}>
                <BarChart3 size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>{t('totalTests')}</span>
                <div className={styles.statValueRow}>
                  <span className={styles.statValue}>{totalTests}</span>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconBox} style={{ '--accent-soft': 'rgba(16, 185, 129, 0.1)' } as CSSProperties}>
                <CheckCircle2 size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>{t('correct')}</span>
                <div className={styles.statValueRow}>
                  <span className={styles.statValue}>{overallAccuracy}%</span>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconBox} style={{ '--accent-soft': 'rgba(245, 158, 11, 0.1)' } as CSSProperties}>
                <Trophy size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>{t('completion')}</span>
                <div className={styles.statValueRow}>
                  <span className={styles.statValue}>{overallCompletion}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subjects/Courses Section */}
          <div className={styles.courseContainer}>
            <div className={styles.sectionHeading}>
              <h3 className={styles.sectionTitle}>{t('subjects')}</h3>
              <div className={styles.sectionActions}>
                 <span className={styles.resultsCount}>{subjectStats.length} {t('items')}</span>
              </div>
            </div>

            <div className={styles.coursesList}>
              {subjectStats.map(({ subject, tests, pct, completed, total, completionPct }) => {
                const subjectName = SUBJECT_NAMES[lang][subject.id]
                const visual = getSubjectVisual(subject.id)
                const isDone = completionPct >= 100
                
                const pillStyle = {
                  '--subject-color': subject.color,
                  '--subject-bg': `color-mix(in srgb, ${subject.color} 10%, transparent)`
                } as CSSProperties

                return (
                  <Link key={subject.id} to={`/subjects/${subject.id}`} className={styles.courseRowLink}>
                    <GlassCard className={styles.courseRow}>
                      <div className={styles.courseBrand} style={pillStyle}>
                        <div className={styles.brandIcon}>
                          <img src={visual.imageUrl} alt="" />
                        </div>
                        <div className={styles.brandLabels}>
                           <h4 className={styles.courseTitle}>{subjectName}</h4>
                           <div className={styles.courseStatusPill}>
                              <div className={styles.pulseDot} />
                              {isDone ? t('completed') : t('inProgress')}
                           </div>
                        </div>
                      </div>

                      <div className={styles.courseProgressColumn}>
                         <div className={styles.progressHeader}>
                            <span>{t('completion')}</span>
                            <strong>{completionPct}%</strong>
                         </div>
                         <ProgressBar value={completionPct} color={subject.gradient || subject.color} height={6} />
                         <div className={styles.progressSub}>
                            <Target size={12} />
                            <span>{completed} / {total} {t('topics')}</span>
                         </div>
                      </div>

                      <div className={styles.courseStatsColumn}>
                         <div className={styles.miniStat}>
                            <span className={styles.miniLabel}>{t('tests')}</span>
                            <span className={styles.miniValue}>{tests}</span>
                         </div>
                         <div className={styles.miniStat}>
                            <span className={styles.miniLabel}>{t('accuracy')}</span>
                            <span className={styles.miniValue} style={{ color: subject.color }}>{pct}%</span>
                         </div>
                      </div>

                      <div className={styles.courseArrow}>
                        <ArrowRight size={18} />
                      </div>
                    </GlassCard>
                  </Link>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
