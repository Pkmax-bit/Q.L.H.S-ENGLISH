import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { School, Mail, Lock, Eye, EyeOff, ShieldCheck, GraduationCap, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ToastContext } from '../../context/ToastContext'
import Button from '../common/Button'

const QUICK_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@edu.com',
    password: 'admin123',
    icon: ShieldCheck,
    color: 'from-slate-700 to-slate-900',
    hoverColor: 'hover:from-slate-800 hover:to-black',
  },
  {
    label: 'Giáo viên',
    email: 'teacher1@edu.com',
    password: 'Test@123',
    icon: GraduationCap,
    color: 'from-primary-500 to-primary-700',
    hoverColor: 'hover:from-primary-600 hover:to-primary-800',
  },
  {
    label: 'Học sinh',
    email: 'student1@edu.com',
    password: 'Test@123',
    icon: UserRound,
    color: 'from-teal-500 to-teal-700',
    hoverColor: 'hover:from-teal-600 hover:to-teal-800',
  },
]

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { error: showError } = useContext(ToastContext)
  const navigate = useNavigate()

  const validate = () => {
    const errs = {}
    if (!form.email.trim()) errs.email = 'Email không được để trống'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email không hợp lệ'
    if (!form.password) errs.password = 'Mật khẩu không được để trống'
    else if (form.password.length < 6) errs.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (account) => {
    setForm({ email: account.email, password: account.password })
    setErrors({})
    setLoading(true)
    try {
      await login({ email: account.email, password: account.password })
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f5f7] p-4 relative overflow-hidden">
      <div className="absolute inset-0 app-shell-mesh pointer-events-none" aria-hidden />
      <div className="landing-orb landing-orb--1 opacity-30" aria-hidden />
      <div className="landing-orb landing-orb--2 opacity-25" aria-hidden />

      <div className="w-full max-w-md relative z-10 animate-rise-in">
        <div className="bg-white/92 backdrop-blur-md rounded-3xl border border-slate-200/70 shadow-[0_24px_60px_-28px_rgba(12,31,51,0.35)] p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-800 shadow-md shadow-primary-900/20 flex items-center justify-center mx-auto mb-4">
              <School className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-[#0c1f33]">Đăng nhập</h1>
            <p className="text-slate-500 text-sm mt-1 tracking-wide">Q.L.H.S English</p>
            <Link to="/" className="inline-block mt-2 text-xs text-primary-700 hover:text-primary-900 font-semibold">
              ← Về trang chủ
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow ${
                    errors.email ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow ${
                    errors.password ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full py-2.5 rounded-xl">
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-400 mb-3">Đăng nhập nhanh (Demo)</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACCOUNTS.map((account) => {
                const Icon = account.icon
                return (
                  <button
                    key={account.label}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(account)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-gradient-to-b ${account.color} ${account.hoverColor} text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{account.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
