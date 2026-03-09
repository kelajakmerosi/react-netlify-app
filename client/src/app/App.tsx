import { Navigate, BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import { LanguageProvider } from './providers/LanguageProvider'
import { AuthProvider } from './providers/AuthProvider'
import { AppProvider } from './providers/AppProvider'
import { AppShell } from '../components/layout/AppShell'
import { AuthPage } from '../pages/AuthPage'
import { LandingPage } from '../pages/LandingPage'
import { DashboardPage } from '../pages/DashboardPage'
import { SubjectsPage } from '../pages/SubjectsPage'
import { SubjectPage } from '../pages/SubjectPage'
import { TopicPage } from '../pages/TopicPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminPage } from '../pages/AdminPage'
import { ExamCatalogPage } from '../pages/ExamCatalogPage'
import { ExamCheckoutPage } from '../pages/ExamCheckoutPage'
import { ExamSessionPage } from '../pages/ExamSessionPage'
import { ExamResultPage } from '../pages/ExamResultPage'
import { PaymentGatewayPage } from '../pages/PaymentGatewayPage'
import { useAuth } from '../hooks/useAuth'
import type { CurrentTopic, PageId } from '../types'

const routeForPage = (page: PageId, opts?: { subjectId?: string; topic?: CurrentTopic }): string => {
  if (page === 'dashboard') return '/dashboard'
  if (page === 'subjects') return '/subjects'
  if (page === 'profile') return '/profile'
  if (page === 'admin') return '/admin'
  if (page === 'exams') return '/exams'
  if (page === 'payment') return '/dashboard'
  if (page === 'subject') return opts?.subjectId ? `/subjects/${opts.subjectId}` : '/subjects'
  if (page === 'topic' && opts?.topic) {
    return `/subjects/${opts.topic.subjectId}/topics/${opts.topic.topicId}`
  }
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

function ExamCatalogRoute() {
  return <ExamCatalogPage />
}

function ExamCheckoutRoute() {
  const { examId } = useParams<{ examId: string }>()
  if (!examId) return <Navigate to="/exams" replace />

  return <ExamCheckoutPage examId={examId} />
}

function ExamSessionRoute() {
  const { attemptId } = useParams<{ attemptId: string }>()
  if (!attemptId) return <Navigate to="/exams" replace />

  return <ExamSessionPage attemptId={attemptId} />
}

function ExamResultRoute() {
  const { attemptId } = useParams<{ attemptId: string }>()
  if (!attemptId) return <Navigate to="/exams" replace />

  return <ExamResultPage attemptId={attemptId} />
}

function AdminGuardRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/dashboard" replace />
  if (user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return <AdminPage />
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<PublicAuthRoute />} />

        <Route element={<ProtectedAppShellRoute />}>
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/subjects" element={<SubjectsRoute />} />
          <Route path="/subjects/:subjectId" element={<SubjectRoute />} />
          <Route path="/subjects/:subjectId/topics/:topicId" element={<TopicRoute />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminGuardRoute />} />
          <Route path="/exams" element={<ExamCatalogRoute />} />
          <Route path="/exams/:examId" element={<ExamCheckoutRoute />} />
          <Route path="/exam-attempts/:attemptId" element={<ExamSessionRoute />} />
          <Route path="/exam-attempts/:attemptId/result" element={<ExamResultRoute />} />
          <Route path="/payments/:paymentId" element={<PaymentGatewayPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RoutedApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
