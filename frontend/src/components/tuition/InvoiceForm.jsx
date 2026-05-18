import { useState, useEffect, useContext, useMemo } from 'react'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'
import { formatCurrency } from '../../utils/formatCurrency'
import { toInputDate } from '../../utils/formatDate'
import { resolveUploadUrl } from '../../utils/uploadUrl'

// Helpers
const monthBounds = (yearMonth) => {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return { start: '', end: '' }
  const [y, m] = yearMonth.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { start, end }
}
const ymFromDate = (d) => (d ? d.slice(0, 7) : '')

export default function InvoiceForm({
  isOpen,
  mode = 'create',
  invoiceId = null,
  studentId = null,
  studentName = '',
  classId = null,
  className = '',
  feePolicy = null,
  feeAmount = 0,
  defaultYearMonth = null,
  onClose,
  onSuccess,
}) {
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = mode === 'edit'

  const [form, setForm] = useState(() => buildInitial({ defaultYearMonth }))
  const [items, setItems] = useState(() => buildInitialItems({ feePolicy, feeAmount, className, defaultYearMonth }))
  const [attachments, setAttachments] = useState([]) // string[]
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingItemIndex, setUploadingItemIndex] = useState(null)

  useEffect(() => {
    if (!isEdit || !invoiceId || !isOpen) return
    setLoadingDetail(true)
    tuitionService
      .getInvoiceById(invoiceId)
      .then((res) => {
        const inv = res.data?.data || res.data
        setForm({
          due_date: toInputDate(inv.due_date) || '',
          discount: inv.discount || 0,
          note: inv.note || '',
          fee_policy: inv.fee_policy || feePolicy || 'per_class',
        })
        setItems(
          (inv.items || []).map((it) => ({
            id: it.id,
            description: it.description || '',
            quantity: it.quantity || 1,
            unit_price: it.unit_price || 0,
            year_month: ymFromDate(it.period_start),
            period_start: toInputDate(it.period_start) || '',
            period_end: toInputDate(it.period_end) || '',
            attachment_urls: Array.isArray(it.attachment_urls) ? [...it.attachment_urls] : [],
          }))
        )
        setAttachments(Array.isArray(inv.attachment_urls) ? inv.attachment_urls : [])
      })
      .catch((err) => showError(err.response?.data?.message || 'Không tải được hóa đơn'))
      .finally(() => setLoadingDetail(false))
  }, [isEdit, invoiceId, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && !isEdit) {
      setForm(buildInitial({ defaultYearMonth }))
      setItems(buildInitialItems({ feePolicy, feeAmount, className, defaultYearMonth }))
      setAttachments([])
    }
  }, [isOpen, isEdit, feePolicy, feeAmount, defaultYearMonth, className])

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0),
    [items]
  )
  const total = Math.max(0, subtotal - (Number(form.discount) || 0))

  const updateItem = (i, key, val) => {
    setItems((arr) =>
      arr.map((it, idx) => {
        if (idx !== i) return it
        const next = { ...it, [key]: val }
        if (key === 'year_month') {
          const { start, end } = monthBounds(val)
          next.period_start = start
          next.period_end = end
          if (!next.description.trim() || /tháng \d{4}-\d{2}/i.test(next.description)) {
            next.description = `Học phí lớp ${className || ''} - tháng ${val}`.trim()
          }
        } else if (key === 'period_start') {
          next.year_month = val ? val.slice(0, 7) : ''
          // Auto-set end to last day of that month if end is empty or invalid
          if (val && (!next.period_end || next.period_end < val)) {
            const { end } = monthBounds(val.slice(0, 7))
            next.period_end = end
          }
        } else if (key === 'period_end') {
          if (val && next.period_start && val < next.period_start) {
            next.period_start = val
          }
        }
        return next
      })
    )
  }
  const addItem = (presetYM) => {
    const ym = presetYM || nextMonth(items[items.length - 1]?.year_month || defaultYearMonth || todayYM())
    const { start, end } = monthBounds(ym)
    setItems((arr) => [
      ...arr,
      {
        description: `Học phí lớp ${className || ''} - tháng ${ym}`.trim(),
        quantity: 1,
        unit_price: Number(feeAmount) || 0,
        year_month: ym,
        period_start: start,
        period_end: end,
        attachment_urls: [],
      },
    ])
  }
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i))

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const res = await tuitionService.uploadInvoiceImages(files)
      const data = res.data?.data || res.data
      const urls = Array.isArray(data?.urls) ? data.urls : []
      setAttachments((prev) => [...prev, ...urls])
      success(`Tải ${urls.length} ảnh thành công`)
    } catch (err) {
      showError(err.response?.data?.message || 'Tải ảnh thất bại')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeAttachment = (idx) => {
    setAttachments((arr) => arr.filter((_, i) => i !== idx))
  }

  const handleItemUpload = async (rowIndex, e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingItemIndex(rowIndex)
    try {
      const res = await tuitionService.uploadInvoiceImages(files)
      const data = res.data?.data || res.data
      const urls = Array.isArray(data?.urls) ? data.urls : []
      setItems((arr) =>
        arr.map((it, idx) => {
          if (idx !== rowIndex) return it
          const prev = Array.isArray(it.attachment_urls) ? it.attachment_urls : []
          return { ...it, attachment_urls: [...prev, ...urls] }
        })
      )
      success(`Đã thêm ${urls.length} ảnh cho dòng ${rowIndex + 1}`)
    } catch (err) {
      showError(err.response?.data?.message || 'Tải ảnh thất bại')
    } finally {
      setUploadingItemIndex(null)
      e.target.value = ''
    }
  }

  const removeItemAttachment = (rowIndex, urlIdx) => {
    setItems((arr) =>
      arr.map((it, idx) =>
        idx === rowIndex
          ? {
              ...it,
              attachment_urls: (it.attachment_urls || []).filter((_, i) => i !== urlIdx),
            }
          : it
      )
    )
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      showError('Cần ít nhất 1 dòng học phí')
      return
    }
    if (items.some((it) => !it.description?.trim())) {
      showError('Mỗi dòng cần có mô tả')
      return
    }
    if (items.some((it) => !it.period_start || !it.period_end)) {
      showError('Mỗi dòng cần chọn tháng')
      return
    }

    const itemPayload = items.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      amount: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
      period_start: it.period_start,
      period_end: it.period_end,
      attachment_urls: Array.isArray(it.attachment_urls) ? it.attachment_urls : [],
    }))

    const overallStart = itemPayload.map((i) => i.period_start).sort()[0]
    const overallEnd = itemPayload.map((i) => i.period_end).sort().slice(-1)[0]

    const payload = {
      student_id: studentId,
      class_id: classId,
      fee_policy: form.fee_policy || feePolicy || 'per_class',
      period_start: overallStart,
      period_end: overallEnd,
      due_date: form.due_date || null,
      subtotal,
      discount: Number(form.discount) || 0,
      note: form.note || null,
      attachment_urls: attachments,
      items: itemPayload,
    }

    setLoading(true)
    try {
      if (isEdit) {
        await tuitionService.updateInvoice(invoiceId, {
          period_start: overallStart,
          period_end: overallEnd,
          due_date: payload.due_date,
          subtotal: payload.subtotal,
          discount: payload.discount,
          note: payload.note,
          attachment_urls: attachments,
          items: items
            .filter((it) => it.id)
            .map((it) => ({
              id: it.id,
              attachment_urls: Array.isArray(it.attachment_urls) ? it.attachment_urls : [],
            })),
        })
        success('Cập nhật hóa đơn thành công')
      } else {
        await tuitionService.createInvoice(payload)
        success('Tạo hóa đơn thành công')
      }
      onSuccess?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu hóa đơn thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Sửa hóa đơn' : `Tạo hóa đơn cho ${studentName || 'học sinh'}`}
      size="2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading || loadingDetail}>
            {isEdit ? 'Cập nhật' : 'Tạo hóa đơn'}
          </Button>
        </>
      }
    >
      {loadingDetail ? (
        <div className="py-8 text-center text-gray-500">Đang tải...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Học sinh:</span>
              <span className="font-medium">{studentName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lớp:</span>
              <span className="font-medium">{className || '—'}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Học phí (có thể nhiều tháng)
              </label>
              {!isEdit && (
                <Button variant="ghost" size="sm" icon={Plus} onClick={() => addItem()}>
                  Thêm tháng
                </Button>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-600 w-44">Kỳ (tháng / ngày)</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-600">Mô tả</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 w-20">SL</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 w-32">Đơn giá</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 w-32">Thành tiền</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-600 w-36">Ảnh dòng</th>
                    {!isEdit && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">
                        <div className="space-y-1">
                          <input
                            type="month"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                            value={it.year_month || ''}
                            onChange={(e) => updateItem(i, 'year_month', e.target.value)}
                            disabled={isEdit}
                            title="Chọn nhanh theo tháng"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 w-6 shrink-0">Từ</span>
                            <input
                              type="date"
                              className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs"
                              value={it.period_start || ''}
                              onChange={(e) => updateItem(i, 'period_start', e.target.value)}
                              disabled={isEdit}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 w-6 shrink-0">Đến</span>
                            <input
                              type="date"
                              className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs"
                              value={it.period_end || ''}
                              onChange={(e) => updateItem(i, 'period_end', e.target.value)}
                              disabled={isEdit}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          className="w-full px-2 py-1 border border-gray-200 rounded"
                          value={it.description}
                          onChange={(e) => updateItem(i, 'description', e.target.value)}
                          disabled={isEdit}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          value={it.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          disabled={isEdit}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          value={it.unit_price}
                          onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                          disabled={isEdit}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">
                        {formatCurrency((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <div className="flex flex-wrap gap-1 max-w-[11rem]">
                          {(it.attachment_urls || []).map((url, ai) => (
                            <div key={`${url}-${ai}`} className="relative group/img">
                              <a href={resolveUploadUrl(url)} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={resolveUploadUrl(url)}
                                  alt=""
                                  className="h-12 w-12 object-cover rounded border border-gray-200"
                                />
                              </a>
                              <button
                                type="button"
                                onClick={() => removeItemAttachment(i, ai)}
                                className="absolute -top-1 -right-1 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                title="Xóa ảnh"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <label
                          className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 border border-dashed border-gray-300 rounded text-[11px] text-gray-600 cursor-pointer hover:border-blue-400 ${
                            uploadingItemIndex === i ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {uploadingItemIndex === i ? (
                            <span>...</span>
                          ) : (
                            <>
                              <Upload className="h-3 w-3 shrink-0" />
                              <span>Thêm ảnh</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleItemUpload(i, e)}
                            disabled={uploadingItemIndex !== null}
                          />
                        </label>
                      </td>
                      {!isEdit && (
                        <td className="px-1">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-red-100 text-red-500 disabled:opacity-30"
                            onClick={() => removeItem(i)}
                            disabled={items.length <= 1}
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEdit && (
              <p className="text-xs text-amber-600 mt-1">
                Các dòng kỳ/mô tả/số tiền không đổi khi sửa; có thể thêm hoặc xóa ảnh từng dòng và chỉnh thông tin hóa đơn phía dưới.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Hạn thanh toán"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
            <Input
              label="Giảm giá"
              type="number"
              value={form.discount}
              onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tạm tính ({items.length} dòng)</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {Number(form.discount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Giảm giá</span>
                <span>- {formatCurrency(form.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
              <span className="text-gray-700 font-medium">Tổng</span>
              <span className="font-bold text-blue-700">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ảnh đính kèm hóa đơn ({attachments.length})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {attachments.map((url, idx) => (
                <div key={idx} className="relative group">
                  <a href={resolveUploadUrl(url)} target="_blank" rel="noopener noreferrer">
                    <img
                      src={resolveUploadUrl(url)}
                      alt={`Đính kèm ${idx + 1}`}
                      className="h-24 w-full object-cover rounded border border-gray-200"
                    />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-600">
              {uploading ? (
                <span>Đang tải...</span>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Thêm ảnh hóa đơn (có thể chọn nhiều)</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          <Input
            label="Ghi chú"
            type="textarea"
            rows={2}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
      )}
    </Modal>
  )
}

function buildInitial({ defaultYearMonth }) {
  let due_date = ''
  if (defaultYearMonth) {
    const { start } = monthBounds(defaultYearMonth)
    due_date = start
  }
  return { due_date, discount: 0, note: '', fee_policy: null }
}

function buildInitialItems({ feePolicy, feeAmount, className, defaultYearMonth }) {
  const ym = defaultYearMonth || todayYM()
  const { start, end } = monthBounds(ym)
  const desc =
    feePolicy === 'per_class'
      ? `Học phí trọn gói lớp ${className || ''}`
      : `Học phí lớp ${className || ''} - tháng ${ym}`
  return [
    {
      description: desc.trim(),
      quantity: 1,
      unit_price: Number(feeAmount) || 0,
      year_month: ym,
      period_start: start,
      period_end: end,
      attachment_urls: [],
    },
  ]
}

function todayYM() {
  return new Date().toISOString().slice(0, 7)
}

function nextMonth(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return todayYM()
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 1)) // m = next month (0-indexed +1)
  return d.toISOString().slice(0, 7)
}
