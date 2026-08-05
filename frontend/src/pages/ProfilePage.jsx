import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import socialService from '../services/social.service'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import SocialProfileHeader from '../components/social/SocialProfileHeader'
import { User, Lock, Save, Globe } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const coverRef = useRef(null)
  const avatarRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [socialProfile, setSocialProfile] = useState(null)

  const [profile, setProfile] = useState({
    full_name: user?.full_name || user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
    cover_url: user?.cover_url || '',
  })

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!user?.id) return
    socialService.getProfile(user.id).then(setSocialProfile).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    setProfile({
      full_name: user?.full_name || user?.fullName || '',
      phone: user?.phone || '',
      email: user?.email || '',
      bio: user?.bio || '',
      avatar_url: user?.avatar_url || '',
      cover_url: user?.cover_url || '',
    })
  }, [user])

  const saveField = async (patch) => {
    const { data } = await api.put('/auth/me', patch)
    if (data.success && updateUser) updateUser(data.data)
    return data.data
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await saveField({
        full_name: profile.full_name,
        phone: profile.phone,
        bio: profile.bio,
      })
      showToast('Cập nhật thông tin thành công', 'success')
      if (user?.id) socialService.getProfile(user.id).then(setSocialProfile).catch(() => {})
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật', 'error')
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file, field) => {
    const { url } = await socialService.uploadImage(file)
    const updated = await saveField({ [field]: url })
    setProfile((p) => ({ ...p, [field]: url }))
    setSocialProfile((p) => (p ? { ...p, [field]: url } : p))
    return updated
  }

  const onCoverPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      await uploadImage(file, 'cover_url')
      showToast('Đã cập nhật ảnh bìa', 'success')
    } catch {
      showToast('Không tải được ảnh bìa', 'error')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      await uploadImage(file, 'avatar_url')
      showToast('Đã cập nhật ảnh đại diện', 'success')
    } catch {
      showToast('Không tải được ảnh đại diện', 'error')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
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

  const headerProfile = socialProfile || {
    ...profile,
    id: user?.id,
    role: user?.role,
    post_count: 0,
    classes: [],
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-page-title">Hồ sơ cá nhân</h1>
          <p className="app-page-subtitle">Quản lý thông tin và trang cá nhân trên bảng tin</p>
        </div>
        <Link
          to={`/social/u/${user?.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          <Globe className="h-4 w-4" />
          Xem trang công khai
        </Link>
      </div>

      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
      <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />

      <SocialProfileHeader
        profile={headerProfile}
        isOwn
        onEditCover={() => coverRef.current?.click()}
        onEditAvatar={() => avatarRef.current?.click()}
        loadingCover={uploadingCover}
        loadingAvatar={uploadingAvatar}
      />

      <div className="app-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Input
            label="Họ và tên"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            required
          />
          <Input label="Email" type="email" value={profile.email} disabled />
          <Input
            label="Số điện thoại"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Giới thiệu bản thân</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value.slice(0, 500) })}
              rows={4}
              maxLength={500}
              placeholder="Chia sẻ vài dòng về bạn — hiển thị trên trang cá nhân công khai"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-xs text-stone-400 mt-1 text-right">{profile.bio?.length || 0}/500</p>
          </div>
          {(profile.avatar_url || profile.cover_url) && (
            <p className="text-xs text-stone-500">
              Ảnh đại diện và ảnh bìa có thể đổi trực tiếp trên banner phía trên.
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4 mr-1" />
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>

      <div className="app-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-blue-700" />
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
