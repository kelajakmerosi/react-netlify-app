import { useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { useApp, useLang } from '../hooks'
import { SubjectCard } from '../components/features/SubjectCard'
import { SUBJECT_NAMES } from '../constants'
import useLearnerSubjects from '../hooks/useLearnerSubjects'
import { Alert } from '../components/ui'
import { GlassCard } from '../components/ui/GlassCard'
import styles from './SubjectsPage.module.css'

interface SubjectsPageProps {
  onSubjectSelect: (subjectId: string) => void
}

export function SubjectsPage({ onSubjectSelect }: SubjectsPageProps) {
  const { t, lang } = useLang()
  const { getTopicData } = useApp()
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
      <div className={styles.header}>
        <h2 className={styles.title}><BookOpen size={24} />{t('subjects')}</h2>
        <p className={styles.subtitle}>{t('allTopics')}</p>
      </div>

      {error ? <Alert variant="warning">{error}</Alert> : null}

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <GlassCard key={`subject-skeleton-${idx}`} className={styles.skeletonCard} padding={22}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonLineLg} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
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
        <Alert variant="warning">{t('subjectsEmpty')}</Alert>
      ) : null}
    </div>
  )
}
