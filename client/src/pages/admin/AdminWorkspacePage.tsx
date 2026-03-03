import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  ChartPie,
  ListChecks,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Alert } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import { useAuth, useLang } from '../../hooks'
import {
  adminService,
  type AdminUserSummary,
  type AnalyticsBreakdown,
  type AnalyticsSummary,
  type AnalyticsTimeseries,
  type CoursePrice,
  type FinanceSummary,
  type PricingCatalog,
  type PricingPlan,
  type SubjectQuestion,
  type SubjectRecord,
  type SubjectTopic,
  type SystemInfo,
} from '../../services/admin.service'
import AdminHeader from './components/AdminHeader'
import AdminTabRail from './components/AdminTabRail'
import MetricCard from './components/MetricCard'
import SectionCard from './components/SectionCard'
import EmptyState from './components/EmptyState'
import ConfirmActionModal from './components/ConfirmActionModal'
import AnalyticsFilters from './components/AnalyticsFilters'
import TrendAreaChartCard from './components/TrendAreaChartCard'
import TrendLineChartCard from './components/TrendLineChartCard'
import DonutBreakdownCard from './components/DonutBreakdownCard'
import SubjectPerformanceBarCard from './components/SubjectPerformanceBarCard'
import ChartLegend from './components/ChartLegend'
import AdminAccessToolbar from './components/AdminAccessToolbar'
import AdminsTable from './components/AdminsTable'
import UsersTable from './components/UsersTable'
import SubjectsRail from './components/SubjectsRail'
import SubjectEditorPanel from './components/SubjectEditorPanel'
import TopicEditorPanel from './components/TopicEditorPanel'
import ContentBuilderShell from './content/ContentBuilderShell'
import {
  NEW_SUBJECT_ID,
  buildDefaultRange,
  emptySubjectDraft,
  emptyTopicDraft,
  toSubjectDraft,
  toTopicDraft,
  type AdminTab,
  type ConfirmDeleteState,
  type SubjectDraft,
  type TopicDraft,
  type TopicQuestionDraft,
} from './types'
import styles from './AdminWorkspace.module.css'

const toTopicPayload = (draft: TopicDraft): SubjectTopic => ({
  id: draft.id.trim(),
  title: draft.title.trim(),
  videoId: draft.videoId.trim(),
  videoUrl: draft.videoUrl?.trim() || undefined,
  questions: draft.questions.map((question) => {
    const options = question.optionsText
      .split('|')
      .map((option) => option.trim())
      .filter(Boolean)

    const payload: SubjectQuestion = {
      text: question.text.trim(),
      imageUrl: question.imageUrl?.trim() || undefined,
      options,
      answer: Number(question.answer) || 0,
    }

    if (question.id) payload.id = question.id
    if (question.concept?.trim()) payload.concept = question.concept.trim()
    return payload
  }),
})

const LOCALE_BY_LANG = {
  uz: 'uz-UZ',
  en: 'en-US',
  ru: 'ru-RU',
} as const

