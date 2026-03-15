import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Alert, IconButton } from '../../../components/ui'
import { Button } from '../../../components/ui/Button'
import { SubjectCard } from '../../../components/features/SubjectCard'
import { useApp, useAuth, useLang } from '../../../hooks'
import { useToast } from '../../../app/providers/ToastProvider'
import { adminService, type SubjectRecord } from '../../../services/admin.service'
import { scopeService, type AdminSubjectScope } from '../../../services/scope.service'
import { resolveUiErrorMessage } from '../../../utils/errorPresentation'
import { getSubjectRouteId } from '../../../utils/subjectCatalog'
import { sortSubjectRecords, syncSubjectListCache } from '../../../utils/subjectQueryCache'
import styles from './ContentBuilder.module.css'
import subjectStyles from '../../SubjectsPage.module.css'
import ContentEditorShell from './ContentEditorShell'
import { buildContentCatalog, resolveCatalogEntry } from './catalogUtils'
import PublishConfirmModal from './PublishConfirmModal'

interface ContentBuilderShellProps {
  subjects: SubjectRecord[]
  subjectsLoading?: boolean
  currentUserId?: string | null
  canManagePricing: boolean
  pricingRows: Array<{
    subjectId: string
    subjectTitle: string
    priceUzs: number
    isActive: boolean
  }>
  savingCourseId: string | null
  bootstrappingDemo: boolean
  onBootstrapDemo: (subjectId?: string) => Promise<string | void>
  onCoursePricingChange: (subjectId: string, patch: { priceUzs?: number; isActive?: boolean }) => void
  onSaveCoursePrice: (subjectId: string) => Promise<string | void>
  onSubjectsChange: (subjects: SubjectRecord[]) => void
}

