import { useCallback, useContext, useEffect, useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import LoadingSpinner from '../common/LoadingSpinner'
import { ToastContext } from '../../context/ToastContext'
import bookingService from '../../services/booking.service'
import { formatMoney } from '../../lib/bookingUtils'

/**
 * Quản lý các mức giá của một người đăng ký. Một người có thể có nhiều mức
 * (vd "Ca thường 200k", "Ca cuối tuần 300k", "Kèm riêng 450k").
 *
 * Sửa mức giá KHÔNG làm đổi tiền của các buổi đã xếp — backend chốt bản sao số
 * tiền tại thời điểm xếp. Có ghi rõ trong giao diện để admin không hiểu nhầm.
 */
export default function PriceTierModal({ registrant, isOpen, onClose, onChanged }) {
  const { success, error: showError } = useContext(ToastContext)
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', is_default: false })

  const load = useCallback(async () => {
    if (!registrant?.id) return
    setLoading(true)
    try {
      const res = await bookingService.listPriceTiers(registrant.id)
      setTiers(res.data?.data ?? res.data ?? [])
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được mức giá')
    } finally {
      setLoading(false)
    }
  }, [registrant?.id, showError])

  useEffect(() => {
    if (isOpen) {
      setForm({ name: '', amount: '', is_default: false })
      load()
    }
  }, [isOpen, load])

  const add = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showError('Nhập tên mức giá, ví dụ "Ca thường"')
      return
    }
    setSaving(true)
    try {
      await bookingService.createPriceTier(registrant.id, {
        name: form.name.trim(),
        amount: Number(String(form.amount).replace(/\D/g, '')) || 0,
        is_default: form.is_default,
      })
      success('Đã thêm mức giá')
      setForm({ name: '', amount: '', is_default: false })
      await load()
      onChanged?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Không thêm được')
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async (tier) => {
    setSaving(true)
    try {
      await bookingService.updatePriceTier(tier.id, { is_default: true })
      await load()
      onChanged?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Không đổi được mức mặc định')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (tier) => {
    setSaving(true)
    try {
      const res = await bookingService.deletePriceTier(tier.id)
      success(res.data?.message || 'Đã xóa mức giá')
      await load()
      onChanged?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Không xóa được')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mức giá của ${registrant?.full_name || ''}`}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : tiers.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            Chưa có mức giá nào. Thêm ở dưới.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {tiers.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-stone-900">
                    {t.name}
                    {t.is_default && (
                      <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700">
                        mặc định
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{formatMoney(t.amount)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={saving || t.is_default}
                    onClick={() => setDefault(t)}
                    title={t.is_default ? 'Đang là mức mặc định' : 'Đặt làm mức mặc định'}
                    className={clsx(
                      'rounded p-1.5 transition-colors',
                      t.is_default
                        ? 'text-primary-500'
                        : 'text-slate-300 hover:bg-primary-50 hover:text-primary-600'
                    )}
                  >
                    <Star className={clsx('h-4 w-4', t.is_default && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => remove(t)}
                    title="Xóa mức giá"
                    className="rounded p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Thêm mức giá</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Tên mức"
              placeholder="Ca thường"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Số tiền (VNĐ)"
              inputMode="numeric"
              placeholder="200000"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
              helperText={form.amount ? formatMoney(form.amount) : 'Chỉ nhập số'}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Đặt làm mức mặc định khi xếp lịch
          </label>
          <Button type="submit" size="sm" icon={Plus} loading={saving} onClick={add}>
            Thêm mức giá
          </Button>
        </form>

        <p className="text-xs text-slate-400">
          Sửa hoặc xóa mức giá <b>không làm đổi tiền của các buổi đã xếp</b> — mỗi lượt xếp đã chốt
          sẵn số tiền tại thời điểm đó, để đối chiếu sổ sách tháng cũ vẫn ra đúng con số.
        </p>
      </div>
    </Modal>
  )
}
