import { Navigate, BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import { LanguageProvider } from './providers/LanguageProvider'
import { AuthProvider } from './providers/AuthProvider'
import { AppProvider } from './providers/AppProvider'
import { AppShell } from '../components/layout/AppShell'
import { AuthPage } from '../pages/AuthPage'
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
import { MaterialCatalogPage } from '../pages/MaterialCatalogPage'
import { MaterialCheckoutPage } from '../pages/MaterialCheckoutPage'
import { MaterialLibraryPage } from '../pages/MaterialLibraryPage'
import { PaymentGatewayPage } from '../pages/PaymentGatewayPage'
import { useAuth } from '../hooks/useAuth'
import type { CurrentTopic, PageId } from '../types'

const routeForPage = (page: PageId, opts?: { subjectId?: string; topic?: CurrentTopic }): string => {
  if (page === 'dashboard') return '/dashboard'
  if (page === 'subjects') return '/subjects'
  if (page === 'profile') return '/profile'
  if (page === 'admin') return '/admin'
  if (page === 'exams') return '/exams'
  if (page === 'materials') return '/materials'
  if (page === 'materialLibrary') return '/materials/library'
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
    />
  )
}

function AdminGuardRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/dashboard" replace />
  if (user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return <AdminPage />
}

function RoutedApp() {
  const { user, isGuest } = useAuth()
  if (!user && !isGuest) return <AuthPage />

  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/subjects" element={<SubjectsRoute />} />
            <Route path="/subjects/:subjectId" element={<SubjectRoute />} />
            <Route path="/subjects/:subjectId/topics/:topicId" element={<TopicRoute />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminGuardRoute />} />
            <Route path="/exams" element={<ExamCatalogPage />} />
            <Route path="/exams/:examId" element={<ExamCheckoutPage />} />
            <Route path="/exam-attempts/:attemptId" element={<ExamSessionPage />} />
            <Route path="/exam-attempts/:attemptId/result" element={<ExamResultPage />} />
            <Route path="/materials" element={<MaterialCatalogPage />} />
            <Route path="/materials/:packId" element={<MaterialCheckoutPage />} />
            <Route path="/materials/library" element={<MaterialLibraryPage />} />
            <Route path="/payments/:paymentId" element={<PaymentGatewayPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppProvider>
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