export default function ContentBuilderShell({
  subjects,
  subjectsLoading = false,
  currentUserId,
  onSubjectsChange,
}: ContentBuilderShellProps): JSX.Element {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { getTopicData } = useApp()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'superadmin'

  const [contentScopes, setContentScopes] = useState<AdminSubjectScope[]>([])
  const [loadingScopes, setLoadingScopes] = useState(false)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [deleteFlow, setDeleteFlow] = useState<{
    subjectId: string | null
    routeId: string
    title: string
    icon: string
    color: string
    step: 1 | 2
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!currentUserId || isSuperAdmin) {
      setContentScopes([])
      setScopeError(null)
      setLoadingScopes(false)
      return
    }

    let cancelled = false
    setLoadingScopes(true)
    setScopeError(null)

    void scopeService.listAdminScopes({ userId: currentUserId })
      .then((scopes) => {
        if (cancelled) return
        setContentScopes(scopes)
      })
      .catch(() => {
        if (cancelled) return
        setContentScopes([])
        setScopeError(t('adminContentScopeLoadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoadingScopes(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUserId, isSuperAdmin, t])

  const scopedSubjectIds = useMemo(() => {
    if (isSuperAdmin) return new Set(subjects.map((subject) => subject.id))
    return new Set(
      contentScopes
        .filter((scope) => scope.can_manage_content)
        .map((scope) => scope.subject_id),
    )
  }, [contentScopes, isSuperAdmin, subjects])

  const visibleSubjects = useMemo(() => {
    if (scopeError) return subjects
    if (isSuperAdmin) return subjects
    return subjects.filter((subject) => scopedSubjectIds.has(subject.id))
  }, [isSuperAdmin, scopeError, scopedSubjectIds, subjects])

  const scopedRouteIds = useMemo(
    () => new Set(visibleSubjects.map((subject) => getSubjectRouteId(subject))),
    [visibleSubjects],
  )

  const catalogEntries = useMemo(
    () => {
      const entries = buildContentCatalog(visibleSubjects, lang)
      if (isSuperAdmin || scopeError) return entries
      return entries.filter((entry) => scopedRouteIds.has(entry.routeId))
    },
    [isSuperAdmin, lang, scopeError, scopedRouteIds, visibleSubjects],
  )

  const subjectStats = useMemo(() => (
    catalogEntries.map((entry) => {
      const cardSubject = entry.subject
      let completed = 0
      let total = 0

      cardSubject.topics.forEach((topic) => {
        total += 1
        const progress = getTopicData(cardSubject.id, topic.id)
        if (progress.status === 'completed') completed += 1
      })

      return {
        entry,
        subject: cardSubject,
        routeId: entry.routeId,
        liveSubjectId: entry.liveSubjectId,
        name: entry.displayName,
        completed,
        total,
        completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })
  ), [catalogEntries, getTopicData])

  const isCatalogRoute = location.pathname === '/admin/content' || location.pathname === '/admin/content/'
  const isEditorRoute = location.pathname.startsWith('/admin/content/subjects/')
  const isLegacyExamRoute = location.pathname.startsWith('/admin/content/exams')
  const isLegacyImportRoute = location.pathname.startsWith('/admin/content/imports')
  const editorSubjectRef = useMemo(() => {
    const match = location.pathname.match(/^\/admin\/content\/subjects\/([^/]+)(?:\/|$)/)
    return match ? decodeURIComponent(match[1]) : null
  }, [location.pathname])
  const editorEntry = useMemo(
    () => (editorSubjectRef ? resolveCatalogEntry(catalogEntries, editorSubjectRef) : null),
    [catalogEntries, editorSubjectRef],
  )

  const handleDeleteSubject = async () => {
    const flow = deleteFlow
    if (!flow) return

    setDeleting(true)
    try {
      let nextSubjects = subjects

      if (flow.subjectId) {
        await adminService.deleteSubject(flow.subjectId)
        nextSubjects = subjects.filter((subject) => subject.id !== flow.subjectId)
      } else {
        const hiddenSeedRecord = await adminService.createSubject({
          title: flow.title,
          description: '',
          icon: flow.icon,
          color: flow.color,
          order: 0,
          catalogKey: flow.routeId,
          topics: [],
          sections: [],
          is_hidden: true,
        })
        nextSubjects = [...subjects, hiddenSeedRecord]
      }

      const sortedSubjects = sortSubjectRecords(nextSubjects)
      onSubjectsChange(sortedSubjects)
      syncSubjectListCache(sortedSubjects)

      if (location.pathname.startsWith(`/admin/content/subjects/${flow.routeId}/`)) {
        navigate('/admin/content', { replace: true })
      }
      toast.success(t('adminSubjectDeleted'))
      setDeleteFlow(null)
    } catch (error) {
      toast.error(resolveUiErrorMessage(error, t, 'adminActionFailed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.builderShell}>
      {(isLegacyExamRoute || isLegacyImportRoute) ? <Navigate to="/admin/content" replace /> : null}

      {!isSuperAdmin ? (
        <Alert variant={scopeError ? 'warning' : 'info'}>
          {scopeError
            ? `${scopeError} ${t('adminContentScopeSummary').replace('{count}', String(subjects.length))}`
            : loadingScopes
              ? t('adminLoading')
              : visibleSubjects.length > 0
                ? t('adminContentScopeSummary').replace('{count}', String(visibleSubjects.length))
                : t('adminContentNoScopedSubjects')}
        </Alert>
      ) : null}

      {isCatalogRoute ? (
        <>
          <div className={styles.subjectWorkspaceHeader}>
            <div>
              <h3 className={styles.inventoryTitle}>{t('subjects')}</h3>
              <p className={styles.inventorySubtitle}>{t('adminContentSectionSubjectsSubtitle')}</p>
            </div>

            {isSuperAdmin ? (
              <Button onClick={() => navigate('/admin/content/subjects/new/details')}>
                {t('adminContentCreateSubjectTitle')}
              </Button>
            ) : null}
          </div>

          {subjectStats.length === 0 ? (
            <Alert variant="info">{t('subjectsEmpty')}</Alert>
          ) : (
            <div className={subjectStyles.grid}>
              {subjectStats.map(({ entry, subject, routeId, liveSubjectId, name, completed, total, completionPct }) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  completed={completed}
                  total={total}
                  pct={completionPct}
                  actionLabel={t('adminContentEditDetails')}
                  onClick={() => navigate(`/admin/content/subjects/${routeId}/details`)}
                  name={name}
                  visualKey={subject.visualKey}
                  topAction={isSuperAdmin ? (
                    <IconButton
                      className={styles.subjectDeleteAction}
                      icon={<Trash2 size={14} aria-hidden="true" />}
                      label={t('adminContentDeleteSubject')}
                      onClick={() => setDeleteFlow({
                        subjectId: liveSubjectId,
                        routeId,
                        title: name,
                        icon: entry.liveSubject?.icon ?? entry.subject.iconName ?? 'bookopen',
                        color: entry.liveSubject?.color ?? entry.subject.color ?? '#3f68f7',
                        step: 1,
                      })}
                    />
                  ) : undefined}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {isEditorRoute ? (
        editorSubjectRef !== 'new' && subjectsLoading && !editorEntry ? (
          <div className={styles.workspaceLoading}>{t('adminLoading')}</div>
        ) : (
          <ContentEditorShell
            subjectRef={editorSubjectRef ?? 'new'}
            entry={editorEntry}
            subjects={subjects}
            isSuperAdmin={isSuperAdmin}
            onSubjectsChange={onSubjectsChange}
          />
        )
      ) : null}

      {!isCatalogRoute && !isEditorRoute && !isLegacyExamRoute && !isLegacyImportRoute ? <Navigate to="/admin/content" replace /> : null}

      <PublishConfirmModal
        open={Boolean(deleteFlow)}
        title={deleteFlow?.step === 2 ? t('adminContentDeleteFinalTitle') : t('adminContentDeleteConfirmTitle')}
        message={deleteFlow?.step === 2 ? t('adminContentDeleteFinalBody') : t('adminContentDeleteConfirmBody')}
        confirmLabel={deleteFlow?.step === 2 ? t('adminContentDeleteForever') : t('continue')}
        busy={deleting}
        busyLabel={t('adminProcessing')}
        onCancel={() => setDeleteFlow(null)}
        onConfirm={() => {
          if (deleteFlow?.step === 1) {
            setDeleteFlow({
              subjectId: deleteFlow.subjectId,
              routeId: deleteFlow.routeId,
              title: deleteFlow.title,
              icon: deleteFlow.icon,
              color: deleteFlow.color,
              step: 2,
            })
            return
          }
          return handleDeleteSubject()
        }}
      />
    </div>
  )
}
