import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, School,
  FileText, ClipboardList, CalendarDays, Building2, Wallet,
  ChevronLeft, ChevronRight, X, BookCopy
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../hooks/useAuth'

/**
 * Menu items with role-based access control.
 * `roles` defines which roles can see the item.
 * If `roles` is omitted/empty, all authenticated users can see it.
 */
const menuItems = [
  {
    path: '/',
    icon: LayoutDashboard,
    label: 'Tổng quan',
    roles: ['admin', 'teacher', 'student'],
  },
  {
    path: '/teachers',
    icon: Users,
    label: 'Giáo viên',
    roles: ['admin'],
  },
  {
    path: '/students',
    icon: GraduationCap,
    label: 'Học sinh',
    roles: ['admin'],
  },
  {
    path: '/subjects',
    icon: BookOpen,
    label: 'Môn học',
    roles: ['admin'],
  },
  {
    path: '/classes',
    icon: School,
    label: 'Lớp học',
    roles: ['admin', 'teacher', 'student'],
  },
  {
    path: '/lessons',
    icon: FileText,
    label: 'Bài học',
    roles: ['admin', 'teacher', 'student'],
  },
  {
    path: '/assignments',
    icon: ClipboardList,
    label: 'Bài tập',
    roles: ['admin', 'teacher', 'student'],
  },
  {
    path: '/templates',
    icon: BookCopy,
    label: 'Mẫu bài giảng',
    roles: ['admin', 'teacher'],
  },
  {
    path: '/schedules',
    icon: CalendarDays,
    label: 'Thời khóa biểu',
    roles: ['admin', 'teacher', 'student'],
  },
  {
    path: '/facilities',
    icon: Building2,
    label: 'Cơ sở & Phòng học',
    roles: ['admin'],
  },
  {
    path: '/finances',
    icon: Wallet,
    label: 'Tài chính',
    roles: ['admin'],
  },
]

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation()
  const { user } = useAuth()

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true
    return user && item.roles.includes(user.role)
  })

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-800/30">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <School className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white font-bold text-sm leading-tight">Trung Tâm</h1>
            <p className="text-blue-200 text-xs">Đào Tạo</p>
          </div>
        )}
      </div>

      {/* User role badge */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-blue-800/30">
          <div className="flex items-center gap-2">
            <span className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              user.role === 'admin' && 'bg-red-500/20 text-red-200',
              user.role === 'teacher' && 'bg-green-500/20 text-green-200',
              user.role === 'student' && 'bg-yellow-500/20 text-yellow-200',
            )}>
              {user.role === 'admin' && '🔑 Quản trị viên'}
              {user.role === 'teacher' && '👨‍🏫 Giáo viên'}
              {user.role === 'student' && '🎓 Học sinh'}
            </span>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:block p-3 border-t border-blue-800/30">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white text-sm transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Thu gọn</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-primary-700 to-primary-900 transform transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-gradient-to-b from-primary-700 to-primary-900 transition-all duration-300 z-30',
          collapsed ? 'lg:w-20' : 'lg:w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
