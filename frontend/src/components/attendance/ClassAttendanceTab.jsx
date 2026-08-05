import { useState, useEffect, useCallback, useContext } from 'react'
import { CalendarPlus, CheckCircle, ClipboardCheck, Link2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import Modal from '../common/Modal'
import ConfirmDialog from '../common/ConfirmDialog'
import { ToastContext } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import attendanceService from '../../services/attendance.service'
import { formatDate } from '../../utils/formatDate'

const SESSION_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Chưa học' },
  { value: 'completed', label: 'Đã học' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const STATUS_OPTIONS = [
  { value: 'present', label: 'Có mặt', color: 'text-emerald-700 bg-emerald-50' },
  { value: 'late', label: 'Đi muộn', color: 'text-amber-800 bg-amber-50' },
  { value: 'absent', label: 'Vắng', color: 'text-rose-700 bg-rose-50' },
  { value: 'excused', label: 'Có phép', color: 'text-stone-600 bg-stone-100' },
]

export default function ClassAttendanceTab({ classId, readOnly = false }) {
  const { user } = useAuth()
  const { success, error: showError } = useContext(ToastContext)
  const canEdit = !readOnly && (user?.role === 'admin' || user?.role === 'teacher')

  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editOrphan, setEditOrphan] = useState(null)
  const [orphanForm, setOrphanForm] = useState({
    session_date: '',
    start_time: '',
    end_time: '',
    status: 'scheduled',
    notes: '',
  })
  const [orphanSaving, setOrphanSaving] = useState(false)
  const [deleteOrphan, setDeleteOrphan] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showAddOrphan, setShowAddOrphan] = useState(false)
  const [addForm, setAddForm] = useState({
    session_date: '',
    start_time: '',
    end_time: '',
    notes: '',
  })
  const [sessionForm, setSessionForm] = useState({
    lesson_id: '',
    review_content: '',
    review_students: '',
    review_followup: '',
  })

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await attendanceService.getScheduleCalendar(classId, { from, to })
      setCalendar(res.data?.data || res.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được lịch điểm danh')
      setCalendar(null)
    } finally {
      setLoading(false)
    }
  }, [classId, from, to, showError])

  useEffect(() => {
    loadCalendar()
  }, [loadCalendar])

  useEffect(() => {
    if (!sheet) return
    const rf = sheet.review_fields || {}
    setSessionForm({
      lesson_id: rf.lesson_id || sheet.session?.lesson_id || '',
      review_content: rf.review_content ?? '',
      review_students: rf.review_students ?? '',
      review_followup: rf.review_followup ?? '',
    })
  }, [sheet])

  const canEditSheet = canEdit && sheet?.review?.can_edit !== false

  const openSheet = async (sessionId) => {
    setActiveSessionId(sessionId)
    setSheetLoading(true)
    try {
      const res = await attendanceService.getSession(sessionId)
      setSheet(res.data?.data || res.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải điểm danh')
      setActiveSessionId(null)
    } finally {
      setSheetLoading(false)
    }
  }

  const openSlot = async (slot) => {
    if (slot.session_id) {
      openSheet(slot.session_id)
      return
    }
    if (!canEdit) return
    try {
      const res = await attendanceService.ensureFromSchedule({
        class_id: classId,
        schedule_id: slot.schedule_id,
        session_date: slot.session_date,
      })
      const session = res.data?.data || res.data
      success('Đã liên kết buổi học với thời khóa biểu')
      loadCalendar()
      if (session?.id) openSheet(session.id)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tạo được buổi từ TKB')
    }
  }

  const setStudentStatus = (profileId, status) => {
    setSheet((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.profile_id === profileId ? { ...s, status } : s
      ),
    }))
  }

  const setStudentNote = (profileId, note) => {
    setSheet((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.profile_id === profileId ? { ...s, note } : s
      ),
    }))
  }

  const setTeacherStatus = (status) => {
    setSheet((prev) => ({
      ...prev,
      teacher: prev.teacher ? { ...prev.teacher, status } : null,
    }))
  }

  const markAllPresent = () => {
    setSheet((prev) => ({
      ...prev,
      students: prev.students.map((s) => ({ ...s, status: 'present' })),
      teacher: prev.teacher ? { ...prev.teacher, status: 'present' } : null,
    }))
  }

  const handleSave = async () => {
    if (!sheet) return
    setSaving(true)
    try {
      await attendanceService.saveAttendance(activeSessionId, {
        teacher: sheet.teacher ? { status: sheet.teacher.status, note: sheet.teacher.note } : null,
        students: sheet.students.map((s) => ({
          profile_id: s.profile_id,
          status: s.status,
          note: s.note,
        })),
        lesson_id: sessionForm.lesson_id || null,
        review_content: sessionForm.review_content,
        review_students: sessionForm.review_students,
        review_followup: sessionForm.review_followup,
        mark_completed: true,
      })
      success('Đã lưu điểm danh và nhận xét buổi học')
      setActiveSessionId(null)
      setSheet(null)
      loadCalendar()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const openEditOrphan = (o) => {
    setEditOrphan(o)
    setOrphanForm({
      session_date: o.session_date || '',
      start_time: o.start_time ? String(o.start_time).slice(0, 5) : '',
      end_time: o.end_time ? String(o.end_time).slice(0, 5) : '',
      status: o.session_status || 'scheduled',
      notes: o.notes || '',
    })
  }

  const handleSaveOrphan = async () => {
    if (!editOrphan) return
    setOrphanSaving(true)
    try {
      await attendanceService.updateSession(editOrphan.session_id, {
        session_date: orphanForm.session_date,
        start_time: orphanForm.start_time || null,
        end_time: orphanForm.end_time || null,
        status: orphanForm.status,
        notes: orphanForm.notes || null,
      })
      success('Đã cập nhật buổi lẻ')
      setEditOrphan(null)
      loadCalendar()
    } catch (err) {
      showError(err.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      setOrphanSaving(false)
    }
  }

  const handleDeleteOrphan = async () => {
    if (!deleteOrphan) return
    setDeleting(true)
    try {
      await attendanceService.deleteSession(deleteOrphan.session_id)
      success('Đã xóa buổi lẻ')
      setDeleteOrphan(null)
      loadCalendar()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddOrphan = async () => {
    if (!addForm.session_date) {
      showError('Chọn ngày buổi học')
      return
    }
    setOrphanSaving(true)
    try {
      await attendanceService.createSession({
        class_id: classId,
        session_date: addForm.session_date,
        start_time: addForm.start_time || null,
        end_time: addForm.end_time || null,
        notes: addForm.notes || null,
        status: 'scheduled',
      })
      success('Đã thêm buổi lẻ')
      setShowAddOrphan(false)
      setAddForm({ session_date: '', start_time: '', end_time: '', notes: '' })
      loadCalendar()
    } catch (err) {
      showError(err.response?.data?.message || 'Thêm buổi thất bại')
    } finally {
      setOrphanSaving(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await attendanceService.generateSessions({ class_id: classId, from, to })
      const r = res.data?.data || res.data
      success(
        `Đồng bộ TKB: tạo ${r.created} buổi, gắn ${r.linked || 0} buổi, bỏ qua ${r.skipped}`
      )
      loadCalendar()
    } catch (err) {
      showError(err.response?.data?.message || 'Đồng bộ TKB thất bại')
    } finally {
      setGenerating(false)
    }
  }

  const summary = calendar?.summary
  const slots = calendar?.slots || []
  const schedules = calendar?.schedules || []
  const orphans = calendar?.orphan_sessions || []

  return (
    <div className="space-y-4">
      <div className="app-card p-4 flex flex-wrap gap-3 items-end">
        <Input label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="outline" icon={RefreshCw} onClick={loadCalendar}>
          Tải lại
        </Button>
        {canEdit && (
          <Button variant="outline" icon={CalendarPlus} loading={generating} onClick={handleGenerate}>
            Đồng bộ tất cả từ TKB
          </Button>
        )}
      </div>

      {schedules.length > 0 && (
        <div className="app-card p-4">
          <h3 className="text-sm font-semibold text-stone-800 mb-2">Ca học trên thời khóa biểu</h3>
          <div className="flex flex-wrap gap-2">
            {schedules.map((s) => (
              <span
                key={s.id}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900"
              >
                {s.day_label} {String(s.start_time || '').slice(0, 5)}–{String(s.end_time || '').slice(0, 5)}
                {s.room_name ? ` • ${s.room_name}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary && summary.missing_count > 0 && canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          Còn <strong>{summary.missing_count}</strong> ca TKB chưa có buổi điểm danh. Bấm «Đồng bộ tất cả» hoặc «Liên kết & điểm danh» từng dòng.
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Đang tải lịch theo TKB..." />
      ) : schedules.length === 0 ? (
        <EmptyState message="Lớp chưa có thời khóa biểu. Vào Thời khóa biểu để tạo ca học trước." />
      ) : slots.length === 0 ? (
        <EmptyState message="Không có ca TKB trong khoảng ngày đã chọn." />
      ) : (
        <div className="app-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-600 text-left">
                <th className="px-4 py-2">Ngày</th>
                <th className="px-4 py-2">TKB</th>
                <th className="px-4 py-2">Giờ / Phòng</th>
                <th className="px-4 py-2">Liên kết</th>
                <th className="px-4 py-2">Buổi học</th>
                <th className="px-4 py-2">Bài học</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr
                  key={`${slot.schedule_id}-${slot.session_date}`}
                  className={`border-t border-stone-100 hover:bg-amber-50/30 ${
                    !slot.linked ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium">{formatDate(slot.session_date)}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium text-amber-800">{slot.day_label}</span>
                  </td>
                  <td className="px-4 py-2 text-stone-600">
                    {String(slot.start_time || '').slice(0, 5)}
                    {slot.end_time ? ` – ${String(slot.end_time).slice(0, 5)}` : ''}
                    {slot.room_name && (
                      <span className="block text-xs text-stone-400">{slot.room_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {slot.linked ? (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {slot.schedule_linked ? 'Đã gắn TKB' : 'Cần gắn lại'}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500">Chưa tạo buổi</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {slot.session_status ? (
                      <SessionBadge status={slot.session_status} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 text-stone-600 text-xs max-w-[140px] truncate" title={slot.lesson_title || ''}>
                    {slot.lesson_title || '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant={slot.session_status === 'completed' ? 'outline' : 'primary'}
                      icon={slot.linked ? ClipboardCheck : Link2}
                      onClick={() => openSlot(slot)}
                      disabled={readOnly && !slot.session_id}
                    >
                      {slot.linked
                        ? slot.session_status === 'completed'
                          ? 'Xem'
                          : 'Điểm danh'
                        : canEdit
                          ? 'Liên kết & điểm danh'
                          : '—'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-700">Buổi lẻ (không từ TKB)</h3>
          {canEdit && (
            <Button size="sm" variant="outline" icon={Plus} onClick={() => setShowAddOrphan(true)}>
              Thêm buổi lẻ
            </Button>
          )}
        </div>
        {orphans.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500 text-center">Chưa có buổi lẻ trong khoảng ngày này.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50/80 text-stone-600 text-left">
                <th className="px-4 py-2 font-medium">Ngày</th>
                <th className="px-4 py-2 font-medium">Thứ</th>
                <th className="px-4 py-2 font-medium">Giờ</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orphans.map((o) => (
                <tr key={o.session_id} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-4 py-2">{formatDate(o.session_date)}</td>
                  <td className="px-4 py-2">{o.day_label}</td>
                  <td className="px-4 py-2 text-stone-600">
                    {String(o.start_time || '').slice(0, 5) || '—'}
                    {o.end_time ? ` – ${String(o.end_time).slice(0, 5)}` : ''}
                  </td>
                  <td className="px-4 py-2">
                    <SessionBadge status={o.session_status} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button size="sm" variant="outline" icon={ClipboardCheck} onClick={() => openSheet(o.session_id)}>
                        Điểm danh
                      </Button>
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEditOrphan(o)}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteOrphan(o)}
                          >
                            Xóa
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={!!editOrphan}
        onClose={() => setEditOrphan(null)}
        title="Sửa buổi lẻ"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOrphan(null)}>Hủy</Button>
            <Button loading={orphanSaving} onClick={handleSaveOrphan}>Lưu</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Ngày học" type="date" value={orphanForm.session_date} onChange={(e) => setOrphanForm((f) => ({ ...f, session_date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Giờ bắt đầu" type="time" value={orphanForm.start_time} onChange={(e) => setOrphanForm((f) => ({ ...f, start_time: e.target.value }))} />
            <Input label="Giờ kết thúc" type="time" value={orphanForm.end_time} onChange={(e) => setOrphanForm((f) => ({ ...f, end_time: e.target.value }))} />
          </div>
          <Select label="Trạng thái buổi" value={orphanForm.status} onChange={(e) => setOrphanForm((f) => ({ ...f, status: e.target.value }))} options={SESSION_STATUS_OPTIONS} />
          <Input label="Ghi chú" value={orphanForm.notes} onChange={(e) => setOrphanForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        isOpen={showAddOrphan}
        onClose={() => setShowAddOrphan(false)}
        title="Thêm buổi lẻ"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddOrphan(false)}>Hủy</Button>
            <Button loading={orphanSaving} onClick={handleAddOrphan}>Thêm</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Ngày học" type="date" value={addForm.session_date} onChange={(e) => setAddForm((f) => ({ ...f, session_date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Giờ bắt đầu" type="time" value={addForm.start_time} onChange={(e) => setAddForm((f) => ({ ...f, start_time: e.target.value }))} />
            <Input label="Giờ kết thúc" type="time" value={addForm.end_time} onChange={(e) => setAddForm((f) => ({ ...f, end_time: e.target.value }))} />
          </div>
          <Input label="Ghi chú" value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteOrphan}
        onClose={() => setDeleteOrphan(null)}
        onConfirm={handleDeleteOrphan}
        loading={deleting}
        title="Xóa buổi lẻ"
        message={deleteOrphan ? `Xóa buổi ${formatDate(deleteOrphan.session_date)}? Điểm danh liên quan cũng bị xóa.` : ''}
      />

      <Modal
        isOpen={!!activeSessionId}
        onClose={() => {
          setActiveSessionId(null)
          setSheet(null)
        }}
        title="Điểm danh & nhận xét buổi học"
        size="lg"
      >
        {sheetLoading || !sheet ? (
          <LoadingSpinner message="Đang tải..." />
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-stone-600">
              {formatDate(sheet.session.session_date)}
              {sheet.session.start_time && ` • ${String(sheet.session.start_time).slice(0, 5)}`}
              {sheet.session.schedule_id && (
                <span className="ml-2 text-xs text-emerald-700">(theo TKB)</span>
              )}
            </div>

            {sheet.review && !sheet.review.can_edit && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                Đã quá {sheet.review.deadline_hours || 12} giờ sau buổi học. Chỉ xem, không chỉnh sửa được.
              </div>
            )}
            {sheet.review?.can_edit && sheet.review.hours_remaining != null && sheet.review.hours_remaining <= 6 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Còn khoảng <strong>{sheet.review.hours_remaining}h</strong> để ghi điểm danh và nhận xét (hạn trong 12h sau buổi).
              </div>
            )}

            <div className="rounded-lg border border-stone-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-stone-500">Liên kết bài học & nhận xét buổi (3 loại)</p>
              <Select
                label="Bài học trong lớp"
                value={sessionForm.lesson_id}
                onChange={(e) => setSessionForm((f) => ({ ...f, lesson_id: e.target.value }))}
                disabled={!canEditSheet}
                options={[
                  { value: '', label: '— Chưa chọn bài —' },
                  ...(sheet.lessons || []).map((l) => ({
                    value: l.id,
                    label: l.title || `Bài ${l.order_index ?? ''}`,
                  })),
                ]}
              />
              <ReviewField
                label="1. Nội dung buổi học"
                hint="Đã dạy gì, tài liệu, hoạt động chính"
                value={sessionForm.review_content}
                onChange={(v) => setSessionForm((f) => ({ ...f, review_content: v }))}
                disabled={!canEditSheet}
              />
              <ReviewField
                label="2. Nhận xét học sinh"
                hint="Tham gia, tiến bộ, cần lưu ý"
                value={sessionForm.review_students}
                onChange={(v) => setSessionForm((f) => ({ ...f, review_students: v }))}
                disabled={!canEditSheet}
              />
              <ReviewField
                label="3. Việc tiếp theo / bài tập"
                hint="Bài tập về nhà, chuẩn bị buổi sau"
                value={sessionForm.review_followup}
                onChange={(v) => setSessionForm((f) => ({ ...f, review_followup: v }))}
                disabled={!canEditSheet}
              />
            </div>

            {sheet.teacher && (
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3">
                <p className="text-xs font-semibold text-stone-500 mb-2">Giáo viên</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">{sheet.teacher.full_name}</span>
                  {canEditSheet ? (
                    <StatusPicker value={sheet.teacher.status} onChange={setTeacherStatus} />
                  ) : (
                    <StatusLabel status={sheet.teacher.status} />
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-stone-500">
                  Học sinh ({sheet.summary.present_students}/{sheet.summary.total_students} có mặt)
                </p>
                {canEditSheet && (
                  <Button size="sm" variant="ghost" icon={CheckCircle} onClick={markAllPresent}>
                    Tất cả có mặt
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sheet.students.map((s) => (
                  <div
                    key={s.profile_id}
                    className="py-1.5 border-b border-stone-100 last:border-0 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{s.full_name}</span>
                      {canEditSheet ? (
                        <StatusPicker
                          value={s.status}
                          onChange={(st) => setStudentStatus(s.profile_id, st)}
                        />
                      ) : (
                        <StatusLabel status={s.status} />
                      )}
                    </div>
                    {(canEditSheet || s.note) && (
                      <input
                        type="text"
                        className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1 disabled:bg-stone-50"
                        placeholder="Ghi chú riêng học sinh"
                        value={s.note || ''}
                        disabled={!canEditSheet}
                        onChange={(e) => setStudentNote(s.profile_id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {canEditSheet && (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" onClick={() => setActiveSessionId(null)}>
                  Hủy
                </Button>
                <Button loading={saving} onClick={handleSave}>
                  Lưu điểm danh & nhận xét
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReviewField({ label, hint, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-700">{label}</span>
      {hint && <span className="block text-[11px] text-stone-400 mb-1">{hint}</span>}
      <textarea
        rows={2}
        className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 resize-y disabled:bg-stone-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function StatusPicker({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-stone-200 rounded-lg px-2 py-1"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function StatusLabel({ status }) {
  const o = STATUS_OPTIONS.find((x) => x.value === status) || STATUS_OPTIONS[2]
  return <span className={`text-xs px-2 py-0.5 rounded-full ${o.color}`}>{o.label}</span>
}

function SessionBadge({ status }) {
  const map = {
    scheduled: 'bg-stone-100 text-stone-700',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-rose-100 text-rose-700',
  }
  const labels = { scheduled: 'Chưa học', completed: 'Đã học', cancelled: 'Hủy' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] || map.scheduled}`}>
      {labels[status] || status}
    </span>
  )
}
