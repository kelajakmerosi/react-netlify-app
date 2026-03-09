import type { CSSProperties } from 'react'
import { useLang } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { useSubjectStats } from '../hooks/useSubjectStats'
import { Avatar, ProgressBar, StatCard } from '../components/ui/index'
import { GlassCard } from '../components/ui/GlassCard'
import { SUBJECT_NAMES } from '../constants'
import { getSubjectVisual } from '../utils/subjectVisuals'
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Gauge,
  Mail,
  Shield,
  User,
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
  const overallStatusLabel = overallCompletion >= 100
    ? t('completed')
    : overallCompletion > 0
      ? t('inProgress')
      : t('startLearning')
  const heroMeterStyle = {
    ['--profile-progress-angle' as string]: `${Math.max(0, Math.min(360, overallCompletion * 3.6))}deg`,
  } as CSSProperties

  return (
    <div className="page-content fade-in">
      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <User size={20} aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>{t('subjects')} {t('progress')}</p>
            <h1 className={styles.title}>{t('profile')}</h1>
          </div>
        </div>

        <GlassCard className={styles.heroCard} padding={0}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroBody}>
            <div className={styles.identityBlock}>
              <Avatar name={user?.name ?? 'Guest'} size={88} />

              <div className={styles.identityCopy}>
                <div className={styles.badgeRow}>
                  {isGuest ? (
                    <span className={styles.guestBadge}>
                      <User size={12} aria-hidden="true" />
                      {t('guestMode')}
                    </span>
                  ) : null}

                  {roleLabel ? (
                    <span className={styles.roleBadge}>
                      <Shield size={12} aria-hidden="true" />
                      {roleLabel}
                    </span>
                  ) : null}
                </div>

                <h2 className={styles.userName}>{user?.name ?? 'Guest'}</h2>

                {user?.email ? (
                  <p className={styles.userMeta}>
                    <Mail size={14} aria-hidden="true" />
                    <span>{user.email}</span>
                  </p>
                ) : null}

                <div className={styles.summaryRow}>
                  <div className={styles.summaryPill}>
                    <span className={styles.summaryLabel}>{t('completed')}</span>
                    <strong className={styles.summaryValue}>
                      {totalCompletedTopics}/{totalTopics}
                    </strong>
                  </div>

                  <div className={styles.summaryPill}>
                    <span className={styles.summaryLabel}>{t('correct')}</span>
                    <strong className={styles.summaryValue}>{overallAccuracy}%</strong>
                  </div>

                  <div className={styles.summaryPill}>
                    <span className={styles.summaryLabel}>{t('subjects')}</span>
                    <strong className={styles.summaryValue}>{subjectStats.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroMeter} style={heroMeterStyle}>
              <div className={styles.heroMeterRing}>
                <div className={styles.heroMeterInner}>
                  <span className={styles.heroMeterValue}>{overallCompletion}%</span>
                  <span className={styles.heroMeterLabel}>{overallStatusLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </header>

      <section className={styles.statsGrid} aria-label={t('profile')}>
        <StatCard icon={<BookOpen aria-hidden="true" />} value={subjectStats.length} label={t('subjects')} />
        <StatCard icon={<BarChart3 aria-hidden="true" />} value={totalTests} label={t('totalTests')} />
        <StatCard icon={<CheckCircle2 aria-hidden="true" />} value={totalCorrect} label={t('correct')} />
        <StatCard icon={<Gauge aria-hidden="true" />} value={`${overallCompletion}%`} label={t('completion')} />
      </section>

      <section className={styles.subjectSection}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>{t('profile')}</p>
            <h3 className={styles.sectionTitle}>{t('subjects')} {t('progress')}</h3>
          </div>
          <div className={styles.sectionSummary}>
            <span>{subjectStats.length} {t('subjects')}</span>
            <span>{overallCompletion}% {t('completion')}</span>
          </div>
        </div>

        <div className={styles.subjectGrid}>
          {subjectStats.map(({ subject, tests, correct, incorrect, pct, completed, total, completionPct }) => {
            const subjectName = SUBJECT_NAMES[lang][subject.id]
            const visual = getSubjectVisual(subject.id)
            const subjectStatusLabel = completionPct >= 100
              ? t('completed')
              : completionPct > 0
                ? t('inProgress')
                : t('startLearning')
            const cardStyle = {
              ['--subject-color' as string]: subject.color,
              ['--subject-gradient' as string]: subject.gradient,
            } as CSSProperties

            return (
              <GlassCard
                key={subject.id}
                className={styles.subjectCard}
                padding={0}
                style={cardStyle}
              >
                <div className={styles.subjectCardInner}>
                  <div className={styles.subjectTop}>
                    <div className={styles.subjectIdentity}>
                      <span className={styles.subjectMediaWrap}>
                        <img
                          className={styles.subjectMedia}
                          src={visual.imageUrl}
                          alt={visual.imageAlt}
                          loading="lazy"
                        />
                      </span>

                      <div className={styles.subjectCopy}>
                        <h4 className={styles.subjectName}>{subjectName}</h4>
                        <p className={styles.subjectMeta}>
                          {completed}/{total} {t('completed')}
                        </p>
                        <p className={styles.subjectState}>{subjectStatusLabel}</p>
                      </div>
                    </div>

                    <div className={styles.progressBadge}>
                      <span className={styles.progressBadgeValue}>{completionPct}%</span>
                      <span className={styles.progressBadgeLabel}>{subjectStatusLabel}</span>
                    </div>
                  </div>

                  <div className={styles.progressBlock}>
                    <div className={styles.progressBlockHead}>
                      <span>{t('completion')}</span>
                      <strong>{completed}/{total}</strong>
                    </div>
                    <ProgressBar value={completionPct} color={subject.gradient} height={10} />
                  </div>

                  <div className={styles.metricGrid}>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>{t('totalTests')}</span>
                      <strong className={styles.metricValue}>{tests}</strong>
                    </div>

                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>{t('correct')}</span>
                      <strong className={styles.metricValue}>{correct}</strong>
                    </div>

                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>{t('incorrect')}</span>
                      <strong className={styles.metricValue}>{incorrect}</strong>
                    </div>

                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>{t('progress')}</span>
                      <strong className={styles.metricValue} style={{ color: subject.color }}>
                        {pct}%
                      </strong>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>
    </div>
  )
}
