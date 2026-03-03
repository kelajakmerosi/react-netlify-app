import { Button } from '../../../components/ui/Button'
import styles from '../AdminWorkspace.module.css'

interface AnalyticsFiltersProps {
  from: string
  to: string
  subjectId: string
  subjects: Array<{ id: string; title: string }>
  presetDays: number
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onSubjectChange: (value: string) => void
  onPresetChange: (days: number) => void
  onApply: () => void
  loading?: boolean
  labels: {
    from: string
    to: string
    subject: string
    allSubjects: string
    apply: string
    applying: string
    preset7: string
    preset30: string
    preset90: string
  }
}

export function AnalyticsFilters({
  from,
  to,
  subjectId,
  subjects,
  presetDays,
  onFromChange,
  onToChange,
  onSubjectChange,
  onPresetChange,
  onApply,
  loading = false,
  labels,
}: AnalyticsFiltersProps): JSX.Element {
  return (
    <div className={styles.analyticsFilterRail}>
      <div className={styles.analyticsFilterFields}>
        <label className={styles.field}>
          <span>{labels.from}</span>
          <input className={styles.input} type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{labels.to}</span>
          <input className={styles.input} type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{labels.subject}</span>
          <select className={styles.input} value={subjectId} onChange={(event) => onSubjectChange(event.target.value)}>
            <option value="">{labels.allSubjects}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.title}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.analyticsFilterActions}>
        <div className={styles.presetRail}>
          <button
            type="button"
            className={`${styles.presetBtn} ${presetDays === 7 ? styles.presetBtnActive : ''}`}
            onClick={() => onPresetChange(7)}
          >
            {labels.preset7}
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${presetDays === 30 ? styles.presetBtnActive : ''}`}
            onClick={() => onPresetChange(30)}
          >
            {labels.preset30}
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${presetDays === 90 ? styles.presetBtnActive : ''}`}
            onClick={() => onPresetChange(90)}
          >
            {labels.preset90}
          </button>
        </div>

        <Button variant="primary" onClick={onApply} disabled={loading}>
          {loading ? labels.applying : labels.apply}
        </Button>
      </div>
    </div>
  )
}

export default AnalyticsFilters
