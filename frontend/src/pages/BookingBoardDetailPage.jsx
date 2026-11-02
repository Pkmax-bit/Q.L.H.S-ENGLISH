import { useCallback, useContext, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, Copy, Download, ExternalLink, EyeOff,
  Hourglass, Pencil, Plus, Trash2, UserPlus, Users, X,
} from 'lucide-react'
import clsx from 'clsx'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ConfirmDialog from '../components/common/ConfirmDialog'
import BookingSlotForm from '../components/booking/BookingSlotForm'
import WeekPicker from '../components/booking/WeekPicker'
import HourGrid from '../components/booking/HourGrid'
import SelectionBar from '../components/booking/SelectionBar'
import { useFetch } from '../hooks/useFetch'
import { ToastContext } from '../context/ToastContext'
import bookingService from '../services/booking.service'
import { DAY_SHORT, WEEK_ORDER, colorClasses, formatDate, formatDateTime, formatShortDate } from '../lib/bookingUtils'

const STATUS_BADGE = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  waitlist: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL = { confirmed: 'Đã giữ chỗ', waitlist: 'Hàng chờ', cancelled: 'Đã hủy' }

export default function BookingBoardDetailPage() {
  const { id } = useParams()
  const { success, error: showError } = useContext(ToastContext)

  const [week, setWeek] = useState(null) // null = backend tự chọn tuần phù hợp
  const [tab, setTab] = useState('slots')

  // Lưới ca theo TUẦN đang xem
  const fetchDetail = useCallback(() => bookingService.getBoardDetail(id, week), [id, week])
  const { data, loading, execute: reload } = useFetch(fetchDetail, [id, week])

  // Danh sách đăng ký lấy riêng, phủ TẤT CẢ các tuần — chốt lớp thì cần xem hết,
  // không ai muốn bấm qua từng tuần để gom số điện thoại.
  const fetchRegs = useCallback(() => bookingService.listRegistrations(id, {}), [id])
  const { data: regsData, loading: regsLoading, execute: reloadRegs } = useFetch(fetchRegs, [id])

  const board = data?.board
  const weeks = useMemo(() => data?.weeks || [], [data])
  const creators = useMemo(() => data?.creators || [], [data])
  const slots = useMemo(() => data?.slots || [], [data])
  const registrationRows = useMemo(() => regsData?.data || [], [regsData])

  const [slotFormOpen, setSlotFormOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotPrefill, setSlotPrefill] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [savingSlot, setSavingSlot] = useState(false)
  const [deleteSlotTarget, setDeleteSlotTarget] = useState(null)
  const [deletingSlot, setDeletingSlot] = useState(false)
  const [addEntrySlot, setAddEntrySlot] = useState(null)
  const [entryForm, setEntryForm] = useState({ phone: '', full_name: '' })
  const [addingEntry, setAddingEntry] = useState(false)

  const publicUrl = board ? `${window.location.origin}/dk/${board.slug}` : ''
  const multiWeek = (board?.week_count || 1) > 1

  // Nút "Thêm ca học" thường: bỏ lựa chọn đang có, nếu không form sẽ mở nhầm
  // sang chế độ lô vì nó nhận biết qua prop `cells`
  const openCreateSlot = () => {
    setEditingSlot(null)
    setSlotPrefill(null)
    setSelectedCells([])
    setSlotFormOpen(true)
  }

  const toggleCell = ({ key, day_of_week, hour, date }) => {
    setSelectedCells((prev) =>
      prev.some((c) => c.key === key)
        ? prev.filter((c) => c.key !== key)
        : [...prev, { key, day_of_week, hour, date }]
    )
  }

  // Mở form cho cả lô ô đã quét; giờ của từng ô do chính ô đó quyết định
  const openCreateFromCells = () => {
    setEditingSlot(null)
    setSlotPrefill(null)
    setSlotFormOpen(true)
  }

  const reloadAll = () => {
    reload()
    reloadRegs()
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      success('Đã copy link')
    } catch {
      showError('Trình duyệt không cho copy, bạn copy thủ công giúp nhé')
    }
  }

  const handleSlotSubmit = async (payload) => {
    setSavingSlot(true)
    try {
      if (editingSlot) {
        await bookingService.updateSlot(editingSlot.id, payload)
        success('Đã cập nhật ca học')
      } else {
        const res = await bookingService.createSlotsBulk(id, payload)
        success(res.data?.message || 'Đã thêm ca học')
      }
      setSlotFormOpen(false)
      setEditingSlot(null)
      setSlotPrefill(null)
      setSelectedCells([])
      reloadAll()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu ca học thất bại')
    } finally {
      setSavingSlot(false)
    }
  }

  const handleDeleteSlot = async () => {
    if (!deleteSlotTarget) return
    setDeletingSlot(true)
    try {
      await bookingService.deleteSlot(deleteSlotTarget.id)
      success('Đã xóa ca học')
      setDeleteSlotTarget(null)
      reloadAll()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeletingSlot(false)
    }
  }

  const handleAddEntry = async (e) => {
    e.preventDefault()
    if (!addEntrySlot) return
    setAddingEntry(true)
    try {
      const res = await bookingService.adminAddEntry(addEntrySlot.id, {
        phone: entryForm.phone,
        full_name: entryForm.full_name.trim() || undefined,
        // Ngày cụ thể của ca trong tuần đang xem — bắt buộc từ migration 039
        session_date: addEntrySlot.date,
      })
      success(res.data?.message || 'Đã đăng ký hộ')
      setAddEntrySlot(null)
      setEntryForm({ phone: '', full_name: '' })
      reloadAll()
    } catch (err) {
      showError(err.response?.data?.message || 'Không đăng ký được')
    } finally {
      setAddingEntry(false)
    }
  }

  const handleCancelEntry = async (entry) => {
    try {
      await bookingService.adminCancelEntry(entry.id)
      success(`Đã hủy chỗ của ${entry.full_name || 'người này'}`)
      reloadAll()
    } catch (err) {
      showError(err.response?.data?.message || 'Không hủy được')
    }
  }

  const handleExport = async () => {
    try {
      const res = await bookingService.exportRegistrations(id, {})
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `dang-ky-${board?.week_start || 'tuan'}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được file')
    }
  }

  // Thống kê của TUẦN đang xem; sĩ số mỗi tuần mở lại từ đầu nên cộng cả bảng là vô nghĩa
  const totals = useMemo(() => {
    let capacity = 0
    let confirmed = 0
    let waitlist = 0
    for (const s of slots) {
      if (s.is_active) capacity += s.capacity
      confirmed += s.confirmed_count
      waitlist += s.waitlist_count
    }
    return { capacity, confirmed, waitlist }
  }, [slots])

  const columns = [
    { key: 'date', label: 'Ngày', render: (r) => `${DAY_SHORT[r.day_of_week]} ${formatShortDate(r.date)}` },
    { key: 'start_time', label: 'Giờ', render: (r) => `${r.start_time}–${r.end_time}` },
    { key: 'slot_label', label: 'Ca', render: (r) => r.slot_label || '—' },
    { key: 'full_name', label: 'Họ tên' },
    {
      key: 'phone',
      label: 'Số điện thoại',
      render: (r) => (
        <a href={`tel:${r.phone}`} className="text-primary-700 hover:underline">
          {r.phone}
        </a>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (r) => (
        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[r.status])}>
          {STATUS_LABEL[r.status] || r.status}
        </span>
      ),
    },
    { key: 'created_at', label: 'Đăng ký lúc', render: (r) => formatDateTime(r.created_at) },
  ]

  if (loading && !board) return <LoadingSpinner />
  if (!board) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">Không tìm thấy bảng đăng ký này.</p>
        <Link to="/booking-boards" className="mt-3 inline-block text-sm text-primary-700 hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    )
  }

  const byDay = new Map(WEEK_ORDER.map((d) => [d, []]))
  for (const slot of slots) {
    if (byDay.has(slot.day_of_week)) byDay.get(slot.day_of_week).push(slot)
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/booking-boards"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách bảng đăng ký
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-stone-900">{board.title}</h1>
              <span
                className={
                  board.is_accepting
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                    : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'
                }
              >
                {board.is_accepting ? 'Đang mở' : 'Đã đóng'}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {multiWeek ? `${board.week_count} tuần: ` : 'Tuần '}
              {formatDate(board.week_start)} – {formatDate(board.week_end)}
              {board.max_slots_per_person > 0 && ` · tối đa ${board.max_slots_per_person} ca/người/tuần`}
            </p>
            {board.description && <p className="mt-2 text-sm text-slate-600">{board.description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={Copy} onClick={copyLink}>
              Copy link
            </Button>
            <a href={`/dk/${board.slug}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" icon={ExternalLink}>
                Xem như học viên
              </Button>
            </a>
            <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
              Xuất CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: multiWeek ? 'Số ca / tuần' : 'Số ca', value: slots.length },
            { label: multiWeek ? 'Sĩ số tuần này' : 'Tổng sĩ số', value: totals.capacity },
            { label: 'Đã giữ chỗ (tuần này)', value: totals.confirmed },
            { label: 'Hàng chờ (tuần này)', value: totals.waitlist },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="font-display text-lg font-semibold text-stone-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <WeekPicker
        weeks={weeks}
        selected={board.selected_week}
        onSelect={(w) => {
          setSelectedCells([])
          setWeek(w)
        }}
        disabled={loading}
      />

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: 'slots', label: `Ca học${multiWeek ? ' (tuần đang xem)' : ''} (${slots.length})` },
          { key: 'registrations', label: `Danh sách đăng ký${multiWeek ? ' (mọi tuần)' : ''} (${registrationRows.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'slots' ? (
        <div className="space-y-4">
          {creators.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Màu theo người tạo</span>
              {creators.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={clsx('h-2.5 w-2.5 rounded-full', colorClasses(c.color).dot)} aria-hidden="true" />
                  {c.name}
                  <span className="text-slate-400">({c.slot_count} ca)</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {multiWeek && (
              <p className="text-xs text-slate-400">
                Ca học dùng chung cho mọi tuần. Sĩ số và danh sách bên dưới là của tuần{' '}
                {formatDate(board.selected_week)} – {formatDate(board.selected_week_end)}.
              </p>
            )}
            <Button icon={Plus} className="ml-auto" onClick={() => openCreateSlot()}>
              Thêm ca học
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs text-slate-400">
              Bấm chọn các ô trống (chọn được nhiều ô) rồi bấm <b>Tạo lịch</b> · bấm ca có sẵn để sửa
            </p>
            <HourGrid
              mode="admin"
              board={board}
              slots={slots}
              weekStart={board.selected_week}
              selected={selectedCells.map((c) => c.key)}
              onToggleSelect={toggleCell}
              onSlotClick={(slot) => {
                setSlotPrefill(null)
                setEditingSlot(slot)
                setSlotFormOpen(true)
              }}
            />
            <SelectionBar
              count={selectedCells.length}
              items={selectedCells.map((c) => `${DAY_SHORT[c.day_of_week]} ${String(c.hour).padStart(2, '0')}:00`)}
              actionLabel={`Tạo lịch ${selectedCells.length} ca`}
              onConfirm={openCreateFromCells}
              onClear={() => setSelectedCells([])}
            />
          </div>

          {slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <p className="text-sm text-slate-500">Chưa có ca nào. Thêm ca để học viên bắt đầu giữ chỗ.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {WEEK_ORDER.flatMap((dow) =>
                (byDay.get(dow) || []).map((slot) => (
                  <div
                    key={slot.id}
                    className={clsx(
                      'rounded-2xl border-l-4 border-y border-r bg-white p-4 shadow-sm',
                      slot.is_active
                        ? colorClasses(slot.color).border
                        : 'border-dashed border-slate-300 bg-slate-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                          <span
                            className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', colorClasses(slot.color).dot)}
                            aria-hidden="true"
                          />
                          {DAY_SHORT[slot.day_of_week]} {formatShortDate(slot.date)} · {slot.start_time}–{slot.end_time}
                        </p>
                        {slot.label && <p className="mt-0.5 truncate text-sm text-slate-600">{slot.label}</p>}
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[slot.teacher_name, slot.room_name].filter(Boolean).join(' · ') || 'Chưa gán GV/phòng'}
                        </p>
                        {slot.creator_name && (
                          <p className="mt-0.5 text-xs text-slate-400">Ca do {slot.creator_name} tạo</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Sửa ca"
                          onClick={() => {
                            setEditingSlot(slot)
                            setSlotFormOpen(true)
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Xóa ca"
                          onClick={() => setDeleteSlotTarget(slot)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 font-medium text-primary-700">
                        <Users className="h-3.5 w-3.5" />
                        {slot.confirmed_count}/{slot.capacity}
                      </span>
                      {slot.waitlist_count > 0 && (
                        <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                          <Hourglass className="h-3.5 w-3.5" />
                          {slot.waitlist_count} chờ
                        </span>
                      )}
                      {slot.allow_waitlist && <span className="text-slate-400">có hàng chờ</span>}
                      {!slot.is_active && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <EyeOff className="h-3.5 w-3.5" />
                          đang ẩn
                        </span>
                      )}
                    </div>

                    {slot.entries.length > 0 && (
                      <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                        {slot.entries.map((entry) => (
                          <li key={entry.id} className="flex items-center justify-between gap-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-stone-800">
                                {entry.full_name}
                                {entry.status === 'waitlist' && (
                                  <span className="ml-1 text-xs text-amber-600">(chờ)</span>
                                )}
                              </p>
                              <a href={`tel:${entry.phone}`} className="text-xs text-primary-700 hover:underline">
                                {entry.phone}
                              </a>
                            </div>
                            <button
                              type="button"
                              title="Hủy chỗ"
                              onClick={() => handleCancelEntry(entry)}
                              className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={UserPlus}
                      className="mt-3 w-full"
                      onClick={() => {
                        setEntryForm({ phone: '', full_name: '' })
                        setAddEntrySlot(slot)
                      }}
                    >
                      Đăng ký hộ
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          data={registrationRows}
          loading={regsLoading}
          searchPlaceholder="Tìm theo tên, số điện thoại, ca..."
          pageSize={20}
          emptyMessage="Chưa có ai đăng ký"
          emptyIcon={Users}
        />
      )}

      <BookingSlotForm
        isOpen={slotFormOpen}
        slot={editingSlot}
        prefill={slotPrefill}
        cells={selectedCells}
        saving={savingSlot}
        onClose={() => {
          setSlotFormOpen(false)
          setEditingSlot(null)
          setSlotPrefill(null)
        }}
        onSubmit={handleSlotSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteSlotTarget)}
        loading={deletingSlot}
        title="Xóa ca học"
        message={
          deleteSlotTarget
            ? `Xóa ca ${DAY_SHORT[deleteSlotTarget.day_of_week]} ${deleteSlotTarget.start_time}–${deleteSlotTarget.end_time}? Ca này áp dụng cho MỌI tuần của bảng. Nếu đã có người đăng ký thì nên tắt hiển thị thay vì xóa.`
            : ''
        }
        onClose={() => setDeleteSlotTarget(null)}
        onConfirm={handleDeleteSlot}
      />

      <Modal
        isOpen={Boolean(addEntrySlot)}
        onClose={() => setAddEntrySlot(null)}
        title="Đăng ký hộ học viên"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddEntrySlot(null)} disabled={addingEntry}>
              Hủy
            </Button>
            <Button onClick={handleAddEntry} loading={addingEntry}>
              Giữ chỗ
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddEntry} className="space-y-4">
          {addEntrySlot && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {DAY_SHORT[addEntrySlot.day_of_week]} {formatDate(addEntrySlot.date)} ·{' '}
              {addEntrySlot.start_time}–{addEntrySlot.end_time}
              {addEntrySlot.label ? ` · ${addEntrySlot.label}` : ''} — còn {addEntrySlot.seats_left} chỗ
            </p>
          )}
          <Input
            label="Số điện thoại"
            type="tel"
            inputMode="numeric"
            placeholder="0912345678"
            value={entryForm.phone}
            onChange={(e) => setEntryForm((f) => ({ ...f, phone: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Họ và tên"
            placeholder="Bỏ trống nếu số này đã đăng ký trước đó"
            value={entryForm.full_name}
            onChange={(e) => setEntryForm((f) => ({ ...f, full_name: e.target.value }))}
            helperText="Số đã có trong hệ thống thì không cần nhập lại tên"
          />
        </form>
      </Modal>
    </div>
  )
}
