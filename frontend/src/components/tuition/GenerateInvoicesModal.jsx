import { useState, useContext, useEffect } from 'react'
import Modal from '../common/Modal'
import Select from '../common/Select'
import Input from '../common/Input'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'

export default function GenerateInvoicesModal({
  isOpen, onClose, classes = [], onSuccess, defaultClassId = '',
}) {
  const { success, error: showError } = useContext(ToastContext)
  const [form, setForm] = useState({
    mode: 'class',
    class_id: defaultClassId || '',
    year_month: new Date().toISOString().slice(0, 7),
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm((f) => ({
        ...f,
        class_id: defaultClassId || f.class_id,
        year_month: new Date().toISOString().slice(0, 7),
      }))
    }
  }, [isOpen, defaultClassId])

  const handleSubmit = async () => {
    if (!form.year_month) {
      showError('Vui lòng chọn tháng cần thu học phí')
      return
    }
    if (form.mode === 'class' && !form.class_id) {
      showError('Vui lòng chọn lớp')
      return
    }
    setLoading(true)
    try {
      const payload = {
        year_month: form.year_month,
        all_monthly: form.mode === 'all_monthly',
      }
      if (form.mode === 'class') payload.class_id = form.class_id
      const res = await tuitionService.generateInvoices(payload)
      const result = res.data?.data || res.data
      const created = result.created_count ?? result.totalCreated ?? 0
      const skipped = result.skipped_count ?? result.totalSkipped ?? 0
      success(`Đã sinh ${created} hóa đơn (${skipped} bỏ qua)`)
      onSuccess?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Sinh hóa đơn thất bại')
    } finally {
      setLoading(false)
    }
  }

  const classOptions = classes
    .filter((c) => c.fee_policy)
    .map((c) => ({
      value: c.id,
      label: `${c.name} (${policyLabel(c.fee_policy)})`,
    }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sinh hóa đơn học phí"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Sinh hóa đơn
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Phạm vi"
          value={form.mode}
          onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
          options={[
            { value: 'class', label: 'Theo 1 lớp' },
            { value: 'all_monthly', label: 'Tất cả lớp tính theo tháng' },
          ]}
        />

        {form.mode === 'class' && (
          <Select
            label="Lớp"
            value={form.class_id}
            onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
            options={classOptions}
            placeholder="Chọn lớp đã cấu hình học phí"
            required
          />
        )}

        <Input
          label="Tháng thu học phí"
          type="month"
          value={form.year_month}
          onChange={(e) => setForm((f) => ({ ...f, year_month: e.target.value }))}
          required
          helperText="Chọn tháng cần lập hóa đơn (ví dụ tháng hiện tại)."
        />

        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
          Hệ thống tự bỏ qua học sinh đã có hóa đơn cho tháng này — không tạo trùng.
        </div>
      </div>
    </Modal>
  )
}

function policyLabel(p) {
  return {
    per_class: 'Trọn gói',
    monthly: 'Theo tháng',
    per_session: 'Theo buổi',
  }[p] || p
}
