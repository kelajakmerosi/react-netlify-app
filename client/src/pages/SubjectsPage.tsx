import { useMemo } from 'react'
import { useApp, useLang } from '../hooks'
import { useAuth } from '../hooks/useAuth'
import { SubjectCard } from '../components/features/SubjectCard'
import { PageHeader } from '../components/ui/PageHeader'
import { SUBJECT_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { Alert } from '../components/ui'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import styles from './SubjectsPage.module.css'

interface SubjectsPageProps {
  onSubjectSelect: (subjectId: string) => void
}

export function SubjectsPage({ onSubjectSelect }: SubjectsPageProps) {
  const { t, lang } = useLang()
  const { getTopicData } = useApp()
  const { isGuest } = useAuth()
  const { subjects, loading, error } = useLearnerSubjects()

  const subjectStats = useMemo(() => (
    subjects.map((subject) => {
      let completed = 0
      let total = 0
      subject.topics.forEach((topic) => {
        total += 1
        const progress = getTopicData(subject.id, topic.id)
        if (progress.status === 'completed') completed += 1
      })
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
      return {
        subject,
        completed,
        total,
        completionPct,
      }
    })
  ), [getTopicData, subjects])


  return (
    <div className="page-content fade-in">
      <PageHeader
        breadcrumbs={[{ label: t('allTopics') }]}
        title={t('subjects')}
      />

      {error ? <Alert variant="warning">{error}</Alert> : null}

      {isGuest && (
        <Alert variant="warning">{t('guestWarning')} — {t('loginToSave')}</Alert>
      )}

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <GlassCard key={`subject-skeleton-${idx}`} className={styles.skeletonCard} padding={22}>
              <Skeleton width={48} height={48} borderRadius={12} style={{ marginBottom: 16 }} />
              <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="30%" height={16} />
            </GlassCard>
          ))
        ) : null}

        {subjectStats.map(({ subject, completed, total, completionPct }) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            name={subject.title || SUBJECT_NAMES[lang]?.[subject.id] || subject.id}
            completed={completed}
            total={total}
            pct={completionPct}
            onClick={() => onSubjectSelect(subject.id)}
          />
        ))}
      </div>

      {!loading && !subjectStats.length ? (
        <>
          <Alert variant="warning">{t('subjectsEmpty')}</Alert>
          <Button variant="ghost" onClick={() => window.location.reload()}>{t('retry')}</Button>
        </>
      ) : null}
    </div>
  )
}
