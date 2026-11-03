import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import clsx from 'clsx'
import { BadgeCheck, Bold, CalendarDays, Eraser, HelpCircle, History, LayoutGrid, List, Lock, LogOut, Move, RefreshCw, RotateCcw, Star, TriangleAlert, Users } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import Select from '../components/common/Select'
import PhoneGate from '../components/booking/PhoneGate'
import WeekPicker from '../components/booking/WeekPicker'
import BookingListView from '../components/booking/BookingListView'
import HourGrid from '../components/booking/HourGrid'
import SelectionBar from '../components/booking/SelectionBar'
import MyBookingsBar from '../components/booking/MyBookingsBar'
import RequestToolPanel from '../components/booking/RequestToolPanel'
import BookingHelpSheet from '../components/booking/BookingHelpSheet'
import ActivityLogSheet from '../components/booking/ActivityLogSheet'
import ChatDock from '../components/booking/ChatDock'
import SchedulingTray from '../components/booking/SchedulingTray'
import StudentMoneySheet from '../components/booking/StudentMoneySheet'
import DropConflictDialog from '../components/booking/DropConflictDialog'
import { useContextMenu } from '../hooks/useContextMenu'
import { useBookingSocket } from '../hooks/useBookingSocket'
import bookingService, { bookingSession } from '../services/booking.service'
import { DAY_SHORT, STEP_OPTIONS, formatDate, formatDateTime, mergeCells } from '../lib/bookingUtils'

