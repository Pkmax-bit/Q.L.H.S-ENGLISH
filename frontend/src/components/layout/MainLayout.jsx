import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Toast from '../common/Toast'
import MessengerDock from '../messenger/presentation/MessengerDock'
import clsx from 'clsx'

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="relative min-h-screen bg-[var(--color-page-bg)]">
      {/* Hình nền / gradient */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'var(--bg-image, none)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Lớp phủ mờ */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ backgroundColor: 'var(--bg-overlay, rgba(0,0,0,0))' }}
      />
      {/* Mesh fallback khi không có hình nền */}
      <div className="app-shell-mesh" aria-hidden />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <Toast />
      <MessengerDock />
    </div>
  )
}
