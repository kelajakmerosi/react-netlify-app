import { useLang }          from '../hooks'
import { useSubjectStats }  from '../hooks/useSubjectStats'
import { SubjectCard }      from '../components/features/SubjectCard'
import { SUBJECT_NAMES }    from '../constants'
import styles               from './SubjectsPage.module.css'

interface SubjectsPageProps {
  onSubjectSelect: (subjectId: string) => void
}

export function SubjectsPage({ onSubjectSelect }: SubjectsPageProps) {
  const { t, lang }  = useLang()
  const subjectStats = useSubjectStats()

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2 className={styles.title}>📚 {t('subjects')}</h2>
        <p className={styles.subtitle}>{t('allTopics')}</p>
      </div>

      <div className={styles.grid}>
        {subjectStats.map(({ subject, completed, total, completionPct }) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            name={SUBJECT_NAMES[lang][subject.id]}
            completed={completed}
            total={total}
            pct={completionPct}
            onClick={() => onSubjectSelect(subject.id)}
          />
        ))}
      </div>
    </div>
  )
}
