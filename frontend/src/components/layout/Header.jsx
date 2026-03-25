import { Menu, Bell, User, LogOut, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

const roleLabelMap = {
  admin: { label: 'Quản trị viên', color: 'bg-red-100 text-red-700' },
  teacher: { label: 'Giáo viên', color: 'bg-green-100 text-green-700' },
  student: { label: 'Học sinh', color: 'bg-blue-100 text-blue-700' },
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

  const roleInfo = roleLabelMap[user?.role] || { label: user?.role, color: 'bg-gray-100 text-gray-700' }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6">
      <div className="flex items-center justify-between h-16">
        {/* Left: menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 lg:hidden transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>

        <div className="hidden lg:block" />

        {/* Right: notifications + profile */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-4 w-4 text-primary-600" />
              </div>
              <div className="hidden sm:flex sm:flex-col sm:items-start">
                <span className="text-sm font-medium text-gray-700 leading-tight">
                  {user?.name || 'Người dùng'}
                </span>
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium leading-tight', roleInfo.color)}>
                  {roleInfo.label}
                </span>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className={clsx('inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium', roleInfo.color)}>
                    {roleInfo.label}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/profile')
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  Hồ sơ cá nhân
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
