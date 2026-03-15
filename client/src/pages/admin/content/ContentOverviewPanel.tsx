import { useMemo, useState } from 'react'
import { Alert } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useLang } from '../../../hooks'
import type { SubjectRecord } from '../../../services/admin.service'
import { formatUzs } from '../../../utils'
import type { BuilderStep } from './types'
import styles from './ContentBuilder.module.css'

interface PricingRow {
  subjectId: string
  subjectTitle: string
  priceUzs: number
  isActive: boolean
}

interface ContentOverviewPanelProps {
  subjects: SubjectRecord[]
  canManagePricing: boolean
  canCreateSubjects: boolean
  pricingRows: PricingRow[]
  savingCourseId: string | null
  bootstrappingDemo: boolean
  onBootstrapDemo: (subjectId?: string) => Promise<string | void>
  onPricingChange: (subjectId: string, patch: Partial<Pick<PricingRow, 'priceUzs' | 'isActive'>>) => void
  onSavePricing: (subjectId: string) => Promise<string | void>
  onOpenSubjectCreator: () => void
  onOpenSubject: (subjectId: string, step: BuilderStep) => void
  onOpenSection: (section: 'subjects' | 'exams' | 'imports') => void
}

type Notice = { type: 'error' | 'success'; message: string } | null

export default function ContentOverviewPanel({
  subjects,
  canManagePricing,
  canCreateSubjects,
  pricingRows,
  savingCourseId,
  bootstrappingDemo,
  onBootstrapDemo,
  onPricingChange,
  onSavePricing,
  onOpenSubjectCreator,
  onOpenSubject,
  onOpenSection,
}: ContentOverviewPanelProps): JSX.Element {
  const { t, lang } = useLang()
  const [notice, setNotice] = useState<Notice>(null)
  const firstSubjectWithoutTopics = useMemo(
    () => subjects.find((subject) => (subject.topics?.length ?? 0) === 0) ?? null,
    [subjects],
  )
  const firstSubjectMissingQuiz = useMemo(
    () => subjects.find((subject) => (subject.topics ?? []).some((topic) => (topic.questions?.length ?? 0) === 0)) ?? null,
    [subjects],
  )

  const totals = useMemo(() => {
    const topics = subjects.reduce((sum, subject) => sum + (subject.topics?.length ?? 0), 0)
    const questions = subjects.reduce((sum, subject) => (
      sum + (subject.topics ?? []).reduce((topicSum, topic) => topicSum + (topic.questions?.length ?? 0), 0)
    ), 0)
    const subjectsWithoutTopics = subjects.filter((subject) => (subject.topics?.length ?? 0) === 0).length
    const topicsWithoutQuestions = subjects.reduce((sum, subject) => (
      sum + (subject.topics ?? []).filter((topic) => (topic.questions?.length ?? 0) === 0).length
    ), 0)
    const activeProducts = pricingRows.filter((row) => row.isActive).length

    return { topics, questions, subjectsWithoutTopics, topicsWithoutQuestions, activeProducts }
  }, [pricingRows, subjects])

  const runDemoBootstrap = async () => {
    setNotice(null)
    try {
      const message = await onBootstrapDemo()
      setNotice({ type: 'success', message: message || t('adminContentDemoBootstrapSuccessGeneric') })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : t('errorDemoBootstrapFailed') })
    }
  }

  const savePrice = async (subjectId: string) => {
    setNotice(null)
    try {
      const message = await onSavePricing(subjectId)
      setNotice({ type: 'success', message: message || t('adminCoursePricingSaved') })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : t('adminActionFailed') })
    }
  }

  return (
    <section className={styles.contentPane}>
      {notice ? <Alert variant={notice.type === 'error' ? 'warning' : 'success'}>{notice.message}</Alert> : null}

      <section className={styles.commandDeck}>
        <div className={styles.commandDeckHeader}>
          <div>
            <h3 className={styles.commandDeckTitle}>{t('adminContentOverviewTitle')}</h3>
            <p className={styles.commandDeckSubtitle}>{t('adminContentOverviewSubtitle')}</p>
          </div>

          <div className={styles.commandDeckStats}>
            <div className={styles.commandDeckStat}>
              <span>{t('adminContentSubjectsTitle')}</span>
              <strong>{subjects.length}</strong>
            </div>
            <div className={styles.commandDeckStat}>
              <span>{t('adminContentTopicsTitle')}</span>
              <strong>{totals.topics}</strong>
            </div>
            <div className={styles.commandDeckStat}>
              <span>{t('adminContentQuestionsTitle')}</span>
              <strong>{totals.questions}</strong>
            </div>
          </div>
        </div>

        <div className={styles.commandDeckGrid}>
          <article className={`${styles.commandCard} ${styles.commandCardFeature}`}>
            <div className={styles.commandCardHead}>
              <div>
                <h4>{t('adminContentDemoTitle')}</h4>
                <p>{t('adminContentOverviewDemoSubtitle')}</p>
              </div>
            </div>
            <div className={styles.commandCardActions}>
              <Button onClick={() => void runDemoBootstrap()} disabled={bootstrappingDemo}>
                {bootstrappingDemo ? t('adminContentDemoBusy') : t('adminContentDemoAction')}
              </Button>
              {canCreateSubjects ? (
                <Button variant="ghost" onClick={onOpenSubjectCreator}>
                  {t('adminContentOverviewCreateSubject')}
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => onOpenSection('subjects')}>
                  {t('adminContentOverviewOpenSubjects')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => onOpenSection('exams')}>
                {t('adminContentOverviewOpenExams')}
              </Button>
            </div>
          </article>

          <article className={styles.commandCard}>
            <div className={styles.commandCardHead}>
              <div>
                <h4>{t('adminContentOverviewHealthTitle')}</h4>
                <p>{t('adminContentOverviewHealthSubtitle')}</p>
              </div>
            </div>

            <div className={styles.healthList}>
              <div className={styles.healthItem}>
                <strong>{totals.subjectsWithoutTopics}</strong>
                <span>{t('adminContentOverviewEmptySubjects')}</span>
                {firstSubjectWithoutTopics ? (
                  <Button variant="ghost" size="sm" onClick={() => onOpenSubject(firstSubjectWithoutTopics.id, 2)}>
                    {t('adminContentOverviewFixEmptySubject')}
                  </Button>
                ) : null}
              </div>
              <div className={styles.healthItem}>
                <strong>{totals.topicsWithoutQuestions}</strong>
                <span>{t('adminContentOverviewTopicsMissingQuiz')}</span>
                {firstSubjectMissingQuiz ? (
                  <Button variant="ghost" size="sm" onClick={() => onOpenSubject(firstSubjectMissingQuiz.id, 3)}>
                    {t('adminContentOverviewFixMissingQuiz')}
                  </Button>
                ) : null}
              </div>
              <div className={styles.healthItem}>
                <strong>{totals.activeProducts}</strong>
                <span>{t('adminContentOverviewActiveProducts')}</span>
              </div>
            </div>
          </article>

          <article className={`${styles.commandCard} ${styles.commandCardWide}`}>
            <div className={styles.commandCardHead}>
              <div>
                <h4>{t('adminContentOverviewPricingTitle')}</h4>
                <p>{t('adminContentOverviewPricingSubtitle')}</p>
              </div>
            </div>

            {pricingRows.length === 0 ? (
              <div className={styles.emptyState}>
                {canManagePricing ? t('adminNoSubjectsForPricing') : t('adminRestrictedValue')}
              </div>
            ) : (
              <div className={styles.pricingCardGrid}>
                {pricingRows.map((row) => {
                  const liveSubject = subjects.find((subject) => subject.id === row.subjectId)
                  const topicCount = liveSubject?.topics?.length ?? 0
                  const questionCount = (liveSubject?.topics ?? []).reduce((sum, topic) => sum + (topic.questions?.length ?? 0), 0)

                  return (
                    <article key={row.subjectId} className={styles.pricingCard}>
                      <div className={styles.pricingCardMedia}>
                        <span className={styles.pricingCardBadge}>
                          {row.isActive ? t('adminPricingActive') : t('adminNotConfigured')}
                        </span>
                      </div>

                      <div className={styles.pricingCardBody}>
                        <div className={styles.pricingCardTop}>
                          <div>
                            <strong>{row.subjectTitle}</strong>
                            <p>{topicCount} {t('adminContentTopicsCountSuffix')} • {questionCount} {t('adminContentQuestionsCountSuffix')}</p>
                          </div>
                          <div className={styles.pricingCardValue}>
                            <span>{t('priceLabel')}</span>
                            <strong>{formatUzs(row.priceUzs, lang)}</strong>
                          </div>
                        </div>

                        {canManagePricing ? (
                          <div className={styles.pricingCardControls}>
                            <Input
                              label={t('adminCoursePrice')}
                              type="number"
                              min={0}
                              value={String(row.priceUzs)}
                              onChange={(event) => onPricingChange(row.subjectId, { priceUzs: Number(event.target.value) || 0 })}
                            />

                            <label className={styles.commandToggle}>
                              <input
                                type="checkbox"
                                checked={Boolean(row.isActive)}
                                onChange={(event) => onPricingChange(row.subjectId, { isActive: event.target.checked })}
                              />
                              <span>{t('adminPricingActive')}</span>
                            </label>
                          </div>
                        ) : null}

                        <div className={styles.commandCardActions}>
                          <Button variant="ghost" size="sm" onClick={() => onOpenSubject(row.subjectId, 1)}>
                            {t('adminContentOverviewOpenSubjects')}
                          </Button>
                          {canManagePricing ? (
                            <Button size="sm" onClick={() => void savePrice(row.subjectId)} disabled={savingCourseId === row.subjectId}>
                              {savingCourseId === row.subjectId ? t('adminProcessing') : t('adminSavePricing')}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </article>
        </div>
      </section>
    </section>
  )
}