// Socket đã đẩy thay đổi tới ngay; vòng này chỉ còn là lưới an toàn khi
// websocket rớt hoặc bị proxy chặn, nên giãn từ 25 giây lên 2 phút.
const REFRESH_MS = 120000

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
  const [savingRequest, setSavingRequest] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  // Cờ do server trả (047). Chỉ bật nút; quyền thật server kiểm lại từng lần gọi.
  const [isManager, setIsManager] = useState(false)
  const [students, setStudents] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  // Chế độ sắp xếp của người quản lý: tắt mặc định, bật mới kéo được khối
  const [arranging, setArranging] = useState(false)
  const [pool, setPool] = useState([])
  const [conflict, setConflict] = useState(null)
  const [exitPrompt, setExitPrompt] = useState(false)
  // Việc vừa làm + cách làm ngược lại. Giữ MỘT bước thôi: xếp lịch là chuỗi
  // thao tác nhanh, nhớ cả chồng rồi hoàn tác nhầm bước thứ tư còn rối hơn.
  const [lastAction, setLastAction] = useState(null)
  // Con dấu đang cầm trên tay: bấm vào buổi nào là đóng dấu vào buổi đó
  const [stampTool, setStampTool] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [moneyOpen, setMoneyOpen] = useState(false)
  // Buổi đang chờ nhập tiền trước khi đóng dấu hoàn thành
  const [donePrompt, setDonePrompt] = useState(null) // { request, amount }

  // Socket chung: lưới nghe 'booking:board_changed', hộp chat nghe 'booking:message'
  const { socket } = useBookingSocket({
    bookingToken: bookingSession.getToken(),
    boardId: board?.id,
    isManager,
  })
  const menu = useContextMenu()

  // Lưới trả về từng ô 15 phút; ô liền nhau trong cùng ngày là MỘT buổi học, nên
  // mọi thứ người dùng nhìn thấy và mọi thứ gửi lên server đều dùng bản đã gộp.
  const mergedCells = useMemo(() => mergeCells(selectedCells), [selectedCells])

  const loadActivity = useCallback(
    () => bookingService.listBoardActivity(slug).then((res) => res.data?.data ?? res.data ?? []),
    [slug]
  )

  // Hộp học viên tự gọi lúc mở chứ không giữ sẵn trong trang: tổng tiền đổi
  // mỗi lần đóng dấu, giữ bản cũ trong state thì mở ra là thấy số lỗi thời
  const loadStudentMoney = useCallback(
    () => bookingService.listBoardStudents(slug).then((res) => res.data?.data ?? res.data ?? []),
    [slug]
  )

  const setStudentPrice = async (registrantId, price) => {
    setSavingRequest(true)
    try {
      const res = await bookingService.managerSetRegistrantPrice(registrantId, price)
      showFlash('success', res.data?.message || 'Đã đặt học phí')
      await load({ silent: true })
      return true
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không đặt được học phí')
      return false
    } finally {
      setSavingRequest(false)
    }
  }

  // Gom API chat lại một chỗ để ChatDock không phải biết slug
  const chatApi = useMemo(
    () => ({
      listMessages: (registrantId) =>
        bookingService
          .listBoardMessages(slug, registrantId)
          .then((res) => res.data?.data ?? res.data ?? { messages: [] }),
      listThreads: () =>
        bookingService.listBoardThreads(slug).then((res) => res.data?.data ?? res.data ?? []),
      send: (body, registrantId, replyTo, image) =>
        bookingService.sendBoardMessage(slug, body, registrantId, replyTo, image),
      react: (messageId, emoji) => bookingService.reactToBoardMessage(messageId, emoji),
    }),
    [slug]
  )

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
        setIsManager(Boolean(data.is_manager))
        setUnreadMessages(data.unread_messages || 0)
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


  const reloadPool = useCallback(() => {
    if (!isManager) return Promise.resolve()
    return bookingService
      .managerListPool(slug)
      .then((res) => setPool(res.data?.data ?? res.data ?? []))
      .catch(() => setPool([]))
  }, [isManager, slug])

  // Nạp khu chờ ngay khi vào, không đợi bật chế độ sắp xếp: con số trên nút
  // chính là thứ nhắc còn việc dở, mà nút thì luôn hiện
  useEffect(() => {
    if (isManager) reloadPool()
  }, [isManager, reloadPool])

  // Ai đó đổi gì trên bảng -> tải lại ngay, không chờ vòng làm mới.
  // Phải đặt SAU reloadPool: hook đọc biến trước lúc nó được khai báo thì cả
  // trang văng vào error boundary ngay lần render đầu.
  useEffect(() => {
    if (!socket) return undefined
    const onChanged = () => {
      load({ silent: true })
      if (isManager) reloadPool()
    }
    socket.on('booking:board_changed', onChanged)
    return () => socket.off('booking:board_changed', onChanged)
  }, [socket, load, isManager, reloadPool])

  useEffect(() => {
    if (!isManager) {
      setStudents([])
      return
    }
    bookingService
      .listBoardStudents(slug)
      .then((res) => setStudents(res.data?.data ?? res.data ?? []))
      .catch(() => setStudents([]))
  }, [isManager, slug])

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
      // Rút là xóa khỏi lưới, nhưng đăng ký lại đúng giờ cũ thì coi như chưa rút
      setLastAction({
        label: 'rút đăng ký',
        run: () =>
          bookingService.createRequests(slug, [
            {
              session_date: req.date,
              start_time: req.start_time,
              end_time: req.end_time,
              note: req.note || null,
            },
          ]),
      })
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

  /** Bấm nút xác nhận: ca có sẵn thì giữ chỗ, ô trống thì gửi nguyện vọng luôn */
  const handleConfirm = async () => {
    if (selectedIds.length > 0) await handleConfirmBooking()
    if (mergedCells.length > 0) await submitRequests()
  }

  /**
   * Gửi thẳng các buổi vừa kéo chọn, không hỏi thêm gì.
   *
   * Trước đây mở một hộp thoại hỏi số buổi của khóa, nhưng kéo xong còn phải
   * qua một bước nữa thì rườm rà: mỗi dải kéo là MỘT buổi, server tự hiểu
   * `session_count = 1`. Muốn học thêm buổi nào thì kéo thêm ô đó.
   */
  const submitRequests = async () => {
    setBooking(true)
    try {
      const res = await bookingService.createRequests(
        slug,
        mergedCells.map((c) => ({
          session_date: c.date,
          start_time: c.start_time,
          end_time: c.end_time,
        }))
      )
      showFlash('success', res.data?.message || 'Đã gửi nguyện vọng')
      setSelectedCells([])
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không gửi được nguyện vọng')
    } finally {
      setBooking(false)
      await load({ silent: true })
    }
  }

  // Lưu giờ / ghi chú từ bảng công cụ chuột phải. Chỉ gửi phần thay đổi nên
  // sửa mỗi ghi chú thì giờ không bị ghi đè theo.
  const saveRequest = async (request, patch) => {
    // Chụp lại giờ cũ TRƯỚC khi gọi API để còn đường quay lại
    const before = {
      session_date: request.date,
      start_time: request.start_time,
      end_time: request.end_time,
    }
    setSavingRequest(true)
    try {
      await bookingService.updateMyRequest(request.id, patch)
      showFlash('success', 'Đã lưu thay đổi')
      if (patch.session_date || patch.start_time) {
        setLastAction({
          label: 'dời buổi học',
          run: () => bookingService.updateMyRequest(request.id, before),
        })
      }
      menu.close()
      await load({ silent: true })
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không lưu được')
    } finally {
      setSavingRequest(false)
    }
  }

  const toMin = (t) => {
    const [h, m] = String(t).split(':')
    return Number(h) * 60 + Number(m)
  }
  const pad2 = (n) => String(n).padStart(2, '0')
  const fmtMin = (t) => `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`

  /** Những gì đang chắn khoảng [from,to) của một ngày, trừ chính buổi đang kéo */
  const blockersIn = (date, from, to, exceptId) => {
    const dow = new Date(`${date}T00:00:00`).getDay()
    const fromRequests = myRequests
      .filter((r) => r.date === date && r.id !== exceptId)
      .filter((r) => toMin(r.start_time) < to && toMin(r.end_time) > from)
      .map((r) => ({
        kind: 'request',
        id: r.id,
        label: r.full_name || 'Buổi học',
        color: r.color || null,
        note: r.note || null,
        start: toMin(r.start_time),
        end: toMin(r.end_time),
      }))
    const fromSlots = slots
      .filter((x) => x.day_of_week === dow && x.date === date)
      .filter((x) => toMin(x.start_time) < to && toMin(x.end_time) > from)
      .map((x) => ({
        kind: 'slot',
        id: x.id,
        label: x.label || 'Ca đã mở',
        color: x.color || null,
        start: toMin(x.start_time),
        end: toMin(x.end_time),
      }))
    return [...fromRequests, ...fromSlots].sort((a, b) => a.start - b.start)
  }

  /**
   * Kéo khối sang ô khác: giữ nguyên thời lượng, chỉ dời điểm bắt đầu.
   * Chỗ mới không đủ trống thì KHÔNG tự cắt — mở hộp hỏi, vì cắt ngắn buổi của
   * học viên sau lưng họ là chuyện không sửa lại được bằng Ctrl+Z.
   */
  const moveRequest = (requestId, { date, minute }) => {
    const req = myRequests.find((r) => r.id === requestId)
    if (!req) return
    const duration = toMin(req.end_time) - toMin(req.start_time)
    const end = Math.min(24 * 60 - 1, minute + duration)
    if (date === req.date && minute === toMin(req.start_time)) return

    const blockers = blockersIn(date, minute, end, requestId)
    if (blockers.length === 0) {
      saveRequest(req, { session_date: date, start_time: fmtMin(minute), end_time: fmtMin(end) })
      return
    }
    setConflict({
      request: req,
      date,
      start: minute,
      end,
      blockers,
      // Trống tới đâu = tới lúc cái chắn đầu tiên bắt đầu
      freeUntil: blockers[0].start,
    })
  }

  /**
   * Áp dụng những gì người dùng vừa chỉnh trong hộp trùng giờ.
   *
   * Dời các thẻ CHẮN trước, đặt thẻ đang kéo sau: server chặn hai buổi cùng
   * người chồng giờ, làm ngược lại là chính bước đầu tiên đã bị từ chối.
   */
  const applyResolution = async ({ target, moves }) => {
    const c = conflict
    if (!c) return
    setConflict(null)
    setSavingRequest(true)
    try {
      for (const m of moves) {
        await bookingService.updateMyRequest(m.id, {
          session_date: c.date,
          start_time: m.start_time,
          end_time: m.end_time,
        })
      }
      if (c.kind === 'pool') {
        await bookingService.managerScheduleFromPool(c.poolItemId, {
          session_date: c.date,
          ...target,
        })
      } else {
        await bookingService.updateMyRequest(c.request.id, { session_date: c.date, ...target })
      }
      showFlash('success', moves.length ? `Đã dời ${moves.length} buổi và đặt lại giờ` : 'Đã đặt lại giờ')
      menu.close()
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không áp dụng được')
    } finally {
      setSavingRequest(false)
      await Promise.all([load({ silent: true }), reloadPool()])
    }
  }

  const detachRequest = async (requestId) => {
    setSavingRequest(true)
    try {
      const res = await bookingService.managerDetachRequest(requestId)
      const gone = myRequests.find((r) => r.id === requestId)
      const poolItemId = (res.data?.data ?? res.data)?.pool_item_id
      showFlash('success', res.data?.message || 'Đã gỡ vào khu chờ')
      if (poolItemId && gone) {
        setLastAction({
          label: 'gỡ vào khu chờ',
          run: () =>
            bookingService.managerScheduleFromPool(poolItemId, {
              session_date: gone.date,
              start_time: gone.start_time,
              end_time: gone.end_time,
            }),
        })
      }
      menu.close()
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không gỡ được')
    } finally {
      setSavingRequest(false)
      await Promise.all([load({ silent: true }), reloadPool()])
    }
  }

  const doScheduleFromPool = async (itemId, date, minute, endMinute) => {
    setSavingRequest(true)
    try {
      const res = await bookingService.managerScheduleFromPool(itemId, {
        session_date: date,
        start_time: fmtMin(minute),
        end_time: fmtMin(endMinute),
      })
      const newId = (res.data?.data ?? res.data)?.id
      showFlash('success', res.data?.message || 'Đã xếp vào lưới')
      if (newId) {
        setLastAction({
          label: 'xếp từ khu chờ',
          run: () => bookingService.managerDetachRequest(newId),
        })
      }
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không xếp được')
    } finally {
      setSavingRequest(false)
      await Promise.all([load({ silent: true }), reloadPool()])
    }
  }

  /**
   * Thả một người từ khu chờ xuống lưới. Đi qua ĐÚNG lớp kiểm tra như kéo khối:
   * trước đây đường này không kiểm gì cả nên thả chồng lên buổi khác vẫn lọt,
   * tạo ra hai buổi cùng giờ của cùng một người.
   */
  const scheduleFromPool = (itemId, { date, minute }) => {
    const item = pool.find((p) => p.id === itemId)
    const duration = item?.duration_minutes || 60
    const end = Math.min(24 * 60 - 1, minute + duration)
    const blockers = blockersIn(date, minute, end, null)

    if (blockers.length === 0) {
      doScheduleFromPool(itemId, date, minute, end)
      return
    }
    setConflict({
      kind: 'pool',
      poolItemId: itemId,
      request: { full_name: item?.full_name || 'Học viên' },
      date,
      start: minute,
      end,
      blockers,
      freeUntil: blockers[0].start,
    })
  }

  /**
   * Bật/tắt dấu đánh dấu hoặc dấu hoàn thành. Gọi API ngay, không chờ bấm Lưu:
   * đây là thao tác tích một cái trong lúc lướt qua hàng chục buổi.
   */
  const toggleFlag = async (request, patch) => {
    setSavingRequest(true)
    try {
      await bookingService.updateMyRequest(request.id, patch)
      // Quay lại đúng những trường vừa đụng, không đụng trường khác
      const before = {}
      if (patch.is_marked !== undefined) before.is_marked = Boolean(request.is_marked)
      if (patch.is_bold !== undefined) before.is_bold = Boolean(request.is_bold)
      if (patch.done !== undefined) before.done = Boolean(request.done_at)
      const ten = patch.is_bold !== undefined ? 'tô đậm' : patch.is_marked !== undefined ? 'đánh dấu' : 'đóng dấu'
      setLastAction({
        label: Object.keys(before).length > 1 ? 'gỡ dấu' : ten,
        run: () => bookingService.updateMyRequest(request.id, before),
      })
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không đổi được')
    } finally {
      setSavingRequest(false)
      await load({ silent: true })
    }
  }

  /**
   * Đóng dấu bằng công cụ đang cầm. Mỗi con dấu BẬT/TẮT theo trạng thái hiện
   * có của buổi đó, nên quét qua một loạt rồi quét lại là gỡ ra — không cần
   * đổi sang công cụ khác để xóa.
   */
  /**
   * Đóng dấu hoàn thành là lúc CHỐT TIỀN, nên hỏi số tiền thật trước.
   *
   * Ô tiền để trống thì lấy giá mặc định của học viên — phần lớn buổi đúng
   * giá, gõ lại mỗi lần chỉ tổ gõ sai. Gỡ dấu thì không hỏi gì: tiền đã chốt
   * vẫn nằm trên buổi đó, đóng dấu lại là có ngay.
   */
  const askDone = (request) => setDonePrompt({ request, amount: '' })

  const applyStamp = (request, tool) => {
    if (tool === 'done' && !request.done_at) return askDone(request)
    const patch =
      tool === 'bold'
        ? { is_bold: !request.is_bold }
        : tool === 'mark'
          ? { is_marked: !request.is_marked }
          : tool === 'done'
            ? { done: false }
            : { is_bold: false, is_marked: false, done: false }
    return toggleFlag(request, patch)
  }

  const confirmDone = async () => {
    const { request, amount } = donePrompt
    setDonePrompt(null)
    await toggleFlag(request, { done: true, amount: amount.trim() })
  }

  const undoLast = async () => {
    if (!lastAction) return
    setSavingRequest(true)
    try {
      await lastAction.run()
      showFlash('success', `Đã hoàn tác: ${lastAction.label}`)
      setLastAction(null)
    } catch (err) {
      showFlash('error', err.response?.data?.message || 'Không hoàn tác được')
    } finally {
      setSavingRequest(false)
      await Promise.all([load({ silent: true }), reloadPool()])
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

  // Cột dọc cao đúng một màn hình: đầu trang và thanh "chỗ của tôi" co theo nội
  // dung, lưới nuốt hết chỗ còn lại nên không hở mảng trắng nào. Thanh dưới nằm
  // TRONG cột thay vì neo cứng — neo cứng thì phải đoán chiều cao nó để chừa
  // padding, mà chiều cao đó đổi theo số ca đang giữ.
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="w-full px-3 py-3 sm:px-5">
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
              {/* Mô tả bảng không in ra đây nữa: nội dung của nó là chỉ dẫn thao
                  tác, mà thao tác đã nằm trong nút "Hướng dẫn". Dữ liệu vẫn còn
                  trong bảng, trang quản trị vẫn hiện. */}
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

      <main className="flex w-full min-h-0 flex-1 flex-col px-3 py-3 sm:px-5">
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
            Đã đủ {board.max_slots_per_person} ca tuần này. Hủy một ca để đổi{multiWeek ? ', hoặc xem tuần khác' : ''}.
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
          {/* Chỉ dẫn thao tác chuyển hết vào nút "?" — để ngoài này thì mỗi lần
              vào trang phải đọc lại một đoạn mà thật ra chỉ cần đọc một lần */}
          <p className="text-xs text-slate-400">
            {multiWeek && board?.selected_week
              ? `Tuần ${formatDate(board.selected_week)} – ${formatDate(board.selected_week_end)}`
              : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={HelpCircle}
              onClick={() => setHelpOpen(true)}
              title="Hướng dẫn đăng ký"
            >
              <span className="hidden sm:inline">Hướng dẫn</span>
            </Button>
            {isManager && (
              <>
                <Button
                  size="sm"
                  variant={arranging ? 'primary' : 'outline'}
                  icon={Move}
                  // Thoát khi khu chờ còn người thì hỏi lại: tắt chế độ là khay
                  // biến mất khỏi màn, dễ tưởng đã xếp xong hết
                  onClick={() =>
                    arranging && pool.length > 0 ? setExitPrompt(true) : setArranging((v) => !v)
                  }
                  title={
                    pool.length > 0
                      ? `Còn ${pool.length} buổi chờ xếp`
                      : 'Bật để kéo khối sang giờ khác và gỡ vào khu chờ'
                  }
                >
                  <span className="hidden sm:inline">{arranging ? 'Đang sắp xếp' : 'Sắp xếp'}</span>
                  {pool.length > 0 && (
                    <span
                      className={clsx(
                        'ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold',
                        arranging ? 'bg-white text-primary-700' : 'bg-amber-500 text-white'
                      )}
                    >
                      {pool.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  disabled={!lastAction || savingRequest}
                  onClick={undoLast}
                  title={lastAction ? `Hoàn tác: ${lastAction.label}` : 'Chưa có gì để hoàn tác'}
                >
                  <span className="hidden sm:inline">Hoàn tác</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Users}
                  onClick={() => setMoneyOpen(true)}
                  title="Học viên, học phí một buổi và tiền đã thu"
                >
                  <span className="hidden sm:inline">Học viên</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={History}
                  onClick={() => setLogOpen(true)}
                  title="Nhật ký ai làm gì"
                >
                  <span className="hidden sm:inline">Nhật ký</span>
                </Button>
              </>
            )}
            {view === 'hours' && (
              <Select
                value={String(step)}
                onChange={handleStepChange}
                options={STEP_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                className="w-28 py-1.5 text-xs"
              />
            )}
            {/* MỘT nút đổi qua lại, không phải hai nút cạnh nhau: hai nút chiếm
                chỗ gấp đôi mà lúc nào cũng có một cái vô dụng — nó đang là dạng
                đang xem. Nhãn là NƠI SẼ TỚI, nên bấm xong nhãn đổi theo. */}
            <Button
              variant="ghost"
              size="sm"
              icon={view === 'hours' ? List : LayoutGrid}
              onClick={() => setView((v) => (v === 'hours' ? 'list' : 'hours'))}
              title={view === 'hours' ? 'Xem dạng danh sách' : 'Xem dạng lưới giờ'}
            >
              <span className="hidden sm:inline">{view === 'hours' ? 'Danh sách' : 'Lưới giờ'}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => load({ silent: true })} loading={refreshing} icon={RefreshCw}>
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Lưới giờ vẫn hiện khi bảng CHƯA có ca nào: giờ trống mới là chỗ học viên
            kéo chọn để đăng ký, ẩn lưới đi là hết đường đăng ký. Chỉ dạng danh
            sách theo ngày mới cần báo trống, vì nó chỉ liệt kê ca có sẵn. */}
        {view === 'hours' ? (
          // min-h-0 là bắt buộc: thiếu nó thì con flex không chịu co lại dưới
          // chiều cao nội dung, lưới đẩy cả trang dài ra thay vì tự cuộn
          <div className="flex min-h-0 flex-1 flex-col">
            {isManager && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="mr-1 text-xs font-medium text-slate-500">Con dấu</span>
                {[
                  { key: 'bold', label: 'Tô đậm', icon: Bold },
                  { key: 'mark', label: 'Đánh dấu', icon: Star },
                  { key: 'done', label: 'Hoàn thành', icon: BadgeCheck },
                  { key: 'clear', label: 'Gỡ dấu', icon: Eraser },
                ].map((t) => (
                  <Button
                    key={t.key}
                    size="sm"
                    variant={stampTool === t.key ? 'primary' : 'ghost'}
                    icon={t.icon}
                    disabled={savingRequest}
                    // Bấm lại chính nó là bỏ cầm — không cần nút "thôi" riêng
                    onClick={() => setStampTool((cur) => (cur === t.key ? null : t.key))}
                  >
                    {t.label}
                  </Button>
                ))}
                {stampTool && (
                  <span className="ml-1 text-xs text-primary-700">
                    Bấm vào buổi để đóng dấu · bấm lần nữa để gỡ · bấm lại nút để thôi
                  </span>
                )}
              </div>
            )}

            {slots.length === 0 && (
              <p className="mb-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-500">
                Tuần này chưa có ca nào — chọn giờ bạn muốn học.
              </p>
            )}
            {isManager && arranging && (
              <SchedulingTray
                items={pool}
                busy={savingRequest}
                onDetach={detachRequest}
                onRemove={async (itemId) => {
                  setSavingRequest(true)
                  try {
                    await bookingService.managerRemoveFromPool(itemId)
                    showFlash('success', 'Đã bỏ khỏi khu chờ')
                  } catch (err) {
                    showFlash('error', err.response?.data?.message || 'Không bỏ được')
                  } finally {
                    setSavingRequest(false)
                    await reloadPool()
                  }
                }}
              />
            )}
            <HourGrid
              mode="public"
              fillHeight
              board={board}
              slots={slots}
              weekStart={week}
              busySlotId={busySlotId}
              stepMinutes={step}
              selected={[...selectedIds, ...selectedCells.map((c) => c.key)]}
              // Khối in tên chủ buổi. Server đã trả tên cho người quản lý (thấy
              // buổi của mọi người), chỉ khi KHÔNG có mới điền tên người đang
              // đăng nhập — buổi đó là của chính họ. Trước đây ghi đè vô điều
              // kiện nên mọi khối đều mang tên người đang xem.
              myRequests={myRequests.map((r) => ({
                ...r,
                full_name: r.full_name || registrant?.full_name || null,
              }))}
              onToggleSelect={handleToggleSelect}
              onSlotClick={handleSlotClick}
              onRequestClick={handleCancelRequest}
              onRequestContextMenu={menu.open}
              canDrag={isManager && arranging}
              // Người quản lý bấm vào thẻ thì MỞ công cụ, không rút: thẻ đó
              // thường là của học viên khác, bấm nhầm một cái là mất buổi của họ
              clickAction={isManager ? 'panel' : 'cancel'}
              stampTool={isManager ? stampTool : null}
              onStamp={applyStamp}
              allowPast={isManager}
              onMoveRequest={moveRequest}
              onDropPoolItem={scheduleFromPool}
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
                  ? `Giữ chỗ ${selectedIds.length} ca`
                  : selectedIds.length === 0
                    ? `Đăng ký ${mergedCells.length} buổi học`
                    : `Giữ ${selectedIds.length} ca + đăng ký ${mergedCells.length} buổi`
              }
              shortLabel={
                mergedCells.length === 0
                  ? `Giữ ${selectedIds.length}`
                  : `Đăng ký ${mergedCells.length}`
              }
              loading={booking}
              onConfirm={handleConfirm}
              onClear={() => {
                setSelectedIds([])
                setSelectedCells([])
              }}
              hint={
                mergedCells.length > 0
                  ? 'Là nguyện vọng, chưa phải giữ chỗ.'
                  : board?.max_slots_per_person > 0 &&
                      myEntries.length + selectedIds.length > board.max_slots_per_person
                    ? `Tối đa ${board.max_slots_per_person} ca/tuần, bạn đã giữ ${myEntries.length}.`
                    : null
              }
            />
          </div>
        ) : (
          <BookingListView
            requests={myRequests.map((r) => ({
              ...r,
              full_name: r.full_name || registrant?.full_name || null,
            }))}
            weekStart={week}
            isManager={isManager}
            onOpen={(request, e) => menu.open(e, { request })}
            emptyHint="Tuần này chưa có buổi nào — chuyển sang Lưới giờ để chọn giờ."
          />
        )}
      </main>

      {/* Chuột phải vào buổi đã đăng ký: sửa ghi chú hoặc rút. Đổi màu không có
          ở đây — màu là việc xếp lớp của trung tâm, học viên chỉ xem. */}
      <BookingHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} isManager={isManager} />

      <ActivityLogSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        load={loadActivity}
      />

      <Modal
        isOpen={exitPrompt}
        onClose={() => setExitPrompt(false)}
        title={`Còn ${pool.length} buổi chưa xếp`}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setExitPrompt(false)
                setArranging(false)
              }}
            >
              Để lại làm sau
            </Button>
            <Button onClick={() => setExitPrompt(false)}>Tiếp tục xếp</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {pool.length} buổi đang nằm trong khu chờ sắp xếp. Thoát bây giờ thì chúng{' '}
          <b>vẫn được giữ nguyên</b> — con số trên nút <b>Sắp xếp</b> nhắc bạn còn việc dở, bật lại
          lúc nào cũng xếp tiếp được.
        </p>
      </Modal>

      <DropConflictDialog
        conflict={conflict}
        busy={savingRequest}
        onClose={() => setConflict(null)}
        onApply={applyResolution}
      />

      <ChatDock
        isManager={isManager}
        api={chatApi}
        socket={socket}
        unread={unreadMessages}
        // Học viên chỉ nhắc được trung tâm; người quản lý nhắc được từng học viên
        mentionNames={
          isManager
            ? ['Trung tâm', ...students.map((p) => p.full_name).filter(Boolean)]
            : ['Trung tâm']
        }
      />

      <RequestToolPanel
        state={menu.state}
        onClose={menu.close}
        busy={savingRequest}
        canColor={isManager}
        students={students}
        onSave={saveRequest}
        // Đóng dấu hoàn thành đi đường vòng qua ô nhập tiền, y như con dấu
        // trên lưới — hai lối vào cùng một việc thì phải chốt tiền như nhau
        onToggleFlag={(request, patch) => {
          if (patch.done !== true) return toggleFlag(request, patch)
          menu.close()
          return askDone(request)
        }}
        onSetColor={(request, color) => {
          setSavingRequest(true)
          bookingService
            .managerSetRegistrantColor(request.registrant_id, color)
            .then((res) => showFlash('success', res.data?.message || 'Đã đổi màu'))
            .catch((err) => showFlash('error', err.response?.data?.message || 'Không đổi được màu'))
            .finally(async () => {
              setSavingRequest(false)
              await load({ silent: true })
            })
        }}
        onChangeStudent={(request, registrantId) =>
          saveRequest(request, { registrant_id: registrantId })
        }
        onDetach={isManager ? (request) => detachRequest(request.id) : undefined}
        onCancel={(request) => {
          menu.close()
          handleCancelRequest(request)
        }}
      />

      <StudentMoneySheet
        open={moneyOpen}
        onClose={() => setMoneyOpen(false)}
        busy={savingRequest}
        load={loadStudentMoney}
        onSetPrice={setStudentPrice}
      />

      {/* Chốt tiền lúc đóng dấu hoàn thành */}
      <Modal
        isOpen={Boolean(donePrompt)}
        onClose={() => setDonePrompt(null)}
        title="Đóng dấu hoàn thành"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDonePrompt(null)}>
              Thôi
            </Button>
            <Button icon={BadgeCheck} loading={savingRequest} onClick={confirmDone}>
              Hoàn thành
            </Button>
          </>
        }
      >
        {donePrompt && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <b>{donePrompt.request.full_name || 'Buổi này'}</b> ·{' '}
              {formatDate(donePrompt.request.date)} · {donePrompt.request.start_time}–
              {donePrompt.request.end_time}
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tiền buổi này</span>
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                autoFocus
                value={donePrompt.amount}
                onChange={(e) => setDonePrompt((d) => ({ ...d, amount: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && confirmDone()}
                placeholder={
                  donePrompt.request.price_per_session === null ||
                  donePrompt.request.price_per_session === undefined
                    ? 'học viên chưa có giá'
                    : `${Number(donePrompt.request.price_per_session).toLocaleString('vi-VN')} (giá đã đặt)`
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </label>
            <p className="text-xs text-slate-500">
              Để trống thì lấy <b>giá đã đặt</b> của học viên. Đặt giá ở nút <b>Học viên</b>.
            </p>
          </div>
        )}
      </Modal>

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
