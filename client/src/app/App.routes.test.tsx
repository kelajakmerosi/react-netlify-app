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

vi.mock('../pages/MilliySectionPage', () => ({
  MilliySectionPage: ({ subjectId, sectionId }: { subjectId: string; sectionId: string }) => (
    <div>MilliySectionPage:{subjectId}:{sectionId}</div>
  ),
}))

vi.mock('../pages/MilliyPaperPage', () => ({
  MilliyPaperPage: ({ subjectId, sectionId, paperKey }: { subjectId: string; sectionId: string; paperKey: string }) => (
    <div>MilliyPaperPage:{subjectId}:{sectionId}:{paperKey}</div>
  ),
}))

vi.mock('../pages/MilliyAttemptPage', () => ({
  MilliyAttemptPage: ({ subjectId, sectionId, paperKey, attemptId }: { subjectId: string; sectionId: string; paperKey: string; attemptId: string }) => (
    <div>MilliyAttemptPage:{subjectId}:{sectionId}:{paperKey}:{attemptId}</div>
  ),
}))

vi.mock('../pages/MilliyResultPage', () => ({
  MilliyResultPage: ({ paperKey, attemptId }: { paperKey: string; attemptId: string }) => (
    <div>MilliyResultPage:{paperKey}:{attemptId}</div>
  ),
}))

vi.mock('../pages/ProfilePage', () => ({
  ProfilePage: () => <div>ProfilePage</div>,
}))

vi.mock('../pages/MyTestsPage', () => ({
  MyTestsPage: () => <div>MyTestsPage</div>,
}))

vi.mock('../pages/AdminPage', () => ({
  AdminPage: () => <div>AdminPage</div>,
  default: () => <div>AdminPage</div>,
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

  it('renders milliy section route with ids', () => {
    renderAt('/subjects/5/milliy/mil-5', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MilliySectionPage:5:mil-5')).toBeTruthy()
  })

  it('renders milliy paper route with ids', () => {
    renderAt('/subjects/5/milliy/mil-5/papers/paper-1', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MilliyPaperPage:5:mil-5:paper-1')).toBeTruthy()
  })

  it('renders milliy attempt result route with ids', () => {
    renderAt('/subjects/5/milliy/mil-5/papers/paper-1/attempts/a-1/result', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MilliyResultPage:paper-1:a-1')).toBeTruthy()
  })

  it('renders profile route', () => {
    renderAt('/profile', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('ProfilePage')).toBeTruthy()
  })

  it('renders my tests route', () => {
    renderAt('/my-tests', { user: { id: 'u1', role: 'student' }, isGuest: false })
    expect(screen.getByText('MyTestsPage')).toBeTruthy()
  })

  it('renders admin for admin users', () => {
    renderAt('/admin', { user: { id: 'u2', role: 'admin' }, isGuest: false })
    expect(screen.getByText('AdminPage')).toBeTruthy()
  })

  it('renders nested admin content routes for admin users', () => {
    renderAt('/admin/content', { user: { id: 'u2', role: 'admin' }, isGuest: false })
    expect(screen.getByText('AdminPage')).toBeTruthy()
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
