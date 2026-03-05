import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { PageId } from '../../types'

const resolveActivePage = (pathname: string): PageId => {
  if (pathname.startsWith('/payments/')) return 'payment'
  if (pathname.startsWith('/exam-attempts/')) return 'examAttempt'
  if (pathname.startsWith('/exams/')) return 'exam'
  if (pathname.startsWith('/exams')) return 'exams'
  if (pathname.startsWith('/materials/')) return pathname.startsWith('/materials/library') ? 'materialLibrary' : 'materialCheckout'
  if (pathname.startsWith('/materials')) return 'materials'
  if (pathname.startsWith('/subjects/')) return pathname.includes('/topics/') ? 'topic' : 'subject'
  if (pathname.startsWith('/subjects')) return 'subjects'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/admin')) return 'admin'
  return 'dashboard'
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const activePage = resolveActivePage(location.pathname)

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="main-content">
        <Topbar
          activePage={activePage}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        <Outlet />
      </div>
    </div>
  )
}
