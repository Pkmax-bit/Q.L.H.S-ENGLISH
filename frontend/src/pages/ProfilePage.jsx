import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { User, Lock, Save } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [profile, setProfile] = useState({
    full_name: user?.full_name || user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
  })

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/auth/me', profile)
      if (data.success) {
        showToast('Cập nhật thông tin thành công', 'success')
        if (updateUser) updateUser(data.data)
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error')
      return
    }
    if (passwords.newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error')
      return
    }
    setPasswordLoading(true)
    try {
      const { data } = await api.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      if (data.success) {
        showToast('Đổi mật khẩu thành công', 'success')
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi đổi mật khẩu', 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý thông tin tài khoản của bạn</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Input
            label="Họ và tên"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={profile.email}
            disabled
          />
          <Input
            label="Số điện thoại"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-1" />
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            required
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            required
          />
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={passwordLoading}>
              <Lock className="w-4 h-4 mr-1" />
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
