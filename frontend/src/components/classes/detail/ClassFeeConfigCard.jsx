import { useState, useContext } from 'react'
import { DollarSign, Save, Edit2 } from 'lucide-react'
import Button from '../../common/Button'
import Select from '../../common/Select'
import Input from '../../common/Input'
import { ToastContext } from '../../../context/ToastContext'
import { AuthContext } from '../../../context/AuthContext'
import classesService from '../../../services/classes.service'
import { formatCurrency } from '../../../utils/formatCurrency'

const POLICY_LABELS = {
  per_class: 'Trọn gói (1 hóa đơn / khóa)',
  monthly: 'Theo tháng',
  per_session: 'Theo buổi',
}

export default function ClassFeeConfigCard({ classInfo, onUpdated }) {
  const { user } = useContext(AuthContext) || {}
  const { success, error: showError } = useContext(ToastContext)
  const isAdmin = user?.role === 'admin'

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fee_policy: classInfo.fee_policy || '',
    fee_amount: classInfo.fee_amount || 0,
    billing_day: classInfo.billing_day || 1,
    sessions_per_period: classInfo.sessions_per_period || 0,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        fee_policy: form.fee_policy || null,
        fee_amount: Number(form.fee_amount) || 0,
        billing_day: Number(form.billing_day) || 1,
        sessions_per_period: Number(form.sessions_per_period) || 0,
      }
      await classesService.update(classInfo.id, payload)
      success('Cập nhật cấu hình học phí')
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Cấu hình học phí
        </h3>
        {isAdmin && !editing && (
          <Button variant="ghost" size="sm" icon={Edit2} onClick={() => setEditing(true)}>
            Sửa
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-2 text-sm">
          <Row label="Chế độ tính phí" value={POLICY_LABELS[classInfo.fee_policy] || 'Chưa cấu hình'} />
          <Row label="Đơn giá" value={formatCurrency(classInfo.fee_amount || 0)} />
          {classInfo.fee_policy === 'monthly' && (
            <Row label="Ngày chốt sổ" value={`Ngày ${classInfo.billing_day || 1} hàng tháng`} />
          )}
          {classInfo.fee_policy === 'per_session' && (
            <Row label="Số buổi / kỳ" value={classInfo.sessions_per_period || 0} />
          )}
          {!classInfo.fee_policy && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded p-2 mt-2">
              Chưa cấu hình. Khi đã cấu hình, admin có thể vào trang Tài chính - tab "Hóa đơn học phí" để sinh hóa đơn.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Select
            label="Chế độ tính phí"
            value={form.fee_policy}
            onChange={(e) => setForm((f) => ({ ...f, fee_policy: e.target.value }))}
            options={[
              { value: 'per_class', label: POLICY_LABELS.per_class },
              { value: 'monthly', label: POLICY_LABELS.monthly },
              { value: 'per_session', label: POLICY_LABELS.per_session },
            ]}
            placeholder="Chưa cấu hình"
          />
          <Input
            label={form.fee_policy === 'per_session' ? 'Đơn giá / buổi' : 'Đơn giá'}
            type="number"
            value={form.fee_amount}
            onChange={(e) => setForm((f) => ({ ...f, fee_amount: e.target.value }))}
          />
          {form.fee_policy === 'monthly' && (
            <Input
              label="Ngày chốt sổ (1-28)"
              type="number"
              min={1}
              max={28}
              value={form.billing_day}
              onChange={(e) => setForm((f) => ({ ...f, billing_day: e.target.value }))}
            />
          )}
          {form.fee_policy === 'per_session' && (
            <Input
              label="Số buổi / kỳ"
              type="number"
              min={0}
              value={form.sessions_per_period}
              onChange={(e) => setForm((f) => ({ ...f, sessions_per_period: e.target.value }))}
            />
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Hủy
            </Button>
            <Button size="sm" icon={Save} onClick={handleSave} loading={saving}>
              Lưu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
