import { FolderPlus } from 'lucide-react'
import { useLang } from '../../../hooks'
import { Button } from '../../../components/ui/Button'
import type { SubjectRecord } from '../../../services/admin.service'
import styles from '../AdminWorkspace.module.css'

interface SubjectsRailProps {
  subjects: SubjectRecord[]
  selectedSubjectId: string | null
  onSelect: (subjectId: string) => void
  onCreate: () => void
}

export function SubjectsRail({ subjects, selectedSubjectId, onSelect, onCreate }: SubjectsRailProps): JSX.Element {
  const { t } = useLang()

  return (
    <aside className={styles.subjectRail}>
      <div className={styles.rowHeader}>
        <h4>{t('adminContentSubjectsTitle')}</h4>
        <Button variant="ghost" size="sm" onClick={onCreate}>
          <FolderPlus size={14} aria-hidden="true" />
          {t('adminContentNewSubject')}
        </Button>
      </div>

      <div className={styles.subjectList}>
        {subjects.map((subject) => (
          <button
            key={subject.id}
            type="button"
            className={`${styles.subjectItem} ${selectedSubjectId === subject.id ? styles.subjectItemActive : ''}`}
            onClick={() => onSelect(subject.id)}
          >
            <span>{subject.title}</span>
            <small>{`${subject.topics?.length ?? 0} ${t('adminContentTopicsCountSuffix')}`}</small>
          </button>
        ))}

        {subjects.length === 0 ? (
          <div className={styles.emptyState}>{t('adminContentNoSubjects')}</div>
        ) : null}
      </div>
    </aside>
  )
}

export default SubjectsRail
