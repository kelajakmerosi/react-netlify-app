import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { resolveActivePage } from '../../app/route-meta'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const activePage = resolveActivePage(location.pathname)
  const isFocusedContentEditor = location.pathname.startsWith('/admin/content/subjects/')

  return (
    <div className="app-layout">
      <div style={isFocusedContentEditor ? { display: 'none' } : undefined} aria-hidden={isFocusedContentEditor}>
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      <div className={`main-content ${isFocusedContentEditor ? 'main-content-immersive' : ''}`.trim()}>
        <div style={isFocusedContentEditor ? { display: 'none' } : undefined} aria-hidden={isFocusedContentEditor}>
          <Topbar
            activePage={activePage}
            onMenuToggle={() => setMobileOpen(o => !o)}
          />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