const formatAdminDateTime = (value: Date | null, locale: string): string => {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

const normalizeDailyPoints = (
  points: Array<{ bucket: string; value: number }>,
  fromDate: string,
  toDate: string,
): Array<{ bucket: string; value: number }> => {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return points

  const byBucket = new Map(
    points.map((point) => [new Date(point.bucket).toISOString().slice(0, 10), Number(point.value ?? 0)]),
  )

  const normalized: Array<{ bucket: string; value: number }> = []
  const cursor = new Date(from)
  while (cursor <= to) {
    const bucket = cursor.toISOString().slice(0, 10)
    normalized.push({ bucket, value: byBucket.get(bucket) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return normalized
}

export function AdminWorkspacePage(): JSX.Element {
  const { user: currentUser, logout } = useAuth()
  const { t, lang } = useLang()
  const isSuperAdmin = currentUser?.role === 'superadmin'
  const useContentV2 = import.meta.env.VITE_ADMIN_CONTENT_V2 !== 'false'

  const [tab, setTab] = useState<AdminTab>('overview')

  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [growthSeries, setGrowthSeries] = useState<AnalyticsTimeseries | null>(null)
  const [activeSeries, setActiveSeries] = useState<AnalyticsTimeseries | null>(null)
  const [completionSeries, setCompletionSeries] = useState<AnalyticsTimeseries | null>(null)
  const [quizSeries, setQuizSeries] = useState<AnalyticsTimeseries | null>(null)
  const [subjectBreakdown, setSubjectBreakdown] = useState<AnalyticsBreakdown | null>(null)
  const [authBreakdown, setAuthBreakdown] = useState<AnalyticsBreakdown | null>(null)
  const [quizBreakdown, setQuizBreakdown] = useState<AnalyticsBreakdown | null>(null)
  const [pricingCatalog, setPricingCatalog] = useState<PricingCatalog | null>(null)
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null)

  const [loadingCore, setLoadingCore] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [savingPlanKey, setSavingPlanKey] = useState<PricingPlan['key'] | null>(null)
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'superadmin' | 'student'>('all')
  const [destructiveMode, setDestructiveMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ open: false, user: null })

  const [identityInput, setIdentityInput] = useState('')
  const [identityActionLoading, setIdentityActionLoading] = useState(false)

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(emptySubjectDraft())
  const [savingSubject, setSavingSubject] = useState(false)

  const [topicDraft, setTopicDraft] = useState<TopicDraft>(emptyTopicDraft())
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [savingTopic, setSavingTopic] = useState(false)

  const [presetDays, setPresetDays] = useState(30)
  const [range, setRange] = useState(buildDefaultRange(30))
  const [analyticsSubjectFilter, setAnalyticsSubjectFilter] = useState('')

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  )

  const searchedUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return users.filter((entry) => {
      const includeRole = roleFilter === 'all'
        || (roleFilter === 'admin' && (entry.role === 'admin' || entry.role === 'superadmin'))
        || entry.role === roleFilter
      if (!includeRole) return false
      if (!needle) return true
      return [entry.name, entry.email, entry.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [users, search, roleFilter])

  const adminUsers = useMemo(() => (
    searchedUsers.filter((entry) => entry.role === 'admin' || entry.role === 'superadmin')
  ), [searchedUsers])

  const regularUsers = useMemo(() => (
    searchedUsers.filter((entry) => entry.role === 'student')
  ), [searchedUsers])

  const coursePriceBySubject = useMemo(() => (
    new Map((pricingCatalog?.coursePrices ?? []).map((course) => [course.subjectId, course]))
  ), [pricingCatalog?.coursePrices])

  const coursePricingRows = useMemo(() => (
    subjects.map((subject) => {
      const current = coursePriceBySubject.get(subject.id)
      return {
        subjectId: subject.id,
        subjectTitle: subject.title,
        priceUzs: current?.priceUzs ?? 0,
        isActive: current?.isActive ?? false,
      }
    })
  ), [subjects, coursePriceBySubject])

  const applySubjectUpdate = (subject: SubjectRecord) => {
    setSubjects((prev) => {
      const exists = prev.some((entry) => entry.id === subject.id)
      const next = exists
        ? prev.map((entry) => (entry.id === subject.id ? subject : entry))
        : [...prev, subject]

      return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    })
    setSelectedSubjectId(subject.id)
    setSubjectDraft(toSubjectDraft(subject))
  }

  const loadCore = async () => {
    setLoadingCore(true)
    try {
      const [nextInfo, nextUsers, nextSubjects] = await Promise.all([
        adminService.getSystemInfo(),
        isSuperAdmin ? adminService.getUsers() : Promise.resolve([]),
        adminService.getSubjects(),
      ])

      setInfo(nextInfo)
      setUsers(nextUsers)
      setSubjects(nextSubjects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))

      if (nextSubjects.length > 0) {
        setSelectedSubjectId((current) => current ?? nextSubjects[0].id)
      }
    } finally {
      setLoadingCore(false)
    }
  }

  const loadBilling = async () => {
    if (!isSuperAdmin) {
      setPricingCatalog(null)
      setFinanceSummary(null)
      return
    }
    setLoadingBilling(true)
    try {
      const [catalog, finance] = await Promise.all([
        adminService.getPricingCatalog(),
        adminService.getFinanceSummary({ from: range.from, to: range.to }),
      ])
      setPricingCatalog(catalog)
      setFinanceSummary(finance)
    } finally {
      setLoadingBilling(false)
    }
  }

  const loadAnalytics = async () => {
    setLoadingAnalytics(true)
    try {
      const query = {
        from: range.from,
        to: range.to,
        subjectId: analyticsSubjectFilter || undefined,
      }

      const [
        nextSummary,
        nextGrowth,
        nextActive,
        nextCompletion,
        nextQuiz,
        nextSubjectBreakdown,
        nextAuthBreakdown,
        nextQuizBreakdown,
      ] = await Promise.all([
        adminService.getAnalyticsSummary(query),
        adminService.getAnalyticsTimeseries({ ...query, metric: 'user_growth', granularity: 'day' }),
        adminService.getAnalyticsTimeseries({ ...query, metric: 'active_users', granularity: 'day' }),
        adminService.getAnalyticsTimeseries({ ...query, metric: 'completion_trend', granularity: 'day' }),
        adminService.getAnalyticsTimeseries({ ...query, metric: 'quiz_score_trend', granularity: 'day' }),
        adminService.getAnalyticsBreakdown({ ...query, type: 'subject' }),
        adminService.getAnalyticsBreakdown({ ...query, type: 'auth_source' }),
        adminService.getAnalyticsBreakdown({ ...query, type: 'quiz_distribution' }),
      ])

      setSummary(nextSummary)
      setGrowthSeries(nextGrowth)
      setActiveSeries(nextActive)
      setCompletionSeries(nextCompletion)
      setQuizSeries(nextQuiz)
      setSubjectBreakdown(nextSubjectBreakdown)
      setAuthBreakdown(nextAuthBreakdown)
      setQuizBreakdown(nextQuizBreakdown)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const loadAll = async () => {
    setFatalError(null)
    setPanelError(null)
    try {
      await Promise.all([loadCore(), loadAnalytics(), loadBilling()])
      setLastUpdatedAt(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : t('adminLoadFailed')
      setFatalError(message)
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  useEffect(() => {
    if (!selectedSubject) return
    setSubjectDraft(toSubjectDraft(selectedSubject))
    setEditingTopicId(null)
    setTopicDraft(emptyTopicDraft())
  }, [selectedSubject])

  useEffect(() => {
    if (!isSuperAdmin && tab === 'users') {
      setTab('overview')
    }
  }, [isSuperAdmin, tab])

  const handleRefreshAll = async () => {
    setSuccess(null)
    setPanelError(null)
    await loadAll()
    setSuccess(t('adminUpdated'))
  }

  const handleExport = () => {
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      summary,
      users,
      analytics: {
        growth: growthSeries,
        active: activeSeries,
        completion: completionSeries,
        quiz: quizSeries,
        subjectBreakdown,
        authBreakdown,
        quizBreakdown,
      },
      billing: {
        pricingCatalog,
        financeSummary,
      },
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kelajakmerosi-admin-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePlanDraftChange = (planKey: PricingPlan['key'], patch: Partial<PricingPlan>) => {
    setPricingCatalog((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        plans: prev.plans.map((plan) => (
          plan.key === planKey ? { ...plan, ...patch } : plan
        )),
      }
    })
  }

  const handleSavePlan = async (plan: PricingPlan) => {
    setSavingPlanKey(plan.key)
    setPanelError(null)
    setSuccess(null)
    try {
      const updated = await adminService.updatePricingPlan(plan.key, {
        title: plan.title,
        description: plan.description ?? '',
        priceMonthlyUzs: Number(plan.priceMonthlyUzs) || 0,
        isActive: Boolean(plan.isActive),
        features: plan.features ?? [],
      })
      setPricingCatalog((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          plans: prev.plans.map((entry) => (entry.key === updated.key ? updated : entry)),
        }
      })
      setSuccess(t('adminPricingSaved'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    } finally {
      setSavingPlanKey(null)
    }
  }

  const handleCourseDraftChange = (subjectId: string, patch: Partial<CoursePrice>) => {
    setPricingCatalog((prev) => {
      if (!prev) return prev
      const existing = prev.coursePrices.find((entry) => entry.subjectId === subjectId)
      const nextCoursePrices = existing
        ? prev.coursePrices.map((entry) => (
          entry.subjectId === subjectId ? { ...entry, ...patch } : entry
        ))
        : [
          ...prev.coursePrices,
          {
            id: subjectId,
            subjectId,
            subjectTitle: subjects.find((subject) => subject.id === subjectId)?.title ?? subjectId,
            priceUzs: 0,
            isActive: false,
            ...patch,
          },
        ]

      return { ...prev, coursePrices: nextCoursePrices }
    })
  }

  const handleSaveCoursePrice = async (subjectId: string) => {
    const current = coursePriceBySubject.get(subjectId)
    const title = subjects.find((subject) => subject.id === subjectId)?.title ?? subjectId
    const priceUzs = Number(current?.priceUzs ?? 0) || 0
    const isActive = Boolean(current?.isActive)

    setSavingCourseId(subjectId)
    setPanelError(null)
    setSuccess(null)
    try {
      const updated = await adminService.updateCoursePrice(subjectId, {
        subjectId,
        subjectTitle: title,
        priceUzs,
        isActive,
      })
      setPricingCatalog((prev) => {
        if (!prev) return prev
        const exists = prev.coursePrices.some((entry) => entry.subjectId === subjectId)
        const nextCoursePrices = exists
          ? prev.coursePrices.map((entry) => (entry.subjectId === subjectId ? updated : entry))
          : [...prev.coursePrices, updated]
        return { ...prev, coursePrices: nextCoursePrices }
      })
      setSuccess(t('adminCoursePricingSaved'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    } finally {
      setSavingCourseId(null)
    }
  }

  const handleDeleteUser = async (targetUser: AdminUserSummary) => {
    const isSelfDelete = targetUser.id === currentUser?.id
    setDeletingUserId(targetUser.id)
    setPanelError(null)
    setSuccess(null)
    try {
      const result = await adminService.deleteUser(targetUser.id)
      setUsers((prev) => prev.filter((entry) => entry.id !== targetUser.id))

      if (isSelfDelete || result.selfDeleted) {
        logout()
        return
      }

      setSuccess(t('adminUserDeleted'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    } finally {
      setDeletingUserId(null)
      setConfirmDelete({ open: false, user: null })
    }
  }

  const handleRoleChange = async (targetUser: AdminUserSummary, role: 'student' | 'admin') => {
    setPanelError(null)
    setSuccess(null)
    try {
      const updated = await adminService.updateUserRole(targetUser.id, role)
      setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)))
      setSuccess(role === 'admin' ? t('adminPromoted') : t('adminDemoted'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    }
  }

  const handleAdminIdentityAction = async (action: 'grant' | 'revoke') => {
    if (!identityInput.trim()) {
      setPanelError(t('adminIdentityRequired'))
      return
    }

    setIdentityActionLoading(true)
    setPanelError(null)
    setSuccess(null)
    try {
      const updated = action === 'grant'
        ? await adminService.grantAdmin(identityInput)
        : await adminService.revokeAdmin(identityInput)

      setUsers((prev) => {
        const exists = prev.some((entry) => entry.id === updated.id)
        return exists
          ? prev.map((entry) => (entry.id === updated.id ? updated : entry))
          : [updated, ...prev]
      })

      setSuccess(action === 'grant' ? t('adminGranted') : t('adminRevoked'))
      setIdentityInput('')
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    } finally {
      setIdentityActionLoading(false)
    }
  }

  const handleSaveSubject = async () => {
    setSavingSubject(true)
    setPanelError(null)
    setSuccess(null)
    try {
      const payload = {
        title: subjectDraft.title,
        description: subjectDraft.description,
        icon: subjectDraft.icon,
        color: subjectDraft.color,
        order: Number(subjectDraft.order) || 0,
        topics: subjectDraft.topics,
      }

      if (selectedSubjectId && selectedSubjectId !== NEW_SUBJECT_ID) {
        const updated = await adminService.updateSubject(selectedSubjectId, payload)
        applySubjectUpdate(updated)
        setSuccess(t('adminSubjectUpdated'))
      } else {
        const created = await adminService.createSubject(payload)
        applySubjectUpdate(created)
        setSuccess(t('adminSubjectCreated'))
      }
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    } finally {
      setSavingSubject(false)
    }
  }

  const handleDeleteSubject = async () => {
    if (!selectedSubject || selectedSubjectId === NEW_SUBJECT_ID) {
      setSelectedSubjectId(null)
      setSubjectDraft(emptySubjectDraft())
      return
    }

    setPanelError(null)
    setSuccess(null)
    try {
      await adminService.deleteSubject(selectedSubject.id)
      setSubjects((prev) => prev.filter((entry) => entry.id !== selectedSubject.id))
      setSelectedSubjectId(null)
      setSubjectDraft(emptySubjectDraft())
      setSuccess(t('adminSubjectDeleted'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    }
  }

  const handleStartNewSubject = () => {
    setSelectedSubjectId(NEW_SUBJECT_ID)
    setSubjectDraft(emptySubjectDraft())
    setEditingTopicId(null)
    setTopicDraft(emptyTopicDraft())
  }

  const handleSaveTopic = async () => {
    if (!topicDraft.id.trim()) {
      setPanelError(t('adminTopicIdRequired'))
      return
    }

    const topicPayload = toTopicPayload(topicDraft)
    setSavingTopic(true)
    setPanelError(null)
    setSuccess(null)
    try {
      if (!selectedSubjectId || selectedSubjectId === NEW_SUBJECT_ID) {
        const nextTopics = editingTopicId
          ? subjectDraft.topics.map((topic) => (topic.id === editingTopicId ? topicPayload : topic))
          : [...subjectDraft.topics, topicPayload]
        setSubjectDraft((prev) => ({ ...prev, topics: nextTopics }))
        setSuccess(editingTopicId ? t('adminTopicUpdatedDraft') : t('adminTopicCreatedDraft'))
      } else if (editingTopicId) {
        const updated = await adminService.updateTopic(selectedSubjectId, editingTopicId, topicPayload)
        applySubjectUpdate(updated)
        setSuccess(t('adminTopicUpdated'))
      } else {
        const updated = await adminService.createTopic(selectedSubjectId, topicPayload)
        applySubjectUpdate(updated)
        setSuccess(t('adminTopicCreated'))
      }

      setEditingTopicId(null)
      setTopicDraft(emptyTopicDraft())
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    } finally {
      setSavingTopic(false)
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    setPanelError(null)
    setSuccess(null)
    try {
      if (!selectedSubjectId || selectedSubjectId === NEW_SUBJECT_ID) {
        setSubjectDraft((prev) => ({
          ...prev,
          topics: prev.topics.filter((topic) => topic.id !== topicId),
        }))
        setSuccess(t('adminTopicDeletedDraft'))
        return
      }

      const updated = await adminService.deleteTopic(selectedSubjectId, topicId)
      applySubjectUpdate(updated)
      setSuccess(t('adminTopicDeleted'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    }
  }

  const handleReorderTopic = async (topicId: string, direction: 'up' | 'down') => {
    const topics = [...subjectDraft.topics]
    const index = topics.findIndex((topic) => topic.id === topicId)
    if (index < 0) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= topics.length) return

    const [moved] = topics.splice(index, 1)
    topics.splice(targetIndex, 0, moved)
    setSubjectDraft((prev) => ({ ...prev, topics }))

    if (!selectedSubjectId || selectedSubjectId === NEW_SUBJECT_ID) return

    try {
      const updated = await adminService.reorderTopics(selectedSubjectId, topics.map((topic) => topic.id))
      applySubjectUpdate(updated)
      setSuccess(t('adminTopicOrderUpdated'))
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    }
  }

  const handleQuestionChange = (index: number, patch: Partial<TopicQuestionDraft>) => {
    setTopicDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((question, questionIdx) => (
        questionIdx === index ? { ...question, ...patch } : question
      )),
    }))
  }

  const handleQuestionAdd = () => {
    setTopicDraft((prev) => ({
      ...prev,
      questions: [...prev.questions, { text: '', imageUrl: '', optionsText: '', answer: 0, concept: '' }],
    }))
  }

  const handleQuestionRemove = (index: number) => {
    setTopicDraft((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index),
    }))
  }

  const handleApplyAnalytics = async () => {
    setPanelError(null)
    setSuccess(null)
    try {
      await Promise.all([loadAnalytics(), isSuperAdmin ? loadBilling() : Promise.resolve()])
      setSuccess(t('adminAnalyticsUpdated'))
      setLastUpdatedAt(new Date())
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : t('adminActionFailed'))
    }
  }

  const handlePresetChange = (days: number) => {
    setPresetDays(days)
    setRange(buildDefaultRange(days))
  }

  const overviewMetrics = [
    { label: t('adminKpiTotalUsers'), value: summary?.totalUsers ?? 0 },
    {
      label: t('adminKpiAdmins'),
      value: isSuperAdmin
        ? users.filter((entry) => entry.role === 'admin' || entry.role === 'superadmin').length
        : t('adminRestrictedValue'),
    },
    { label: t('adminKpiDau'), value: summary?.dau ?? 0 },
    { label: t('adminKpiCompletion'), value: `${summary?.completionRate ?? 0}%` },
  ]

  const analyticsMetrics = [
    { label: t('adminKpiDauWauMau'), value: `${summary?.dau ?? 0} / ${summary?.wau ?? 0} / ${summary?.mau ?? 0}` },
    { label: t('adminKpiCompletion'), value: `${summary?.completionRate ?? 0}%` },
    { label: t('adminKpiAvgQuiz'), value: `${summary?.avgQuizScore ?? 0}%` },
    { label: t('adminKpiTrackedTopics'), value: `${summary?.completedTopics ?? 0} / ${summary?.trackedTopics ?? 0}` },
  ]

  const subjectPerformanceItems = (subjectBreakdown?.items ?? []).map((item) => ({
    label: item.label,
    value: Number(item.completionRate ?? 0),
    secondaryLabel: `${item.completed ?? 0}/${item.total ?? 0}`,
  }))

  const authSourceItems = (authBreakdown?.items ?? []).map((item) => ({
    label: item.label,
    value: Number(item.value ?? 0),
  }))

  const quizDistributionItems = (quizBreakdown?.items ?? []).map((item) => ({
    label: item.label,
    value: Number(item.value ?? 0),
  }))

  const tabs: Array<{ id: AdminTab; label: string; icon: ReactNode }> = [
    { id: 'overview', label: t('adminTabOverview'), icon: <ListChecks size={16} aria-hidden="true" /> },
    ...(isSuperAdmin
      ? [{ id: 'users' as AdminTab, label: t('adminTabUsers'), icon: <Users size={16} aria-hidden="true" /> }]
      : []),
    { id: 'content', label: t('adminTabContent'), icon: <BookOpen size={16} aria-hidden="true" /> },
    { id: 'analytics', label: t('adminTabAnalytics'), icon: <BarChart3 size={16} aria-hidden="true" /> },
  ]

  return (
    <div className="page-content fade-in">
      <div className={styles.page}>
        <div className={styles.stickyHead}>
          <AdminHeader
            title={t('adminTitle')}
            subtitle={t('adminSubtitle')}
            lastUpdatedLabel={`${t('adminLastUpdated')}: ${formatAdminDateTime(lastUpdatedAt, LOCALE_BY_LANG[lang])}`}
            refreshLabel={t('adminRefresh')}
            refreshingLabel={t('adminRefreshing')}
            exportLabel={t('adminExport')}
            loading={loadingCore || loadingAnalytics || (isSuperAdmin && loadingBilling)}
            onRefresh={() => void handleRefreshAll()}
            onExport={handleExport}
          />

          <AdminTabRail tabs={tabs} active={tab} ariaLabel={t('adminTabRailAria')} onChange={setTab} />
        </div>

        <div className={styles.alertRail}>
          {fatalError ? <Alert variant="error">{fatalError}</Alert> : null}
          {panelError ? <Alert variant="warning">{panelError}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}
        </div>

        {tab === 'overview' ? (
          <>
            <div className={styles.metricGrid}>
              {overviewMetrics.map((item) => (
                <MetricCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>

            <SectionCard title={t('adminQuickOpsTitle')} subtitle={t('adminQuickOpsSubtitle')}>
              <div className={`${styles.quickOps} ${!isSuperAdmin ? styles.quickOpsCompact : ''}`}>
                {isSuperAdmin ? (
                  <Button className={styles.quickOpBtn} variant="ghost" onClick={() => setTab('users')}>
                    <Users size={16} aria-hidden="true" />
                    {t('adminQuickUsers')}
                  </Button>
                ) : null}
                <Button className={styles.quickOpBtn} variant="ghost" onClick={() => setTab('content')}>
                  <BookOpen size={16} aria-hidden="true" />
                  {t('adminQuickContent')}
                </Button>
                <Button className={styles.quickOpBtn} variant="ghost" onClick={() => setTab('analytics')}>
                  <ChartPie size={16} aria-hidden="true" />
                  {t('adminQuickAnalytics')}
                </Button>
              </div>
            </SectionCard>

            <SectionCard title={t('adminStatusTitle')} subtitle={t('adminStatusSubtitle')}>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <p className={styles.statusLabel}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {t('adminStatusGoogle')}
                  </p>
                  <p className={styles.statusValue}>{info?.googleConfigured ? t('adminConfigured') : t('adminNotConfigured')}</p>
                </div>
                <div className={styles.statusItem}>
                  <p className={styles.statusLabel}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {t('adminStatusEskiz')}
                  </p>
                  <p className={styles.statusValue}>{info?.eskizConfigured ? t('adminConfigured') : t('adminNotConfigured')}</p>
                </div>
                <div className={styles.statusItem}>
                  <p className={styles.statusLabel}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {t('adminStatusAllowlist')}
                  </p>
                  <p className={styles.statusValue}>
                    {t('adminStatusAllowlistValue')
                      .replace('{emails}', String(info?.adminAccess?.emailCount ?? 0))
                      .replace('{phones}', String(info?.adminAccess?.phoneCount ?? 0))}
                  </p>
                </div>
              </div>
            </SectionCard>

            {isSuperAdmin ? (
              <SectionCard
                title={t('adminBillingTitle')}
                subtitle={t('adminBillingSubtitle')}
                right={<BadgeDollarSign size={16} aria-hidden="true" />}
              >
                <div className={styles.billingSummaryGrid}>
                  <MetricCard
                    label={t('adminRevenueTotal')}
                    value={`${financeSummary?.totalRevenueUzs ?? 0} UZS`}
                  />
                  <MetricCard
                    label={t('adminRevenueRefunded')}
                    value={`${financeSummary?.refundedUzs ?? 0} UZS`}
                  />
                  <MetricCard
                    label={t('adminPaymentsPaid')}
                    value={financeSummary?.paidCount ?? 0}
                  />
                  <MetricCard
                    label={t('adminPaymentsFailed')}
                    value={financeSummary?.failedCount ?? 0}
                  />
                </div>

                <div className={styles.billingPlans}>
                  {(pricingCatalog?.plans ?? []).map((plan) => (
                    <div key={plan.key} className={styles.billingPlanCard}>
                      <div className={styles.billingPlanHeader}>
                        <strong>{plan.title}</strong>
                        <label className={styles.toggleWrap}>
                          <input
                            type="checkbox"
                            checked={Boolean(plan.isActive)}
                            onChange={(event) => handlePlanDraftChange(plan.key, { isActive: event.target.checked })}
                          />
                          <span>{t('adminPricingActive')}</span>
                        </label>
                      </div>
                      <div className={styles.formGrid}>
                        <label className={styles.field}>
                          <span>{t('adminPricingMonthlyPrice')}</span>
                          <input
                            className={styles.input}
                            type="number"
                            min={0}
                            value={plan.priceMonthlyUzs}
                            onChange={(event) => handlePlanDraftChange(plan.key, { priceMonthlyUzs: Number(event.target.value) || 0 })}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>{t('adminPricingDescription')}</span>
                          <input
                            className={styles.input}
                            value={plan.description ?? ''}
                            onChange={(event) => handlePlanDraftChange(plan.key, { description: event.target.value })}
                          />
                        </label>
                      </div>
                      <div className={styles.actionRow}>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={savingPlanKey === plan.key}
                          onClick={() => void handleSavePlan(plan)}
                        >
                          <Save size={14} aria-hidden="true" />
                          {savingPlanKey === plan.key ? t('adminProcessing') : t('adminSavePricing')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.billingCourses}>
                  <h4 className={styles.subSectionTitle}>{t('adminCoursePricingTitle')}</h4>
                  {coursePricingRows.length === 0 ? (
                    <EmptyState message={t('adminNoSubjectsForPricing')} />
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>{t('adminSubject')}</th>
                            <th>{t('adminCoursePrice')}</th>
                            <th>{t('adminPricingActive')}</th>
                            <th>{t('adminColumnActions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coursePricingRows.map((row) => (
                            <tr key={row.subjectId}>
                              <td>{row.subjectTitle}</td>
                              <td>
                                <input
                                  className={styles.input}
                                  type="number"
                                  min={0}
                                  value={row.priceUzs}
                                  onChange={(event) => handleCourseDraftChange(row.subjectId, { priceUzs: Number(event.target.value) || 0 })}
                                />
                              </td>
                              <td>
                                <label className={styles.toggleWrap}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(row.isActive)}
                                    onChange={(event) => handleCourseDraftChange(row.subjectId, { isActive: event.target.checked })}
                                  />
                                  <span>{row.isActive ? t('adminConfigured') : t('adminNotConfigured')}</span>
                                </label>
                              </td>
                              <td>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={savingCourseId === row.subjectId}
                                  onClick={() => void handleSaveCoursePrice(row.subjectId)}
                                >
                                  <Save size={14} aria-hidden="true" />
                                  {savingCourseId === row.subjectId ? t('adminProcessing') : t('adminSavePricing')}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </SectionCard>
            ) : null}
          </>
        ) : null}

        {tab === 'users' && isSuperAdmin ? (
          <div className={styles.sectionGrid}>
            <SectionCard title={t('adminUsersTitle')} subtitle={t('adminUsersSubtitle')}>
              <AdminAccessToolbar
                search={search}
                roleFilter={roleFilter}
                destructiveMode={destructiveMode}
                identity={identityInput}
                loading={identityActionLoading}
                onSearchChange={setSearch}
                onRoleFilterChange={setRoleFilter}
                onDestructiveModeChange={setDestructiveMode}
                onIdentityChange={setIdentityInput}
                onGrant={() => void handleAdminIdentityAction('grant')}
                onRevoke={() => void handleAdminIdentityAction('revoke')}
                labels={{
                  searchPlaceholder: t('adminSearchPlaceholder'),
                  all: t('adminFilterAll'),
                  admins: t('adminFilterAdmins'),
                  superadmins: t('adminFilterSuperadmins'),
                  students: t('adminFilterStudents'),
                  destructive: t('adminDeleteMode'),
                  identityPlaceholder: t('adminIdentityPlaceholder'),
                  grant: t('adminGrant'),
                  revoke: t('adminRevoke'),
                }}
              />
            </SectionCard>

            <SectionCard title={t('adminAdminsTitle')} subtitle={t('adminAdminsSubtitle')}>
              <AdminsTable
                rows={adminUsers}
                loading={loadingCore}
                destructiveMode={destructiveMode}
                emptyLabel={t('adminEmptyAdmins')}
                labels={{
                  loading: t('adminLoading'),
                  name: t('adminColumnName'),
                  email: t('adminColumnEmail'),
                  phone: t('adminColumnPhone'),
                  source: t('adminColumnSource'),
                  actions: t('adminColumnActions'),
                  demote: t('adminDemote'),
                  delete: t('adminDelete'),
                  sourceNone: t('adminSourceNone'),
                  sourceAllowlist: t('adminSourceAllowlist'),
                  sourceDbRole: t('adminSourceDbRole'),
                  sourceBoth: t('adminSourceBoth'),
                  sourceFallback: t('adminSourceFallback'),
                }}
                onDemote={(entry) => void handleRoleChange(entry, 'student')}
                onDelete={(entry) => setConfirmDelete({ open: true, user: entry })}
              />
            </SectionCard>

            <SectionCard title={t('adminStudentsTitle')} subtitle={t('adminStudentsSubtitle')}>
              <UsersTable
                rows={regularUsers}
                loading={loadingCore}
                destructiveMode={destructiveMode}
                emptyLabel={t('adminEmptyStudents')}
                labels={{
                  loading: t('adminLoading'),
                  name: t('adminColumnName'),
                  email: t('adminColumnEmail'),
                  phone: t('adminColumnPhone'),
                  role: t('adminColumnRole'),
                  actions: t('adminColumnActions'),
                  promote: t('adminPromote'),
                  delete: t('adminDelete'),
                  roleStudent: t('adminRoleStudent'),
                  roleAdmin: t('adminRoleAdmin'),
                }}
                onPromote={(entry) => void handleRoleChange(entry, 'admin')}
                onDelete={(entry) => setConfirmDelete({ open: true, user: entry })}
              />
            </SectionCard>
          </div>
        ) : null}

        {tab === 'content' ? (
          useContentV2 ? (
            <ContentBuilderShell
              subjects={subjects}
              currentUserId={currentUser?.id}
              onSubjectsChange={(nextSubjects) => setSubjects(nextSubjects)}
              onSuccess={(message) => {
                setPanelError(null)
                setSuccess(message)
              }}
              onError={(message) => {
                setSuccess(null)
                setPanelError(message)
              }}
            />
          ) : (
            <div className={styles.contentLayout}>
              <SubjectsRail
                subjects={subjects}
                selectedSubjectId={selectedSubjectId}
                onSelect={setSelectedSubjectId}
                onCreate={handleStartNewSubject}
              />

              <SubjectEditorPanel
                draft={subjectDraft}
                saving={savingSubject}
                topics={subjectDraft.topics}
                onDraftChange={(patch) => setSubjectDraft((prev) => ({ ...prev, ...patch }))}
                onSaveSubject={() => void handleSaveSubject()}
                onDeleteSubject={() => void handleDeleteSubject()}
                onCreateTopic={() => {
                  setEditingTopicId(null)
                  setTopicDraft(emptyTopicDraft())
                }}
                onEditTopic={(topic) => {
                  setEditingTopicId(topic.id)
                  setTopicDraft(toTopicDraft(topic))
                }}
                onDeleteTopic={(topicId) => void handleDeleteTopic(topicId)}
                onReorderTopic={(topicId, direction) => void handleReorderTopic(topicId, direction)}
                topicEditor={(
                  <TopicEditorPanel
                    topicDraft={topicDraft}
                    editingTopicId={editingTopicId}
                    saving={savingTopic}
                    onDraftChange={(patch) => setTopicDraft((prev) => ({ ...prev, ...patch }))}
                    onQuestionAdd={handleQuestionAdd}
                    onQuestionChange={handleQuestionChange}
                    onQuestionRemove={handleQuestionRemove}
                    onSave={() => void handleSaveTopic()}
                    onClear={() => {
                      setEditingTopicId(null)
                      setTopicDraft(emptyTopicDraft())
                    }}
                  />
                )}
              />
            </div>
          )
        ) : null}

        {tab === 'analytics' ? (
          <div className={styles.sectionGrid}>
            <SectionCard title={t('adminAnalyticsTitle')} subtitle={t('adminAnalyticsSubtitle')}>
              <AnalyticsFilters
                from={range.from}
                to={range.to}
                subjectId={analyticsSubjectFilter}
                subjects={subjects.map((subject) => ({ id: subject.id, title: subject.title }))}
                presetDays={presetDays}
                onFromChange={(value) => setRange((prev) => ({ ...prev, from: value }))}
                onToChange={(value) => setRange((prev) => ({ ...prev, to: value }))}
                onSubjectChange={setAnalyticsSubjectFilter}
                onPresetChange={handlePresetChange}
                onApply={() => void handleApplyAnalytics()}
                loading={loadingAnalytics}
                labels={{
                  from: t('adminFrom'),
                  to: t('adminTo'),
                  subject: t('adminSubject'),
                  allSubjects: t('adminAllSubjects'),
                  apply: t('adminApplyFilters'),
                  applying: t('adminApplying'),
                  preset7: t('adminPreset7'),
                  preset30: t('adminPreset30'),
                  preset90: t('adminPreset90'),
                }}
              />
            </SectionCard>

            <div className={styles.metricGrid}>
              {analyticsMetrics.map((item) => (
                <MetricCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>

            <div className={styles.analyticsGrid}>
              <TrendAreaChartCard
                title={t('adminChartUserGrowth')}
                subtitle={t('adminChartUserGrowthSub')}
                contextLabel={t('adminChartUserGrowthCtx')}
                points={normalizeDailyPoints(growthSeries?.points ?? [], range.from, range.to)}
                emptyLabel={t('adminNoData')}
              />

              <TrendLineChartCard
                title={t('adminChartActiveUsers')}
                subtitle={t('adminChartActiveUsersSub')}
                contextLabel={t('adminChartActiveUsersCtx')}
                points={normalizeDailyPoints(activeSeries?.points ?? [], range.from, range.to)}
                emptyLabel={t('adminNoData')}
              />

              <TrendLineChartCard
                title={t('adminChartCompletion')}
                subtitle={t('adminChartCompletionSub')}
                contextLabel={t('adminChartCompletionCtx')}
                points={normalizeDailyPoints(completionSeries?.points ?? [], range.from, range.to)}
                emptyLabel={t('adminNoData')}
              />

              <TrendLineChartCard
                title={t('adminChartQuizTrend')}
                subtitle={t('adminChartQuizTrendSub')}
                contextLabel={t('adminChartQuizTrendCtx')}
                points={normalizeDailyPoints(quizSeries?.points ?? [], range.from, range.to)}
                valueSuffix="%"
                emptyLabel={t('adminNoData')}
              />

              <DonutBreakdownCard
                title={t('adminChartAuthSource')}
                subtitle={t('adminChartAuthSourceSub')}
                contextLabel={t('adminChartAuthSourceCtx')}
                items={authSourceItems}
                emptyLabel={t('adminNoData')}
              />

              <DonutBreakdownCard
                title={t('adminChartQuizDist')}
                subtitle={t('adminChartQuizDistSub')}
                contextLabel={t('adminChartQuizDistCtx')}
                items={quizDistributionItems}
                emptyLabel={t('adminNoData')}
              />

              <div className={styles.analyticsSpanFull}>
                <SubjectPerformanceBarCard
                  title={t('adminChartSubjectPerf')}
                  subtitle={t('adminChartSubjectPerfSub')}
                  contextLabel={t('adminChartSubjectPerfCtx')}
                  items={subjectPerformanceItems}
                  valueSuffix="%"
                  emptyLabel={t('adminNoData')}
                />
              </div>

              <SectionCard
                title={t('adminLegendTitle')}
                subtitle={t('adminLegendSubtitle')}
                className={styles.analyticsSpanFull}
              >
                {quizDistributionItems.length === 0 ? (
                  <EmptyState message={t('adminNoData')} />
                ) : (
                  <ChartLegend
                    items={quizDistributionItems.map((item) => ({
                      label: item.label,
                      value: String(item.value),
                    }))}
                  />
                )}
              </SectionCard>
            </div>
          </div>
        ) : null}

        <ConfirmActionModal
          open={confirmDelete.open}
          title={t('adminConfirmDeleteTitle')}
          description={(
            <>
              <strong>{confirmDelete.user?.name ?? t('adminUnknownUser')}</strong>
              <div>{t('adminConfirmDeleteBody')}</div>
            </>
          )}
          confirmLabel={t('adminDelete')}
          pendingLabel={t('adminProcessing')}
          cancelLabel={t('cancel')}
          pending={deletingUserId === confirmDelete.user?.id}
          onCancel={() => setConfirmDelete({ open: false, user: null })}
          onConfirm={() => {
            if (!confirmDelete.user) return
            void handleDeleteUser(confirmDelete.user)
          }}
        />
      </div>
    </div>
  )
}

export default AdminWorkspacePage
