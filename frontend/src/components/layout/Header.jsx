import { Menu, Bell, LogOut, Settings, Globe2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import UserAvatar from '../common/UserAvatar'
import clsx from 'clsx'

const roleLabelMap = {
  admin: { label: 'Quản trị viên', color: 'bg-red-50 text-red-700 border border-red-100' },
  teacher: { label: 'Giáo viên', color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  student: { label: 'Học sinh', color: 'bg-sky-50 text-sky-800 border border-sky-100' },
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleInfo = roleLabelMap[user?.role] || { label: user?.role, color: 'bg-stone-100 text-stone-700' }
  const displayName = user?.full_name || user?.name || 'Người dùng'
  const avatarSrc = user?.avatar_url || user?.avatar || null

  return (
    <header
      className="sticky top-0 z-20 border-b border-slate-200/70 px-4 lg:px-6 shadow-sm"
      style={{
        backgroundColor: 'var(--color-topbar, #ffffff)',
        backdropFilter: 'var(--header-backdrop, blur(12px))',
        WebkitBackdropFilter: 'var(--header-backdrop, blur(12px))',
      }}
    >
      <div className="flex items-center justify-between h-16">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-white/40 lg:hidden transition-colors"
        >
          <Menu className="h-5 w-5 text-[var(--color-text-body,#44403c)]" />
        </button>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          <button type="button" className="relative p-2 rounded-lg hover:bg-white/40 transition-colors">
            <Bell className="h-5 w-5 text-[var(--color-text-body,#44403c)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/40 transition-colors"
            >
              <UserAvatar
                name={displayName}
                avatarUrl={avatarSrc}
                size="sm"
                className="border border-slate-200"
              />
              <div className="hidden sm:flex sm:flex-col sm:items-start">
                <span className="text-sm font-medium text-[var(--color-text-heading,#292524)] leading-tight">
                  {displayName}
                </span>
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-md font-medium leading-tight', roleInfo.color)}>
                  {roleInfo.label}
                </span>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 py-1 z-50">
                <div className="px-4 py-2 border-b border-stone-100">
                  <p className="text-sm font-medium text-stone-900">{displayName}</p>
                  <p className="text-xs text-stone-500">{user?.email}</p>
                  <span className={clsx('inline-block mt-1 text-xs px-2 py-0.5 rounded-md font-medium', roleInfo.color)}>
                    {roleInfo.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); navigate(`/social/u/${user?.id}`) }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Globe2 className="h-4 w-4" />
                  Trang cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Cài đặt hồ sơ
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
