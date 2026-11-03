import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, LayoutGrid, List, Lock, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Button from '../components/common/Button'
import Select from '../components/common/Select'
import PhoneGate from '../components/booking/PhoneGate'
import WeekPicker from '../components/booking/WeekPicker'
import WeekSlotGrid from '../components/booking/WeekSlotGrid'
import HourGrid from '../components/booking/HourGrid'
import SelectionBar from '../components/booking/SelectionBar'
import RequestDialog from '../components/booking/RequestDialog'
import MyBookingsBar from '../components/booking/MyBookingsBar'
import bookingService, { bookingSession } from '../services/booking.service'
import { DAY_SHORT, STEP_OPTIONS, formatDate, formatDateTime, mergeCells } from '../lib/bookingUtils'

const REFRESH_MS = 25000

export default function BookingBoardPage() {
  const { slug } = useParams()

  const [registrant, setRegistrant] = useState(() => bookingSession.getRegistrant())
  const [board, setBoard] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [week, setWeek] = useState(null) // null = để backend tự chọn tuần phù hợp
  const [slots, setSlots] = useState([])
  const [myEntries, setMyEntries] = useState([])
  const [myAllEntries, setMyAllEntries] = useState([])
  const [busyEntryId, setBusyEntryId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notFound, setNotFound] = useState('')
  const [busySlotId, setBusySlotId] = useState(null)
  const [flash, setFlash] = useState(null) // { type, text }
  // 'hours' = thời khóa biểu 7h-23h, 'days' = danh sách theo ngày (dễ đọc trên điện thoại)
  const [view, setView] = useState('hours')
  const [step, setStep] = useState(15)
  const [selectedIds, setSelectedIds] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [selectedCells, setSelectedCells] = useState([])
  const [booking, setBooking] = useState(false)
  const [requestDialog, setRequestDialog] = useState(false)

  // Lưới trả về từng ô 15 phút; ô liền nhau trong cùng ngày là MỘT buổi học, nên
  // mọi thứ người dùng nhìn thấy và mọi thứ gửi lên server đều dùng bản đã gộp.
  const mergedCells = useMemo(() => mergeCells(selectedCells), [selectedCells])

  const flashTimer = useRef(null)
  const showFlash = useCallback((type, text) => {
    setFlash({ type, text })
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 5000)
  }, [])

  const load = useCallback(
    async ({ silent = false, weekOverride } = {}) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const target = weekOverride !== undefined ? weekOverride : week
        const res = await bookingService.getBoard(slug, target)
        const data = res.data?.data ?? res.data
        setBoard(data.board)
        setWeeks(data.weeks || [])
        // Lần đầu vào, backend quyết định tuần nào mở sẵn (tuần hiện tại nếu có)
        setWeek(data.board.selected_week)
        setSlots(data.slots || [])
        setMyEntries(data.my_entries || [])
        setMyAllEntries(data.my_all_entries || [])
        setMyRequests(data.my_requests || [])
        setNotFound('')
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(err.response?.data?.message || 'Không tìm thấy bảng đăng ký')
        } else if (!silent) {
          showFlash('error', err.response?.data?.message || 'Không tải được bảng, thử lại giúp nhé')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [slug, week, showFlash]
  )

  // Chỉ chạy khi đổi bảng — đổi tuần đi qua handleSelectWeek để không nạp hai lần
  useEffect(() => {
    load({ weekOverride: undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Bảng dùng chung nên số chỗ đổi liên tục — tự làm mới cho đỡ bấm nhầm ca đã đầy
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const handleStepChange = (e) => {
    // Khóa ô trống gắn với mốc phút, đổi bước thì ô cũ trỏ vào khung giờ khác
    setSelectedCells([])
    setStep(Number(e.target.value))
  }

  const handleSelectWeek = (nextWeek) => {
    if (nextWeek === week) return
    // Ca đã chọn thuộc tuần cũ — giữ lại thì bấm xác nhận sẽ đặt nhầm tuần
    setSelectedIds([])
    setSelectedCells([])
    setWeek(nextWeek)
    load({ silent: true, weekOverride: nextWeek })
  }

  const handleReady = (newRegistrant) => {
    setRegistrant(newRegistrant)
    load({ silent: true })
  }

  const handleSignOut = () => {
    bookingSession.clear()
    setRegistrant(null)
    load({ silent: true })
  }

  const handleRegister = async (slot) => {
    setBusySlotId(slot.id)
    try {
      const res = await bookingService.registerSlot(slot.id, slot.date)
      showFlash('success', res.data?.message || 'Đã giữ chỗ')
      await load({ silent: true })
    } catch (err) {
      if (err.response?.status === 401) {
        bookingSession.clear()
        setRegistrant(null)
      }
      showFlash('error', err.response?.data?.message || 'Không giữ được chỗ')
      await load({ silent: true })
    } finally {
      setBusySlotId(null)
    }
  }

  const cancelByEntryId = async (entryId) => {
    try {
      await bookingService.cancelMyEntry(entryId)
      showFlash('success', 'Đã hủy chỗ')
    } catch (err) {
      if (err.response?.status === 401) {
        bookingSession.clear()
        setRegistrant(null)
      }
      showFlash('error', err.response?.data?.message || 'Không hủy được')
    }
    await load({ silent: true })
  }

  const handleCancel = async (slot) => {
    if (!slot.my_entry) return
    setBusySlotId(slot.id)
    try {
      await cancelByEntryId(slot.my_entry.id)
    } finally {
      setBusySlotId(null)
    }
  }

  // Trên lưới giờ, bấm ca của mình = hủy luôn (không ai hủy hàng loạt).
  // Ca chưa giữ thì chỉ CHỌN, đặt lịch khi bấm nút xác nhận.
  const handleSlotClick = (slot) => {
    if (slot.my_entry) return handleCancel(slot)
    return undefined
  }

  // Lưới trả về hai loại: ca có sẵn (key = uuid) và ô trống (key = "cell|dow|hour").
  // Giữ riêng hai danh sách vì hai thứ gọi API khác nhau: một bên giữ chỗ, một
  // bên gửi nguyện vọng.
  const handleToggleSelect = (item) => {
    if (item.type === 'cell') {
      setSelectedCells((prev) =>
        prev.some((c) => c.key === item.key)
          ? prev.filter((c) => c.key !== item.key)
          : [
              ...prev,
              {
                key: item.key,
                day_of_week: item.day_of_week,
                date: item.date,
                start_time: item.start_time,
                end_time: item.end_time,
              },
            ]
      )
      return
    }
    setSelectedIds((prev) =>
      prev.includes(item.key) ? prev.filter((k) => k !== item.key) : [...prev, item.key]
    )
  }

  const handleCancelRequest = async (req) => {
    try {
      await bookingService.cancelMyRequest(req.id)
      showFlash('success', 'Đã rút nguyện vọng')
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không rút được')
    }
    await load({ silent: true })
  }

  /**
   * Đặt lần lượt từng ca chứ không song song: sĩ số do hàm SQL khóa hàng kiểm
   * tra, bắn song song thì thứ tự thành công khó đoán và báo lỗi khó hiểu.
   * Chấp nhận thành công một phần — đặt được ca nào hay ca đó.
   */
  const handleConfirmBooking = async () => {
    if (selectedIds.length === 0) return
    setBooking(true)
    const ok = []
    const failed = []

    for (const id of selectedIds) {
      const slot = slots.find((x) => x.id === id)
      if (!slot) continue
      try {
        const res = await bookingService.registerSlot(slot.id, slot.date)
        const status = (res.data?.data ?? res.data)?.status
        ok.push(`${slot.start_time}${status === 'waitlist' ? ' (chờ)' : ''}`)
      } catch (err) {
        if (err.response?.status === 401) {
          bookingSession.clear()
          setRegistrant(null)
          break
        }
        failed.push(`${slot.start_time}: ${err.response?.data?.message || 'lỗi'}`)
      }
    }

    setSelectedIds([])
    setBooking(false)
    await load({ silent: true })

    if (failed.length === 0) {
      showFlash('success', ok.length > 0 ? `Đã giữ ${ok.length} ca` : 'Xong')
    } else if (ok.length === 0) {
      showFlash('error', failed.join(' · '))
    } else {
      showFlash('error', `Giữ được ${ok.length} ca. Không được: ${failed.join(' · ')}`)
    }
  }

  /**
   * Bấm nút xác nhận: ca có sẵn thì giữ chỗ luôn, còn ô trống thì MỞ HỘP CHỌN
   * LỊCH để hỏi giờ + số buổi trước khi gửi.
   */
  const handleConfirm = async () => {
    if (selectedIds.length > 0) await handleConfirmBooking()
    if (selectedCells.length > 0) setRequestDialog(true)
  }

  const submitRequests = async ({ session_count: sessionCount, note, start_time: st, end_time: en }) => {
    setBooking(true)
    try {
      const res = await bookingService.createRequests(
        slug,
        mergedCells.map((c) => ({
          session_date: c.date,
          // Chọn đúng một khung thì dùng giờ người dùng vừa sửa trong hộp thoại
          start_time: st && mergedCells.length === 1 ? st : c.start_time,
          end_time: en && mergedCells.length === 1 ? en : c.end_time,
          session_count: sessionCount,
          note,
        }))
      )
      showFlash('success', res.data?.message || 'Đã gửi nguyện vọng')
      setSelectedCells([])
      setRequestDialog(false)
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không gửi được nguyện vọng')
    } finally {
      setBooking(false)
      await load({ silent: true })
    }
  }

  // Hủy từ thanh dưới: ca có thể thuộc tuần khác, không có mặt trên lưới
  const handleCancelEntry = async (entry) => {
    setBusyEntryId(entry.id)
    try {
      await cancelByEntryId(entry.id)
    } finally {
      setBusyEntryId(null)
    }
  }

  if (loading && !board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <TriangleAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="font-display text-lg font-semibold text-stone-900">{notFound}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Kiểm tra lại đường link trung tâm đã gửi, hoặc liên hệ trung tâm để được hỗ trợ.
          </p>
        </div>
      </div>
    )
  }

  if (!registrant || !bookingSession.getToken()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <PhoneGate boardTitle={board?.title} onReady={handleReady} />
      </div>
    )
  }

  const multiWeek = (board?.week_count || 1) > 1
  const limitReached =
    board?.max_slots_per_person > 0 && myEntries.length >= board.max_slots_per_person

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-stone-900 sm:text-xl">
                {board?.title}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {multiWeek
                  ? `${board.week_count} tuần: ${formatDate(board.week_start)} – ${formatDate(board.week_end)}`
                  : `Tuần ${formatDate(board?.week_start)} – ${formatDate(board?.week_end)}`}
              </p>
              {board?.description && (
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{board.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-stone-800">{registrant.full_name}</p>
                <p className="text-xs text-slate-400">{registrant.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} icon={LogOut} title="Đổi số điện thoại">
                <span className="hidden sm:inline">Đổi số</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {!board?.is_accepting && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Bảng đang đóng, không nhận đăng ký mới</p>
              {board?.closes_at && <p className="text-xs">Đã đóng lúc {formatDateTime(board.closes_at)}</p>}
              {board?.opens_at && <p className="text-xs">Mở đăng ký từ {formatDateTime(board.opens_at)}</p>}
            </div>
          </div>
        )}

        {board?.is_accepting && limitReached && (
          <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800">
            Bạn đã giữ đủ {board.max_slots_per_person} ca cho tuần này. Muốn đổi ca khác thì hủy một ca
            trước{multiWeek ? ', hoặc chuyển sang tuần khác' : ''} nhé.
          </div>
        )}

        {flash && (
          <div
            className={
              flash.type === 'error'
                ? 'mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
                : 'mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
            }
          >
            {flash.text}
          </div>
        )}

        <WeekPicker weeks={weeks} selected={week} onSelect={handleSelectWeek} disabled={refreshing} />

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {multiWeek && board?.selected_week
              ? `Đang xem tuần ${formatDate(board.selected_week)} – ${formatDate(board.selected_week_end)}`
              : `Số chỗ cập nhật mỗi ${REFRESH_MS / 1000} giây`}
            {view === 'hours' &&
              ' · bấm ô có lớp để giữ chỗ · ô trống thì kéo dọc (hoặc chạm nhiều ô liền nhau) để chọn cả khung giờ muốn học'}
          </p>
          <div className="flex items-center gap-1">
            {view === 'hours' && (
              <Select
                value={String(step)}
                onChange={handleStepChange}
                options={STEP_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                className="w-28 py-1.5 text-xs"
              />
            )}
            {/* Lưới 17 giờ x 7 ngày phải cuộn ngang trên điện thoại; dạng danh sách
                theo ngày dễ đọc hơn nhiều nên để người dùng tự chọn */}
            <Button
              variant={view === 'hours' ? 'outline' : 'ghost'}
              size="sm"
              icon={LayoutGrid}
              onClick={() => setView('hours')}
              title="Xem thời khóa biểu theo giờ"
            >
              <span className="hidden sm:inline">Theo giờ</span>
            </Button>
            <Button
              variant={view === 'days' ? 'outline' : 'ghost'}
              size="sm"
              icon={List}
              onClick={() => setView('days')}
              title="Xem danh sách theo ngày"
            >
              <span className="hidden sm:inline">Theo ngày</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => load({ silent: true })} loading={refreshing} icon={RefreshCw}>
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-sm text-slate-500">Tuần này chưa có ca nào được mở.</p>
          </div>
        ) : view === 'hours' ? (
          <>
            <HourGrid
              mode="public"
              board={board}
              slots={slots}
              weekStart={week}
              busySlotId={busySlotId}
              stepMinutes={step}
              selected={[...selectedIds, ...selectedCells.map((c) => c.key)]}
              myRequests={myRequests}
              onToggleSelect={handleToggleSelect}
              onSlotClick={handleSlotClick}
              onRequestClick={handleCancelRequest}
            />
            <RequestDialog
              isOpen={requestDialog}
              cells={mergedCells}
              saving={booking}
              onClose={() => setRequestDialog(false)}
              onSubmit={submitRequests}
            />
            <SelectionBar
              count={selectedIds.length + mergedCells.length}
              items={[
                ...selectedIds
                  .map((id) => slots.find((x) => x.id === id))
                  .filter(Boolean)
                  .map((x) => `${DAY_SHORT[x.day_of_week]} ${x.start_time}`),
                ...mergedCells.map(
                  (c) => `${DAY_SHORT[c.day_of_week]} ${c.start_time}–${c.end_time} (xin mở)`
                ),
              ]}
              actionLabel={
                mergedCells.length === 0
                  ? `Đặt lịch ${selectedIds.length} ca`
                  : selectedIds.length === 0
                    ? `Chọn số buổi cho ${mergedCells.length} buổi`
                    : `Đặt ${selectedIds.length} ca + chọn số buổi`
              }
              loading={booking}
              onConfirm={handleConfirm}
              onClear={() => {
                setSelectedIds([])
                setSelectedCells([])
              }}
              hint={
                mergedCells.length > 0
                  ? 'Giờ chưa có lớp chỉ là nguyện vọng — trung tâm xem rồi mới mở lớp, chưa giữ chỗ cho bạn.'
                  : board?.max_slots_per_person > 0 &&
                      myEntries.length + selectedIds.length > board.max_slots_per_person
                    ? `Bảng giới hạn ${board.max_slots_per_person} ca/tuần, bạn đã giữ ${myEntries.length} — phần vượt sẽ bị từ chối.`
                    : null
              }
            />
          </>
        ) : (
          <WeekSlotGrid
            board={board}
            slots={slots}
            busySlotId={busySlotId}
            onRegister={handleRegister}
            onCancel={handleCancel}
          />
        )}
      </main>

      <MyBookingsBar
        entries={myAllEntries}
        currentWeek={week}
        multiWeek={multiWeek}
        busyEntryId={busyEntryId}
        onCancel={handleCancelEntry}
        onGoToWeek={handleSelectWeek}
      />
    </div>
  )
}
