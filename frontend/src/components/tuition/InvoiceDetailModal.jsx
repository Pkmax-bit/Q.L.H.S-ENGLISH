import { useState, useEffect, useContext, useCallback } from 'react'
import { Printer, Trash2, Plus, Edit2, Image as ImageIcon } from 'lucide-react'
import { resolveUploadUrl } from '../../utils/uploadUrl'
import Modal from '../common/Modal'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import LoadingSpinner from '../common/LoadingSpinner'
import RecordPaymentForm from './RecordPaymentForm'
import InvoiceForm from './InvoiceForm'
import { printReceipt } from './ReceiptPrint'
import { ToastContext } from '../../context/ToastContext'
import { AuthContext } from '../../context/AuthContext'
import tuitionService from '../../services/tuition.service'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

const methodLabels = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  other: 'Khác',
}

export default function InvoiceDetailModal({ invoiceId, isOpen, onClose, onChanged }) {
  const { user } = useContext(AuthContext) || {}
  const { success, error: showError } = useContext(ToastContext)
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const isAdmin = user?.role === 'admin'

  const load = useCallback(async () => {
    if (!invoiceId) return
    setLoading(true)
    try {
      const res = await tuitionService.getInvoiceById(invoiceId)
      setInvoice(res.data?.data || res.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được hóa đơn')
    } finally {
      setLoading(false)
    }
  }, [invoiceId, showError])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  const handlePaymentSuccess = () => {
    setShowPay(false)
    load()
    onChanged?.()
  }

  const handleDeletePayment = async (payment) => {
    if (!window.confirm(`Xóa khoản thu ${formatCurrency(payment.amount)}? Dòng tiền tương ứng cũng sẽ bị xóa.`)) return
    try {
      await tuitionService.deletePayment(payment.id)
      success('Đã xóa khoản thu')
      load()
      onChanged?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    }
  }

  const handlePrintInvoice = () => {
    if (!invoice) return
    printReceipt({ invoice, payment: null })
  }

  const handlePrintReceipt = (payment) => {
    if (!invoice) return
    printReceipt({ invoice, payment })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Hóa đơn ${invoice?.invoice_no || ''}`}
      size="2xl"
      footer={
        <>
          <Button variant="outline" icon={Printer} onClick={handlePrintInvoice} disabled={!invoice}>
            In hóa đơn
          </Button>
          {isAdmin && invoice && invoice.status !== 'cancelled' && (
            <Button variant="outline" icon={Edit2} onClick={() => setShowEdit(true)}>
              Sửa
            </Button>
          )}
          {isAdmin && invoice && invoice.balance > 0 && invoice.status !== 'cancelled' && (
            <Button icon={Plus} onClick={() => setShowPay(true)}>
              Thu tiền
            </Button>
          )}
        </>
      }
    >
      {loading || !invoice ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
            <Field label="Học sinh" value={invoice.student_name} />
            <Field label="Lớp" value={invoice.class_name} />
            <Field
              label="Kỳ"
              value={`${formatDate(invoice.period_start)} → ${formatDate(invoice.period_end)}`}
            />
            <Field label="Hạn thanh toán" value={formatDate(invoice.due_date) || '—'} />
            <Field
              label="Trạng thái"
              value={<StatusBadge status={invoice.status} />}
            />
            <Field label="Chế độ phí" value={policyLabel(invoice.fee_policy)} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Chi tiết</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-40">Kỳ</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Mô tả</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">SL</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-32">Đơn giá</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-32">Thành tiền</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-36">Ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((it) => (
                    <tr key={it.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {it.period_start
                          ? `${formatDate(it.period_start)}${it.period_end && it.period_end !== it.period_start ? ` → ${formatDate(it.period_end)}` : ''}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2">{it.description}</td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.amount)}</td>
                      <td className="px-3 py-2 align-top">
                        {Array.isArray(it.attachment_urls) && it.attachment_urls.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {it.attachment_urls.map((url, idx) => (
                              <a
                                key={`${it.id}-${idx}`}
                                href={resolveUploadUrl(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block shrink-0"
                              >
                                <img
                                  src={resolveUploadUrl(url)}
                                  alt=""
                                  className="h-14 w-14 object-cover rounded border border-gray-200 hover:border-blue-400"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!invoice.items || invoice.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-gray-400">
                        Không có dòng chi tiết
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className="px-3 py-2 text-right">
                      Tạm tính
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(invoice.subtotal)}</td>
                    <td className="px-3 py-2" />
                  </tr>
                  {Number(invoice.discount) > 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right">
                        Giảm giá
                      </td>
                      <td className="px-3 py-2 text-right text-rose-600">
                        - {formatCurrency(invoice.discount)}
                      </td>
                      <td className="px-3 py-2" />
                    </tr>
                  )}
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className="px-3 py-2 text-right">
                      Tổng cộng
                    </td>
                    <td className="px-3 py-2 text-right text-lg">{formatCurrency(invoice.total)}</td>
                    <td className="px-3 py-2" />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-emerald-700">
                      Đã thu
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      {formatCurrency(invoice.paid_amount)}
                    </td>
                    <td className="px-3 py-2" />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-rose-700">
                      Còn lại
                    </td>
                    <td className="px-3 py-2 text-right text-rose-700 font-bold">
                      {formatCurrency(invoice.balance)}
                    </td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {Array.isArray(invoice.attachment_urls) && invoice.attachment_urls.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-500" />
                Ảnh đính kèm ({invoice.attachment_urls.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {invoice.attachment_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={resolveUploadUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={resolveUploadUrl(url)}
                      alt={`Đính kèm ${idx + 1}`}
                      className="h-24 w-full object-cover rounded border border-gray-200 hover:border-blue-400 transition-colors"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Lịch sử thu tiền</h3>
            {(invoice.payments || []).length === 0 ? (
              <p className="text-sm text-gray-500 italic">Chưa có khoản thu nào</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">{p.receipt_no}</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                        <span className="text-xs text-gray-500">
                          ({methodLabels[p.payment_method] || p.payment_method})
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDateTime(p.paid_at)} • Thu bởi {p.collected_by_name || '—'}
                      </div>
                      {p.note && <div className="text-xs text-gray-600 mt-1">{p.note}</div>}
                      {p.transfer_image_url && (
                        <a
                          href={resolveUploadUrl(p.transfer_image_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:underline"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Xem ảnh chuyển khoản
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                        title="In phiếu thu"
                        onClick={() => handlePrintReceipt(p)}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          title="Xóa khoản thu"
                          onClick={() => handleDeletePayment(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showPay && invoice && (
        <RecordPaymentForm
          isOpen={showPay}
          invoice={invoice}
          onClose={() => setShowPay(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showEdit && invoice && (
        <InvoiceForm
          isOpen={showEdit}
          mode="edit"
          invoiceId={invoice.id}
          studentName={invoice.student_name}
          className={invoice.class_name}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            load()
            onChanged?.()
          }}
        />
      )}
    </Modal>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value || '—'}</div>
    </div>
  )
}

function policyLabel(p) {
  return {
    per_class: 'Trọn gói',
    monthly: 'Theo tháng',
    per_session: 'Theo buổi',
  }[p] || p
}
