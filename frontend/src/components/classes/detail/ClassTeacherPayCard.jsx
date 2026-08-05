import { useState, useContext } from 'react'
import { Wallet, Save, Edit2 } from 'lucide-react'
import Button from '../../common/Button'
import Select from '../../common/Select'
import Input from '../../common/Input'
import { ToastContext } from '../../../context/ToastContext'
import { AuthContext } from '../../../context/AuthContext'
import classesService from '../../../services/classes.service'
import { formatCurrency } from '../../../utils/formatCurrency'

const PAY_POLICY_LABELS = {
  none: 'Không tính lương tự động',
  per_class: 'Theo lớp (một khoản / kỳ)',
  per_session: 'Theo buổi (điểm danh GV có mặt)',
}

export default function ClassTeacherPayCard({ classInfo, onUpdated }) {
  const { user } = useContext(AuthContext) || {}
  const { success, error: showError } = useContext(ToastContext)
  const isAdmin = user?.role === 'admin'

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    teacher_pay_policy: classInfo.teacher_pay_policy || 'none',
    teacher_pay_amount: classInfo.teacher_pay_amount || 0,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await classesService.update(classInfo.id, {
        teacher_pay_policy: form.teacher_pay_policy || 'none',
        teacher_pay_amount: Number(form.teacher_pay_amount) || 0,
      })
      success('Cập nhật lương giáo viên')
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-amber-600" />
          Chi trả giáo viên
        </h3>
        {!editing && (
          <Button variant="ghost" size="sm" icon={Edit2} onClick={() => setEditing(true)}>
            Sửa
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-2 text-sm">
          <Row label="Chế độ" value={PAY_POLICY_LABELS[classInfo.teacher_pay_policy] || PAY_POLICY_LABELS.none} />
          <Row label="Mức chi" value={formatCurrency(classInfo.teacher_pay_amount || 0)} />
          {classInfo.teacher_pay_policy === 'per_session' && (
            <p className="text-xs text-stone-500 mt-2">
              Sau khi điểm danh buổi học và GV có mặt, hệ thống tự tạo khoản chi chờ thanh toán trong Tài chính → Lương GV.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Select
            label="Chế độ trả lương"
            value={form.teacher_pay_policy}
            onChange={(e) => setForm((f) => ({ ...f, teacher_pay_policy: e.target.value }))}
            options={[
              { value: 'none', label: PAY_POLICY_LABELS.none },
              { value: 'per_class', label: PAY_POLICY_LABELS.per_class },
              { value: 'per_session', label: PAY_POLICY_LABELS.per_session },
            ]}
          />
          <Input
            label="Số tiền (VNĐ)"
            type="number"
            min={0}
            value={form.teacher_pay_amount}
            onChange={(e) => setForm((f) => ({ ...f, teacher_pay_amount: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" icon={Save} loading={saving} onClick={handleSave}>
              Lưu
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
