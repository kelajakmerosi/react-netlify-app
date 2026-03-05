import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const mockUseAuth = vi.fn()

vi.mock('./providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./providers/LanguageProvider', () => ({
  LanguageProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./providers/AppProvider', () => ({
  AppProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../components/layout/AppShell', async () => {
  const { Outlet } = await import('react-router-dom')
  return {
    AppShell: () => (
      <div data-testid="app-shell">
        <Outlet />
      </div>
    ),
  }
})

vi.mock('../pages/AuthPage', () => ({
  AuthPage: () => <div>AuthPage</div>,
}))

vi.mock('../pages/DashboardPage', () => ({
  DashboardPage: () => <div>DashboardPage</div>,
}))

vi.mock('../pages/SubjectsPage', () => ({
  SubjectsPage: () => <div>SubjectsPage</div>,
}))

vi.mock('../pages/SubjectPage', () => ({
  SubjectPage: ({ subjectId }: { subjectId: string }) => <div>SubjectPage:{subjectId}</div>,
}))

vi.mock('../pages/TopicPage', () => ({
  TopicPage: ({ subjectId, topicId }: { subjectId: string; topicId: string }) => (
    <div>TopicPage:{subjectId}:{topicId}</div>
  ),
}))

vi.mock('../pages/ProfilePage', () => ({
  ProfilePage: () => <div>ProfilePage</div>,
}))

vi.mock('../pages/AdminPage', () => ({
  AdminPage: () => <div>AdminPage</div>,
  default: () => <div>AdminPage</div>,
}))

vi.mock('../pages/ExamCatalogPage', () => ({
  ExamCatalogPage: () => <div>ExamCatalogPage</div>,
  default: () => <div>ExamCatalogPage</div>,
}))

vi.mock('../pages/ExamCheckoutPage', () => ({
  ExamCheckoutPage: () => <div>ExamCheckoutPage</div>,
  default: () => <div>ExamCheckoutPage</div>,
}))

vi.mock('../pages/ExamSessionPage', () => ({
  ExamSessionPage: () => <div>ExamSessionPage</div>,
  default: () => <div>ExamSessionPage</div>,
}))

vi.mock('../pages/ExamResultPage', () => ({
  ExamResultPage: () => <div>ExamResultPage</div>,
  default: () => <div>ExamResultPage</div>,
}))

vi.mock('../pages/MaterialCatalogPage', () => ({
  MaterialCatalogPage: () => <div>MaterialCatalogPage</div>,
  default: () => <div>MaterialCatalogPage</div>,
}))

vi.mock('../pages/MaterialCheckoutPage', () => ({
  MaterialCheckoutPage: () => <div>MaterialCheckoutPage</div>,
  default: () => <div>MaterialCheckoutPage</div>,
}))

vi.mock('../pages/MaterialLibraryPage', () => ({
  MaterialLibraryPage: () => <div>MaterialLibraryPage</div>,
  default: () => <div>MaterialLibraryPage</div>,
}))

vi.mock('../pages/PaymentGatewayPage', () => ({
  PaymentGatewayPage: () => <div>PaymentGatewayPage</div>,
  default: () => <div>PaymentGatewayPage</div>,
}))

const renderAt = (path: string, auth: { user: unknown; isGuest: boolean }) => {
  window.history.pushState({}, 'test', path)
  mockUseAuth.mockReturnValue(auth)
  render(<App />)
}

describe('App routing', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('renders auth page when user is not authenticated and not guest', () => {
    renderAt('/dashboard', { user: null, isGuest: false })
    expect(screen.getByText('AuthPage')).toBeTruthy()
  })

  it('renders dashboard route', () => {
    renderAt('/dashboard', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('DashboardPage')).toBeTruthy()
  })

  it('renders subjects route', () => {
    renderAt('/subjects', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('SubjectsPage')).toBeTruthy()
  })

  it('renders subject route with id', () => {
    renderAt('/subjects/math', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('SubjectPage:math')).toBeTruthy()
  })

  it('renders topic route with ids', () => {
    renderAt('/subjects/math/topics/algebra', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('TopicPage:math:algebra')).toBeTruthy()
  })

  it('renders profile route', () => {
    renderAt('/profile', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('ProfilePage')).toBeTruthy()
  })

  it('renders admin for admin users', () => {
    renderAt('/admin', { user: { id: 'u2', role: 'admin' }, isGuest: false })
    expect(screen.getByText('AdminPage')).toBeTruthy()
  })

  it('renders exams catalog route', () => {
    renderAt('/exams', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('ExamCatalogPage')).toBeTruthy()
  })

  it('renders exam checkout route', () => {
    renderAt('/exams/abc', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('ExamCheckoutPage')).toBeTruthy()
  })

  it('renders material library route', () => {
    renderAt('/materials/library', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MaterialLibraryPage')).toBeTruthy()
  })

  it('renders material catalog route', () => {
    renderAt('/materials', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MaterialCatalogPage')).toBeTruthy()
  })

  it('renders material checkout route', () => {
    renderAt('/materials/m-1', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MaterialCheckoutPage')).toBeTruthy()
  })

  it('renders payment gateway route', () => {
    renderAt('/payments/p-1?kind=exam&resourceId=e-1', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('PaymentGatewayPage')).toBeTruthy()
  })

  it('redirects /admin to dashboard for non-admin users', () => {
    renderAt('/admin', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('DashboardPage')).toBeTruthy()
  })
})
