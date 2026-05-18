import { useState, useContext, useEffect } from 'react'
import { Printer, Upload, X } from 'lucide-react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'
import { printReceipt } from './ReceiptPrint'
import { formatCurrency } from '../../utils/formatCurrency'
import { resolveUploadUrl } from '../../utils/uploadUrl'

export default function RecordPaymentForm({ isOpen, invoice, onClose, onSuccess }) {
  const { success, error: showError } = useContext(ToastContext)
  const [form, setForm] = useState({
    amount: invoice?.balance || '',
    payment_method: 'cash',
    note: '',
    paid_at: new Date().toISOString().slice(0, 16),
    transfer_image_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [printAfter, setPrintAfter] = useState(true)

  useEffect(() => {
    if (invoice) {
      setForm((f) => ({ ...f, amount: invoice.balance || '' }))
    }
  }, [invoice])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(form.amount)
    if (!amt || amt <= 0) {
      showError('Số tiền không hợp lệ')
      return
    }
    if (amt > Number(invoice.balance) + 0.0001) {
      showError(`Số tiền vượt số còn lại (${formatCurrency(invoice.balance)})`)
      return
    }
    setLoading(true)
    try {
      const payload = {
        amount: amt,
        payment_method: form.payment_method,
        note: form.note || null,
        paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : new Date().toISOString(),
        transfer_image_url: form.transfer_image_url || null,
      }
      const res = await tuitionService.recordPayment(invoice.id, payload)
      const result = res.data?.data || res.data
      success('Ghi nhận thanh toán thành công')
      if (printAfter && result?.payment) {
        setTimeout(() => {
          printReceipt({ invoice: result.invoice || invoice, payment: result.payment })
        }, 200)
      }
      onSuccess?.(result)
    } catch (err) {
      showError(err.response?.data?.message || 'Thu tiền thất bại')
    } finally {
      setLoading(false)
    }
  }

  const setQuick = (frac) => {
    const v = Math.round(Number(invoice.balance) * frac)
    setForm((f) => ({ ...f, amount: v }))
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showError('Vui lòng chọn file ảnh')
      return
    }
    setUploading(true)
    try {
      const res = await tuitionService.uploadTransferImage(file)
      const data = res.data?.data || res.data
      const url = data?.urls?.[0]
      if (url) {
        setForm((f) => ({ ...f, transfer_image_url: url }))
        success('Tải ảnh thành công')
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Tải ảnh thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thu học phí"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading} icon={Printer}>
            Ghi nhận
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">HĐ:</span>
            <span className="font-mono">{invoice?.invoice_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">HS:</span>
            <span className="font-medium">{invoice?.student_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Lớp:</span>
            <span>{invoice?.class_name}</span>
          </div>
          <div className="flex justify-between mt-1 pt-1 border-t border-blue-200">
            <span className="text-gray-600">Còn lại:</span>
            <span className="font-bold text-rose-600">{formatCurrency(invoice?.balance)}</span>
          </div>
        </div>

        <div>
          <Input
            label="Số tiền thu"
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <div className="flex gap-2 mt-2">
            <button type="button" className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => setQuick(0.5)}>50%</button>
            <button type="button" className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => setQuick(1)}>100%</button>
          </div>
        </div>

        <Select
          label="Phương thức"
          value={form.payment_method}
          onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
          options={[
            { value: 'cash', label: 'Tiền mặt' },
            { value: 'bank_transfer', label: 'Chuyển khoản' },
            { value: 'card', label: 'Thẻ' },
            { value: 'other', label: 'Khác' },
          ]}
        />

        <Input
          label="Thời điểm thu"
          type="datetime-local"
          value={form.paid_at}
          onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
        />

        {form.payment_method === 'bank_transfer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ảnh chuyển khoản
            </label>
            {form.transfer_image_url ? (
              <div className="relative inline-block">
                <img
                  src={resolveUploadUrl(form.transfer_image_url)}
                  alt="Ảnh CK"
                  className="max-h-40 rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, transfer_image_url: '' }))}
                  className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                  title="Xóa ảnh"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-600">
                {uploading ? (
                  <span>Đang tải...</span>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Chọn ảnh chứng từ chuyển khoản</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        )}

        <Input
          label="Ghi chú"
          type="textarea"
          rows={2}
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={printAfter}
            onChange={(e) => setPrintAfter(e.target.checked)}
            className="rounded"
          />
          In phiếu thu sau khi ghi nhận
        </label>
      </form>
    </Modal>
  )
}
