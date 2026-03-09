import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { resolveActivePage } from '../../app/route-meta'

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
