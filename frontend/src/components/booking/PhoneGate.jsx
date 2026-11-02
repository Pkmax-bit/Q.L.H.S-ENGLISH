import { useState } from 'react'
import { Phone, ArrowRight } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import bookingService, { bookingSession } from '../../services/booking.service'

/**
 * Cổng vào trang đăng ký: chỉ cần số điện thoại.
 * Số lạ thì backend trả needs_name, lúc đó mới hiện thêm ô họ tên.
 */
export default function PhoneGate({ boardTitle, onReady }) {
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [needsName, setNeedsName] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) {
      setError('Số điện thoại chưa đúng. Ví dụ: 0912345678')
      return
    }
    if (needsName && fullName.trim().length < 2) {
      setError('Vui lòng nhập họ tên')
      return
    }

    setLoading(true)
    try {
      const res = await bookingService.identify({
        phone,
        full_name: needsName ? fullName.trim() : undefined,
      })
      const result = res.data?.data ?? res.data

      if (result.needs_name) {
        setNeedsName(true)
        setLoading(false)
        return
      }

      bookingSession.save(result)
      onReady(result.registrant)
    } catch (err) {
      setError(err.response?.data?.message || 'Không kết nối được, thử lại giúp nhé')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
            <Phone className="h-7 w-7 text-primary-600" />
          </div>
          <h1 className="font-display text-xl font-semibold text-stone-900">
            {boardTitle || 'Đăng ký lịch học'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {needsName
              ? 'Số này lần đầu đăng ký — cho trung tâm xin họ tên nhé'
              : 'Nhập số điện thoại để xem và giữ chỗ. Lần sau chỉ cần nhập số này.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Số điện thoại"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="0912345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={needsName}
            required
            autoFocus={!needsName}
          />

          {needsName && (
            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn An"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {needsName ? 'Xong, vào chọn ca' : 'Tiếp tục'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>

          {needsName && (
            <button
              type="button"
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
              onClick={() => {
                setNeedsName(false)
                setFullName('')
                setError('')
              }}
            >
              Nhập lại số khác
            </button>
          )}
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Trung tâm chỉ lưu họ tên và số điện thoại để xếp lớp và liên hệ.
      </p>
    </div>
  )
}
