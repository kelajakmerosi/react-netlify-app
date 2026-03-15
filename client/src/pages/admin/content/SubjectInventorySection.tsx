import { BookOpen, Layers3, PenSquare, PlusCircle, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useLang } from '../../../hooks'
import type { SubjectRecord } from '../../../services/admin.service'
import { getSubjectVisual } from '../../../utils/subjectVisuals'
import type { BuilderStep } from './types'
import styles from './ContentBuilder.module.css'

interface SubjectInventorySectionProps {
  subjects: SubjectRecord[]
  selectedSubjectId: string | null
  canCreateSubject: boolean
  onCreateSubject: () => void
  onOpenSubject: (subjectId: string, step: BuilderStep) => void
  onToggleVisibility?: (subjectId: string, isHidden: boolean) => void
  onDeleteSubject?: (subjectId: string) => void
}

const countQuestions = (subject: SubjectRecord) => (
  (subject.topics ?? []).reduce((sum, topic) => sum + (topic.questions?.length ?? 0), 0)
)

export default function SubjectInventorySection({
  subjects,
  selectedSubjectId,
  canCreateSubject,
  onCreateSubject,
  onOpenSubject,
  onToggleVisibility,
  onDeleteSubject,
}: SubjectInventorySectionProps): JSX.Element {
  const { t } = useLang()

  const totalTopics = subjects.reduce((sum, subject) => sum + (subject.topics?.length ?? 0), 0)
  const totalQuestions = subjects.reduce((sum, subject) => sum + countQuestions(subject), 0)

  return (
    <section className={styles.inventorySection}>
      <div className={styles.inventoryHeader}>
        <div>
          <h3 className={styles.inventoryTitle}>{t('adminContentSectionSubjectsTitle')}</h3>
          <p className={styles.inventorySubtitle}>{t('adminContentSectionSubjectsSubtitle')}</p>
        </div>

        <div className={styles.inventoryStats}>
          <div className={styles.inventoryStat}>
            <span>{t('adminContentSubjectsTitle')}</span>
            <strong>{subjects.length}</strong>
          </div>
          <div className={styles.inventoryStat}>
            <span>{t('adminContentTopicsTitle')}</span>
            <strong>{totalTopics}</strong>
          </div>
          <div className={styles.inventoryStat}>
            <span>{t('adminContentQuestionsTitle')}</span>
            <strong>{totalQuestions}</strong>
          </div>
        </div>
      </div>

      <div className={styles.inventoryGrid}>
        {canCreateSubject ? (
          <button type="button" className={`${styles.inventoryCard} ${styles.inventoryCardCreate}`} onClick={onCreateSubject}>
            <div className={styles.inventoryCreateIcon}>
              <PlusCircle size={20} aria-hidden="true" />
            </div>
            <strong>{t('adminContentCreateSubjectCardTitle')}</strong>
            <p>{t('adminContentCreateSubjectCardSubtitle')}</p>
          </button>
        ) : null}

        {subjects.length === 0 ? (
          <div className={styles.emptyState}>
            {canCreateSubject ? t('adminContentNoSubjectsYet') : t('adminContentNoScopedSubjects')}
          </div>
        ) : null}

        {subjects.map((subject) => {
          const visual = getSubjectVisual(subject.id)
          const topicCount = subject.topics?.length ?? 0
          const questionCount = countQuestions(subject)
          const active = selectedSubjectId === subject.id
          const isHidden = Boolean(subject.isHidden)

          return (
            <article
              key={subject.id}
              className={`${styles.inventoryCard} ${active ? styles.inventoryCardActive : ''} ${isHidden ? styles.inventoryCardHidden : ''}`}
            >
              <div
                className={styles.inventoryMedia}
                style={{ backgroundImage: `linear-gradient(180deg, rgba(11, 10, 20, 0.12), rgba(11, 10, 20, 0.68)), url(${visual.imageUrl})`, opacity: isHidden ? 0.6 : 1 }}
              >
                <span className={styles.inventoryBadge} style={{ background: isHidden ? 'var(--color-slate-800)' : undefined }}>
                  {isHidden ? t('adminContentHiddenBadge') : t('subjects')}
                </span>
              </div>

              <div className={styles.inventoryBody}>
                <div className={styles.inventoryCardHead}>
                  <div>
                    <strong>{subject.title}</strong>
                    <p>{subject.description || t('adminContentSectionSubjectsCardFallback')}</p>
                  </div>
                  <span className={styles.inventoryOrderPill}>#{(subject.order ?? 0) + 1}</span>
                </div>

                <div className={styles.inventoryMetricRow}>
                  <span><Layers3 size={14} aria-hidden="true" /> {topicCount} {t('adminContentTopicsCountSuffix')}</span>
                  <span><BookOpen size={14} aria-hidden="true" /> {questionCount} {t('adminContentQuestionsCountSuffix')}</span>
                </div>

                <div className={styles.inventoryActions} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="ghost" size="sm" onClick={() => onOpenSubject(subject.id, 1)}>
                    <PenSquare size={14} aria-hidden="true" />
                    {t('adminContentEditDetails')}
                  </Button>

                  {onToggleVisibility && (
                    <Button variant="ghost" size="sm" onClick={() => onToggleVisibility(subject.id, !isHidden)}>
                      {isHidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                      {isHidden ? t('adminContentActionShow') : t('adminContentActionHide')}
                    </Button>
                  )}

                  {isHidden && onDeleteSubject && (
                    <Button variant="ghost" size="sm" onClick={() => onDeleteSubject(subject.id)} className={styles.dangerText}>
                      <Trash2 size={14} aria-hidden="true" />
                      {t('adminContentActionDelete')}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
