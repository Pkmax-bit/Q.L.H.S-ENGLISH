import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, School,
  FileText, ClipboardList, CalendarDays, Building2, Wallet,
  ChevronLeft, ChevronRight, ChevronDown, X, BookCopy, UserCheck, Backpack,
  PenLine, TableProperties, BarChart3, ListChecks, Library, LayoutGrid, Package,
  Palette, MessageCircle, Globe2, ShoppingBag, Gamepad2,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../hooks/useAuth'
import { useMessenger } from '../../context/MessengerContext'

const menuSections = [
  {
    id: 'overview',
    label: 'Tổng quan',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan', roles: ['admin', 'teacher', 'student'] },
      { path: '/admin-hub', icon: LayoutGrid, label: 'Trung tâm quản trị', roles: ['admin'] },
    ],
  },
  {
    id: 'community',
    label: 'Cộng đồng',
    items: [
      { path: '/social', icon: Globe2, label: 'Bảng tin', roles: ['admin', 'teacher', 'student'] },
      { path: '/messenger', icon: MessageCircle, label: 'Tin nhắn', roles: ['admin', 'teacher', 'student'] },
    ],
  },
  {
    id: 'my-learning',
    label: 'Học của tôi',
    items: [
      { path: '/learning', icon: Backpack, label: 'Học tập', roles: ['student'] },
      { path: '/my-assignments', icon: ListChecks, label: 'Bài tập của tôi', roles: ['student'] },
      { path: '/my-grades', icon: BarChart3, label: 'Điểm số của tôi', roles: ['student'] },
      { path: '/shop', icon: ShoppingBag, label: 'Cửa hàng game', roles: ['student'] },
    ],
  },
  {
    id: 'people',
    label: 'Con người & lớp',
    items: [
      { path: '/teachers', icon: Users, label: 'Giáo viên', roles: ['admin'] },
      { path: '/students', icon: GraduationCap, label: 'Học sinh', roles: ['admin'] },
      { path: '/subjects', icon: BookOpen, label: 'Môn học', roles: ['admin'] },
      { path: '/classes', icon: School, label: 'Lớp học', roles: ['admin', 'teacher', 'student'] },
      { path: '/enrollment-requests', icon: UserCheck, label: 'Yêu cầu thêm HS', roles: ['admin', 'teacher'] },
    ],
  },
  {
    id: 'teaching',
    label: 'Giảng dạy',
    items: [
      { path: '/lessons', icon: FileText, label: 'Bài học', roles: ['admin', 'teacher'] },
      { path: '/assignments', icon: ClipboardList, label: 'Bài tập', roles: ['admin', 'teacher'] },
      { path: '/question-bank', icon: Library, label: 'Ngân hàng câu hỏi', roles: ['admin', 'teacher'] },
      { path: '/submissions', icon: PenLine, label: 'Chấm bài', roles: ['admin', 'teacher'] },
      { path: '/gradebook', icon: TableProperties, label: 'Bảng điểm', roles: ['admin', 'teacher'] },
      { path: '/templates', icon: BookCopy, label: 'Mẫu bài giảng', roles: ['admin', 'teacher'] },
      { path: '/lesson-bundles', icon: Package, label: 'Bộ bài học', roles: ['admin', 'teacher'] },
      { path: '/shop/harvest-content', icon: Gamepad2, label: 'Nội dung Harvest Shot', roles: ['admin', 'teacher'] },
    ],
  },
  {
    id: 'operations',
    label: 'Vận hành',
    items: [
      { path: '/schedules', icon: CalendarDays, label: 'Thời khóa biểu', roles: ['admin', 'teacher', 'student'] },
      { path: '/facilities', icon: Building2, label: 'Cơ sở & Phòng học', roles: ['admin'] },
      { path: '/finances', icon: Wallet, label: 'Tài chính', roles: ['admin'] },
    ],
  },
]

const SECTION_OPEN_KEY = 'qlhs_sidebar_sections_open'

const roleBadge = {
  admin: { label: 'Quản trị viên', cls: 'bg-white/12 text-white/90 border border-white/15' },
  teacher: { label: 'Giáo viên', cls: 'bg-emerald-400/15 text-emerald-100 border border-emerald-300/20' },
  student: { label: 'Học sinh', cls: 'bg-sky-400/15 text-sky-100 border border-sky-300/20' },
}

