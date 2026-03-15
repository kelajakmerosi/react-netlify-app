import { Navigate, BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { NotFoundPage } from '../pages/NotFoundPage'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { ThemeProvider } from './providers/ThemeProvider'
import { LanguageProvider } from './providers/LanguageProvider'
import { AuthProvider } from './providers/AuthProvider'
import { AppProvider } from './providers/AppProvider'
import { ToastProvider } from './providers/ToastProvider'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { AppShell } from '../components/layout/AppShell'
import { AuthPage } from '../pages/AuthPage'
import { LandingPage } from '../pages/LandingPage'
import { DashboardPage } from '../pages/DashboardPage'
import { SubjectsPage } from '../pages/SubjectsPage'
import { SubjectPage } from '../pages/SubjectPage'
import { TopicPage } from '../pages/TopicPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminPage } from '../pages/AdminPage'
import { PaymentGatewayPage } from '../pages/PaymentGatewayPage'
import { AttestationPage } from '../pages/AttestationPage'
import { GeneralSectionPage } from '../pages/GeneralSectionPage'
import { MyTestsPage } from '../pages/MyTestsPage'
import { MyResultsPage } from '../pages/MyResultsPage'
import { MilliySectionPage } from '../pages/MilliySectionPage'
import { MilliyPaperPage } from '../pages/MilliyPaperPage'
import { MilliyAttemptPage } from '../pages/MilliyAttemptPage'
import { MilliyResultPage } from '../pages/MilliyResultPage'
import { useAuth } from '../hooks/useAuth'
import type { CurrentTopic, PageId } from '../types'

const routeForPage = (
  page: PageId,
  opts?: { subjectId?: string; topic?: CurrentTopic; examId?: string; attemptId?: string; sectionId?: string },
): string => {
  if (page === 'dashboard') return '/dashboard'
  if (page === 'subjects') return '/subjects'
  if (page === 'profile') return '/profile'
  if (page === 'admin') return '/admin'
  if (page === 'payment') return '/dashboard'
  if (page === 'subject') return opts?.subjectId ? `/subjects/${opts.subjectId}` : '/subjects'
  if (page === 'topic' && opts?.topic) {
    return `/subjects/${opts.topic.subjectId}/topics/${opts.topic.topicId}`
  }
  if (page === 'attestation') return opts?.subjectId ? `/attestations/${opts.subjectId}` : '/subjects'
  if (page === 'generalSection') return opts?.sectionId && opts?.subjectId ? `/general/${opts.sectionId}/${opts.subjectId}` : '/subjects'
  if (page === 'myTests') return '/my-tests'
  if (page === 'myResults') return '/my-results'
  return '/dashboard'
}

function DashboardRoute() {
  const navigate = useNavigate()

  return (
    <DashboardPage
      onNavigate={(page, opts) => {
        navigate(routeForPage(page, opts))
      }}
    />
  )
}

function SubjectsRoute() {
  const navigate = useNavigate()
  return <SubjectsPage onSubjectSelect={(id) => navigate(`/subjects/${id}`)} />
}

function SubjectRoute() {
  const navigate = useNavigate()
  const { subjectId } = useParams<{ subjectId: string }>()
  if (!subjectId) return <Navigate to="/subjects" replace />

  return (
    <SubjectPage
      subjectId={subjectId}
      onBack={() => navigate('/subjects')}
      onTopicSelect={(topic) => navigate(`/subjects/${topic.subjectId}/topics/${topic.topicId}`)}
      onSectionSelect={(sectionType, sectionId, subjId) => {
        if (sectionType === 'attestation') navigate(`/attestations/${subjId}`)
        else if (sectionType === 'general') navigate(`/general/${sectionId}/${subjId}`)
        else if (sectionType === 'milliy') navigate(`/subjects/${subjId}/milliy/${sectionId}`)
      }}
    />
  )
}

function TopicRoute() {
  const navigate = useNavigate()
  const { subjectId, topicId } = useParams<{ subjectId: string; topicId: string }>()
  if (!subjectId || !topicId) return <Navigate to="/subjects" replace />

  return (
    <TopicPage
      subjectId={subjectId}
      topicId={topicId}
      onBack={() => navigate(`/subjects/${subjectId}`)}
      onGoToSubjects={() => navigate('/subjects')}
    />
  )
}

function AttestationRoute() {
  const navigate = useNavigate()
  const { subjectId } = useParams<{ subjectId: string }>()
  if (!subjectId) return <Navigate to="/subjects" replace />

  return (
    <AttestationPage
      subjectId={subjectId}
      onBack={() => navigate(`/subjects/${subjectId}`)}
      onTopicSelect={(subjId, topicId) => navigate(`/subjects/${subjId}/topics/${topicId}`)}
    />
  )
}

function GeneralSectionRoute() {
  const navigate = useNavigate()
  const { sectionId, subjectId } = useParams<{ sectionId: string; subjectId: string }>()
  if (!sectionId || !subjectId) return <Navigate to="/subjects" replace />

  return (
    <GeneralSectionPage
      sectionId={sectionId}
      subjectId={subjectId}
      onBack={() => navigate(`/subjects/${subjectId}`)}
      onTopicSelect={(subjId, topicId) => navigate(`/subjects/${subjId}/topics/${topicId}`)}
    />
  )
}

function MilliySectionRoute() {
  const navigate = useNavigate()
  const { subjectId, sectionId } = useParams<{ subjectId: string; sectionId: string }>()
  if (!subjectId || !sectionId) return <Navigate to="/subjects" replace />

  return (
    <MilliySectionPage
      subjectId={subjectId}
      sectionId={sectionId}
      onBack={() => navigate(`/subjects/${subjectId}`)}
      onOpenPaper={(paperKey) => navigate(`/subjects/${subjectId}/milliy/${sectionId}/papers/${paperKey}`)}
    />
  )
}

function MilliyPaperRoute() {
  const navigate = useNavigate()
  const { subjectId, sectionId, paperKey } = useParams<{ subjectId: string; sectionId: string; paperKey: string }>()
  if (!subjectId || !sectionId || !paperKey) return <Navigate to="/subjects" replace />

  return (
    <MilliyPaperPage
      subjectId={subjectId}
      sectionId={sectionId}
      paperKey={paperKey}
      onBack={() => navigate(`/subjects/${subjectId}/milliy/${sectionId}`)}
      onStartAttempt={(attemptId) => navigate(`/subjects/${subjectId}/milliy/${sectionId}/papers/${paperKey}/attempts/${attemptId}`)}
      onGoToPayment={(paymentId, examId) => navigate(`/payments/${paymentId}?kind=exam&resourceId=${encodeURIComponent(examId)}&subjectId=${encodeURIComponent(subjectId)}&sectionId=${encodeURIComponent(sectionId)}&paperKey=${encodeURIComponent(paperKey)}`)}
    />
  )
}

function MilliyAttemptRoute() {
  const navigate = useNavigate()
  const { subjectId, sectionId, paperKey, attemptId } = useParams<{ subjectId: string; sectionId: string; paperKey: string; attemptId: string }>()
  if (!subjectId || !sectionId || !paperKey || !attemptId) return <Navigate to="/subjects" replace />

  return (
    <MilliyAttemptPage
      paperKey={paperKey}
      attemptId={attemptId}
      onBack={() => navigate(`/subjects/${subjectId}/milliy/${sectionId}/papers/${paperKey}`)}
      onOpenResult={() => navigate(`/subjects/${subjectId}/milliy/${sectionId}/papers/${paperKey}/attempts/${attemptId}/result`)}
    />
  )
}

function MilliyResultRoute() {
  const navigate = useNavigate()
  const { subjectId, sectionId, paperKey, attemptId } = useParams<{ subjectId: string; sectionId: string; paperKey: string; attemptId: string }>()
  if (!subjectId || !sectionId || !paperKey || !attemptId) return <Navigate to="/subjects" replace />

  return (
    <MilliyResultPage
      paperKey={paperKey}
      attemptId={attemptId}
      onBack={() => navigate(`/subjects/${subjectId}/milliy/${sectionId}/papers/${paperKey}`)}
    />
  )
}

function AdminGuardRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/dashboard" replace />
  if (user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return <AdminPage />
}

function LandingRoute() {
  const { user, isGuest } = useAuth()
  if (user || isGuest) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

function PublicAuthRoute() {
  const { user, isGuest } = useAuth()
  if (user || isGuest) return <Navigate to="/dashboard" replace />
  return <AuthPage />
}

function ProtectedAppShellRoute() {
  const { user, isGuest } = useAuth()
  if (!user && !isGuest) return <Navigate to="/auth" replace />
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

function RoutedApp() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/auth" element={<PublicAuthRoute />} />

        <Route element={<ProtectedAppShellRoute />}>
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/subjects" element={<SubjectsRoute />} />
          <Route path="/subjects/:subjectId" element={<SubjectRoute />} />
          <Route path="/subjects/:subjectId/milliy/:sectionId" element={<MilliySectionRoute />} />
          <Route path="/subjects/:subjectId/milliy/:sectionId/papers/:paperKey" element={<MilliyPaperRoute />} />
          <Route path="/subjects/:subjectId/milliy/:sectionId/papers/:paperKey/attempts/:attemptId" element={<MilliyAttemptRoute />} />
          <Route path="/subjects/:subjectId/milliy/:sectionId/papers/:paperKey/attempts/:attemptId/result" element={<MilliyResultRoute />} />
          <Route path="/subjects/:subjectId/topics/:topicId" element={<TopicRoute />} />
          <Route path="/attestations/:subjectId" element={<AttestationRoute />} />
          <Route path="/general/:sectionId/:subjectId" element={<GeneralSectionRoute />} />
          <Route path="/my-tests" element={<MyTestsPage />} />
          <Route path="/my-results" element={<MyResultsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/*" element={<AdminGuardRoute />} />
          <Route path="/payments/:paymentId" element={<PaymentGatewayPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <RoutedApp />
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
