import { useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, Phone, Tag, Users, Wallet } from 'lucide-react'
import clsx from 'clsx'
import Button from '../components/common/Button'
import Table from '../components/common/Table'
import PriceTierModal from '../components/booking/PriceTierModal'
import { useFetch } from '../hooks/useFetch'
import { ToastContext } from '../context/ToastContext'
import bookingService from '../services/booking.service'
import { formatDate, formatMoney } from '../lib/bookingUtils'

/**
 * Quản lý học viên đã đăng ký qua trang công khai và học phí của họ.
 *
 * Đây là nơi "setup tự động học phí": đặt một mức giá MẶC ĐỊNH cho từng người,
 * thì mỗi lần xếp họ vào ca là tiền tự điền, không phải gõ lại.
 */
export default function BookingRegistrantsPage() {
  const { error: showError } = useContext(ToastContext)
  const [tierTarget, setTierTarget] = useState(null)

  const fetchList = useCallback(() => bookingService.listRegistrants(), [])
  const { data, loading, execute: reload } = useFetch(fetchList, [])
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          people: acc.people + 1,
          sessions: acc.sessions + r.session_count,
          amount: acc.amount + Number(r.total_amount || 0),
          unpriced: acc.unpriced + r.unpriced_count,
          noTier: acc.noTier + (r.tier_count === 0 ? 1 : 0),
        }),
        { people: 0, sessions: 0, amount: 0, unpriced: 0, noTier: 0 }
      ),
    [rows]
  )

  const columns = [
    { key: 'full_name', label: 'Họ tên' },
    {
      key: 'phone',
      label: 'Số điện thoại',
      render: (r) => (
        <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-primary-700 hover:underline">
          <Phone className="h-3 w-3" />
          {r.phone}
        </a>
      ),
    },
    {
      key: 'session_count',
      label: 'Buổi đã xếp',
      render: (r) => (
        <span className="flex items-center gap-1.5">
          {r.session_count}
          {r.waitlist_count > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              +{r.waitlist_count} chờ
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'default_tier_name',
      label: 'Mức giá mặc định',
      render: (r) =>
        r.default_tier_name ? (
          <span className="flex items-center gap-1 text-sm">
            <Tag className="h-3 w-3 text-primary-500" />
            {r.default_tier_name} · {formatMoney(r.default_tier_amount)}
          </span>
        ) : r.tier_count > 0 ? (
          <span className="text-xs text-amber-600">có {r.tier_count} mức, chưa chọn mặc định</span>
        ) : (
          <span className="text-xs text-slate-300">chưa đặt</span>
        ),
    },
    {
      key: 'total_amount',
      label: 'Tổng học phí',
      render: (r) => (
        <span className="font-medium text-emerald-700">{formatMoney(r.total_amount)}</span>
      ),
    },
    {
      key: 'unpriced_count',
      label: 'Buổi chưa có giá',
      render: (r) =>
        r.unpriced_count > 0 ? (
          <span className="flex items-center gap-1 font-medium text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {r.unpriced_count}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'last_session_date',
      label: 'Buổi gần nhất',
      render: (r) => (r.last_session_date ? formatDate(r.last_session_date) : '—'),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-stone-900">Học viên đăng ký</h1>
        <p className="mt-1 text-sm text-slate-500">
          Người đăng ký qua trang công khai. Đặt <b>mức giá mặc định</b> cho từng người thì mỗi lần xếp
          vào ca học phí sẽ tự điền.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Học viên', value: totals.people, icon: Users, tone: 'text-primary-700' },
          { label: 'Buổi đã xếp', value: totals.sessions, icon: null, tone: 'text-stone-900' },
          { label: 'Tổng học phí', value: formatMoney(totals.amount), icon: Wallet, tone: 'text-emerald-700' },
          {
            label: 'Buổi chưa có giá',
            value: totals.unpriced,
            icon: AlertTriangle,
            tone: totals.unpriced > 0 ? 'text-red-600' : 'text-slate-400',
          },
          {
            label: 'Chưa đặt mức giá',
            value: totals.noTier,
            icon: Tag,
            tone: totals.noTier > 0 ? 'text-amber-600' : 'text-slate-400',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <p className="flex items-center gap-1 text-xs text-slate-500">
              {s.icon && <s.icon className="h-3 w-3" />}
              {s.label}
            </p>
            <p className={clsx('font-display text-lg font-semibold', s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      {totals.unpriced > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Có <b>{totals.unpriced} buổi đã xếp nhưng chưa có học phí</b>. Nguyên nhân thường gặp: học viên
          chưa có mức giá mặc định <i>và</i> ca đó cũng chưa đặt học phí. Đặt một trong hai là các buổi
          xếp sau sẽ tự có giá — buổi đã xếp rồi thì phải sửa giá từng cái ở tab <b>Xếp lịch</b>.
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Tìm theo tên hoặc số điện thoại..."
        pageSize={20}
        emptyMessage="Chưa có ai đăng ký qua trang công khai"
        emptyIcon={Users}
        actions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            icon={Tag}
            onClick={() => setTierTarget({ id: row.id, full_name: row.full_name })}
          >
            Mức giá
          </Button>
        )}
      />

      <PriceTierModal
        registrant={tierTarget}
        isOpen={Boolean(tierTarget)}
        onClose={() => setTierTarget(null)}
        onChanged={reload}
      />
    </div>
  )
}
