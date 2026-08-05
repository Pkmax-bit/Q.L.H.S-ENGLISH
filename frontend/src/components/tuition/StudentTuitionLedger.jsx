import { DollarSign } from 'lucide-react'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

/** Sổ học phí + thu tiền nhanh cho một học sinh (dùng chung PaymentDesk & Công nợ HS). */
export default function StudentTuitionLedger({
  student,
  ledger,
  loading,
  onPay,
  onViewInvoice,
  onClearStudent,
}) {
  if (!student) return null

  return (
    <div className="app-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-lg font-semibold text-stone-900">{student.full_name}</div>
          <div className="text-xs text-stone-500">
            {student.email}
            {student.phone ? ` • ${student.phone}` : ''}
          </div>
        </div>
        {onClearStudent && (
          <Button variant="ghost" size="sm" onClick={onClearStudent}>
            Đóng / đổi học sinh
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải sổ học phí..." />
      ) : ledger ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Số HĐ" value={ledger.summary.invoice_count} />
            <Stat label="Tổng phải thu" value={formatCurrency(ledger.summary.total_amount)} />
            <Stat label="Đã thu" value={formatCurrency(ledger.summary.total_paid)} color="text-emerald-600" />
            <Stat
              label="Còn nợ học phí"
              value={formatCurrency(ledger.summary.total_outstanding)}
              color={ledger.summary.total_outstanding > 0 ? 'text-rose-600' : 'text-stone-500'}
              highlight={ledger.summary.total_outstanding > 0}
            />
          </div>

          {(ledger.invoices || []).length === 0 ? (
            <EmptyState message="Học sinh chưa có hóa đơn nào" />
          ) : (
            <div className="space-y-2">
              {ledger.invoices.map((inv) => {
                const canPay =
                  inv.status !== 'paid' && inv.status !== 'cancelled' && Number(inv.balance) > 0
                return (
                  <div
                    key={inv.id}
                    className={`border rounded-lg p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap ${
                      canPay ? 'border-amber-200/80 bg-amber-50/40' : 'border-stone-200/70 bg-stone-50/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-stone-500">{inv.invoice_no}</span>
                        <StatusBadge status={inv.status} />
                        <span className="text-sm text-stone-700">{inv.class_name}</span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Kỳ: {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                        {inv.due_date ? ` • Hạn: ${formatDate(inv.due_date)}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-stone-500">Còn nợ</div>
                      <div className={`font-bold text-lg ${canPay ? 'text-rose-600' : 'text-stone-400'}`}>
                        {formatCurrency(inv.balance)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                      <Button variant="ghost" size="sm" onClick={() => onViewInvoice(inv.id)}>
                        Xem
                      </Button>
                      {canPay && (
                        <Button size="sm" icon={DollarSign} onClick={() => onPay(inv)}>
                          Thu tiền
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function Stat({ label, value, color = 'text-stone-900', highlight }) {
  return (
    <div
      className={`rounded-lg p-3 border ${
        highlight ? 'bg-rose-50/80 border-rose-200/60' : 'bg-stone-50/80 border-stone-200/50'
      }`}
    >
      <div className="text-xs text-stone-500 mb-0.5">{label}</div>
      <div className={`text-base font-semibold ${color}`}>{value}</div>
    </div>
  )
}