function itemVisible(item, role) {
  if (!item.roles || item.roles.length === 0) return true
  return role && item.roles.includes(role)
}

function pathInSection(pathname, section) {
  return section.items.some((item) =>
    item.path === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.path)
  )
}

function defaultOpenMap(sections) {
  return Object.fromEntries(sections.map((s) => [s.id, true]))
}

function loadOpenMap(sections) {
  const defaults = defaultOpenMap(sections)
  try {
    const raw = localStorage.getItem(SECTION_OPEN_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw)
    return { ...defaults, ...saved }
  } catch {
    return defaults
  }
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation()
  const { user } = useAuth()
  const { totalUnread } = useMessenger()

  const visibleSections = useMemo(
    () =>
      menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => itemVisible(item, user?.role)),
        }))
        .filter((section) => section.items.length > 0),
    [user?.role]
  )

  const [openMap, setOpenMap] = useState(() => loadOpenMap(menuSections))

  useEffect(() => {
    try {
      localStorage.setItem(SECTION_OPEN_KEY, JSON.stringify(openMap))
    } catch {
      /* ignore */
    }
  }, [openMap])

  // Luôn mở section chứa trang đang xem
  useEffect(() => {
    const active = visibleSections.find((s) => pathInSection(location.pathname, s))
    if (!active) return
    setOpenMap((prev) => (prev[active.id] ? prev : { ...prev, [active.id]: true }))
  }, [location.pathname, visibleSections])

  const toggleSection = (id) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const badge = roleBadge[user?.role]

  const renderNavItem = (item) => {
    const Icon = item.icon
    const isActive = item.path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(item.path)

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-text-active)] shadow-sm ring-1 ring-white/10'
            : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {item.path === '/messenger' && totalUnread > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </NavLink>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 shadow-md shadow-black/25 flex items-center justify-center flex-shrink-0">
          <School className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display text-white font-semibold text-sm leading-tight tracking-tight">Q.L.H.S</h1>
            <p className="text-white/65 text-[10px] uppercase tracking-[0.18em] font-semibold">English</p>
          </div>
        )}
      </div>

      {!collapsed && user && badge && (
        <div className="px-4 py-3 border-b border-white/10">
          <span className={clsx('inline-flex px-2.5 py-1 rounded-lg text-xs font-medium', badge.cls)}>
            {badge.label}
          </span>
        </div>
      )}

      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        <div className="space-y-3">
          {visibleSections.map((section) => {
            const isOpen = collapsed || openMap[section.id] !== false
            const hasActive = pathInSection(location.pathname, section)

            return (
              <div key={section.id}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isOpen}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-1.5 mb-0.5 rounded-lg text-left transition-colors',
                      'hover:bg-white/8 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
                      hasActive ? 'text-white/70' : 'text-white/45'
                    )}
                  >
                    <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                      {section.label}
                    </span>
                    <ChevronDown
                      className={clsx(
                        'h-3.5 w-3.5 shrink-0 opacity-80 transition-transform duration-200',
                        isOpen ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                )}
                {isOpen && (
                  <div className="space-y-0.5">
                    {section.items.map(renderNavItem)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <NavLink
          to="/settings/theme"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => clsx(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
            isActive
              ? 'bg-[var(--color-sidebar-active)] text-white'
              : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
          )}
          title={collapsed ? 'Giao diện' : undefined}
        >
          <Palette className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Giao diện</span>}
        </NavLink>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white text-sm transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Thu gọn</span>}
        </button>
      </div>
    </div>
  )

  const sidebarStyle = {
    backdropFilter: 'var(--sidebar-backdrop, none)',
    WebkitBackdropFilter: 'var(--sidebar-backdrop, none)',
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        style={sidebarStyle}
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-[var(--color-sidebar)] border-r border-white/10 transform transition-transform lg:hidden shadow-2xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      <aside
        style={sidebarStyle}
        className={clsx(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-[var(--color-sidebar)] border-r border-white/10 transition-all duration-300 z-30 shadow-lg shadow-black/10',
          collapsed ? 'lg:w-20' : 'lg:w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
