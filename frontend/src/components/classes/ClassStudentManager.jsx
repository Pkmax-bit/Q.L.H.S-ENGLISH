import { useState, useContext, useCallback, useEffect } from 'react'
import { UserPlus, UserMinus, Search, Clock, XCircle, CheckSquare, Square, Trash2, Users, MessageCircle, UserRoundPlus, ListChecks } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import classesService from '../../services/classes.service'
import studentsService from '../../services/students.service'
import enrollmentRequestsService from '../../services/enrollmentRequests.service'
import { formatDate } from '../../utils/formatDate'
import { useMessenger } from '../../context/MessengerContext'

const EMPTY_CREATE = { full_name: '', email: '', phone: '' }

export default function ClassStudentManager({ classId, students = [], loading, onReload, readOnly = false }) {
  const [searchMode, setSearchMode] = useState(false)
  const [addTab, setAddTab] = useState('pick')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStudentList, setSearchStudentList] = useState('')
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [requestNote, setRequestNote] = useState('')
  const [enrollmentDate, setEnrollmentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newStudent, setNewStudent] = useState(EMPTY_CREATE)
  const [createErrors, setCreateErrors] = useState({})

  const [selectedToAdd, setSelectedToAdd] = useState(new Set())
  const [selectedToRemove, setSelectedToRemove] = useState(new Set())

  const { success, error: showError } = useContext(ToastContext)
  const { createDirect, openDock, refreshGroups } = useMessenger()
  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedStudentSearch = useDebounce(searchStudentList, 300)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const canMessageStudents = isAdmin || isTeacher

  useEffect(() => {
    if (!readOnly && students.length === 0 && (isAdmin || isTeacher)) {
      setSearchMode(true)
    }
  }, [students.length, readOnly, isAdmin, isTeacher])

  const handleMessageStudent = async (student) => {
    if (!student?.id) return
    try {
      const group = await createDirect(student.id)
      await refreshGroups()
      openDock(group)
    } catch (err) {
      showError(err.response?.data?.message || 'Không mở được chat với học sinh')
    }
  }

  const fetchAvailableStudents = useCallback(() => {
    if (readOnly || !searchMode || addTab !== 'pick') return Promise.resolve({ data: [] })
    return studentsService.getAll({ search: debouncedSearch || undefined, limit: 80 })
  }, [readOnly, searchMode, addTab, debouncedSearch])

  const { data: allStudentsData, execute: reloadAvailable } = useFetch(fetchAvailableStudents, [fetchAvailableStudents])
  const allStudents = Array.isArray(allStudentsData) ? allStudentsData : allStudentsData?.students || allStudentsData?.data || []

  const fetchPendingRequests = useCallback(() => {
    if (readOnly || (!isAdmin && !isTeacher)) return Promise.resolve({ data: [] })
    return enrollmentRequestsService.getAll({ class_id: classId, status: 'pending' })
  }, [classId, readOnly, isAdmin, isTeacher])
  const { data: pendingData, execute: reloadPending } = useFetch(fetchPendingRequests)
  const pendingRequests = Array.isArray(pendingData) ? pendingData : pendingData?.requests || []

  const studentIds = students.map((s) => s.id)
  const pendingStudentIds = pendingRequests.map((r) => r.student_id)

  const filteredAvailable = allStudents.filter((s) => {
    const id = s.id
    if (studentIds.includes(id)) return false
    if (pendingStudentIds.includes(id)) return false
    return true
  })

  const filteredStudents = students.filter((s) => {
    if (!debouncedStudentSearch) return true
    const q = debouncedStudentSearch.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    )
  })

  const toggleAddSelect = (studentId) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const selectAllAvailable = () => {
    const visible = filteredAvailable.slice(0, 50)
    if (selectedToAdd.size === visible.length) setSelectedToAdd(new Set())
    else setSelectedToAdd(new Set(visible.map((s) => s.id)))
  }

  const toggleRemoveSelect = (studentId) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const selectAllStudents = () => {
    if (selectedToRemove.size === filteredStudents.length) setSelectedToRemove(new Set())
    else setSelectedToRemove(new Set(filteredStudents.map((s) => s.id)))
  }

  const handleBatchAdd = async () => {
    if (selectedToAdd.size === 0) return
    setAdding(true)
    try {
      if (isAdmin) {
        const ids = Array.from(selectedToAdd)
        const result = await classesService.addStudentsBatch(classId, ids, { enrollment_date: enrollmentDate })
        const data = result.data || result
        let msg = `Đã thêm ${data.added || ids.length} học sinh vào lớp`
        if (data.skipped > 0) msg += ` (${data.skipped} đã có sẵn)`
        if (data.capacityExceeded > 0) msg += ` (${data.capacityExceeded} vượt sĩ số)`
        success(msg)
        onReload()
        reloadAvailable()
      } else if (isTeacher) {
        const ids = Array.from(selectedToAdd)
        let count = 0
        for (const sid of ids) {
          try {
            await enrollmentRequestsService.create({ class_id: classId, student_id: sid, note: requestNote || undefined })
            count++
          } catch (_) { /* skip */ }
        }
        success(`Đã gửi ${count} yêu cầu thêm học sinh. Chờ admin duyệt.`)
        reloadPending()
        setRequestNote('')
      }
      setSelectedToAdd(new Set())
    } catch (err) {
      showError(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setAdding(false)
    }
  }

  const handleAdd = async (student) => {
    setAdding(true)
    try {
      if (isAdmin) {
        await classesService.addStudent(classId, student.id, { enrollment_date: enrollmentDate })
        success(`Đã thêm "${student.full_name}" vào lớp`)
        onReload()
        reloadAvailable()
      } else if (isTeacher) {
        await enrollmentRequestsService.create({
          class_id: classId,
          student_id: student.id,
          note: requestNote || undefined,
        })
        success(`Đã gửi yêu cầu thêm "${student.full_name}". Chờ admin duyệt.`)
        reloadPending()
        setRequestNote('')
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setAdding(false)
    }
  }

  const validateCreate = () => {
    const errs = {}
    if (!newStudent.full_name.trim()) errs.full_name = 'Nhập họ tên'
    if (!newStudent.email.trim() && !newStudent.phone.trim()) {
      errs.email = 'Cần email hoặc SĐT'
      errs.phone = 'Cần email hoặc SĐT'
    }
    return errs
  }

  const handleCreateAndEnroll = async (e) => {
    e?.preventDefault()
    const errs = validateCreate()
    setCreateErrors(errs)
    if (Object.keys(errs).length) return

    setCreating(true)
    try {
      if (isAdmin) {
        const res = await classesService.createStudentAndEnroll(classId, {
          full_name: newStudent.full_name.trim(),
          email: newStudent.email.trim() || undefined,
          phone: newStudent.phone.trim() || undefined,
          enrollment_date: enrollmentDate,
        })
        const student = res.data?.student || res.data?.data?.student || res.student
        success(`Đã tạo "${student?.full_name || newStudent.full_name}" và ghi danh vào lớp`)
        setNewStudent(EMPTY_CREATE)
        setAddTab('pick')
        onReload()
        reloadAvailable()
      } else if (isTeacher) {
        const created = await studentsService.create({
          full_name: newStudent.full_name.trim(),
          email: newStudent.email.trim() || undefined,
          phone: newStudent.phone.trim() || undefined,
        })
        const student = created.data || created
        await enrollmentRequestsService.create({
          class_id: classId,
          student_id: student.id,
          note: requestNote || 'Học sinh mới tạo — đề xuất ghi danh',
        })
        success(`Đã tạo "${student.full_name}" và gửi yêu cầu ghi danh. Chờ admin duyệt.`)
        setNewStudent(EMPTY_CREATE)
        reloadPending()
        setRequestNote('')
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Không tạo được học sinh')
    } finally {
      setCreating(false)
    }
  }

  const confirmBatchRemove = async () => {
    setRemoving(true)
    try {
      const ids = Array.from(selectedToRemove)
      const result = await classesService.removeStudentsBatch(classId, ids)
      const data = result.data || result
      success(`Đã xóa ${data.removed || ids.length} học sinh khỏi lớp`)
      setSelectedToRemove(new Set())
      onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa học sinh thất bại')
    } finally {
      setRemoving(false)
      setShowRemove(false)
    }
  }

  const handleCancelRequest = async (requestId, studentName) => {
    try {
      await enrollmentRequestsService.cancel(requestId)
      success(`Đã hủy yêu cầu thêm "${studentName}"`)
      reloadPending()
    } catch (err) {
      showError(err.response?.data?.message || 'Hủy yêu cầu thất bại')
    }
  }

  if (loading) return <LoadingSpinner />

  const visibleAvailable = filteredAvailable.slice(0, 50)
  const allVisibleSelected = visibleAvailable.length > 0 && selectedToAdd.size === visibleAvailable.length
  const allStudentsSelected = filteredStudents.length > 0 && selectedToRemove.size === filteredStudents.length

  return (
    <div className="space-y-4" data-tour="class-students-panel">
      {/* Hướng dẫn nhanh */}
      {!readOnly && (isAdmin || isTeacher) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0" />
            Thêm học viên vào lớp
          </p>
          <ol className="mt-1.5 text-xs text-blue-800/90 space-y-0.5 list-decimal list-inside">
            {isAdmin ? (
              <>
                <li>Chọn học sinh có sẵn hoặc tạo mới ngay tại đây (một bước)</li>
                <li>Chọn ngày nhập học → thêm vào lớp</li>
              </>
            ) : (
              <>
                <li>Chọn học sinh hoặc tạo mới → gửi yêu cầu cho admin duyệt</li>
              </>
            )}
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-gray-700">
          Danh sách học sinh ({students.length})
        </h4>
        <div className="flex gap-2">
          {!readOnly && isAdmin && selectedToRemove.size > 0 && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setShowRemove(true)}>
              Xóa {selectedToRemove.size} học sinh
            </Button>
          )}
          {!readOnly && (
            <Button
              size="sm"
              icon={UserPlus}
              data-tour="class-students-add"
              onClick={() => { setSearchMode(!searchMode); setSelectedToAdd(new Set()) }}
              variant={searchMode ? 'secondary' : 'primary'}
            >
              {searchMode ? 'Đóng' : isTeacher ? 'Thêm học sinh' : 'Thêm học viên'}
            </Button>
          )}
        </div>
      </div>

      {!readOnly && searchMode && (
        <div className="border border-slate-200 rounded-xl p-4 bg-white/80 shadow-sm space-y-4">
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <label className="text-xs font-medium text-gray-600">Ngày nhập học:</label>
              <input
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          )}

          {isTeacher && (
            <p className="text-xs text-amber-700 flex items-center gap-1.5 pb-2 border-b border-amber-100">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Giáo viên: yêu cầu thêm HS cần admin duyệt
            </p>
          )}

          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setAddTab('pick')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${addTab === 'pick' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500'}`}
            >
              Chọn có sẵn
            </button>
            <button
              type="button"
              onClick={() => setAddTab('create')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${addTab === 'create' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500'}`}
            >
              <UserRoundPlus className="h-4 w-4" />
              Tạo mới
            </button>
          </div>

          {addTab === 'pick' ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, SĐT..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isTeacher && (
                <input
                  type="text"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Ghi chú cho admin (tùy chọn)..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {visibleAvailable.length > 0 && (
                <div className="flex items-center justify-between px-1">
                  <button type="button" onClick={selectAllAvailable} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-700">
                    {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-blue-700" /> : <Square className="h-4 w-4" />}
                    {allVisibleSelected ? 'Bỏ chọn' : `Chọn tất cả (${visibleAvailable.length})`}
                  </button>
                  {selectedToAdd.size > 0 && (
                    <Button size="sm" variant="success" icon={Users} onClick={handleBatchAdd} loading={adding}>
                      {isTeacher ? `Đề xuất ${selectedToAdd.size} HS` : `Thêm ${selectedToAdd.size} HS`}
                    </Button>
                  )}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1">
                {visibleAvailable.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {debouncedSearch ? 'Không tìm thấy học sinh' : 'Gõ tên/email để tìm, hoặc chuyển sang tab Tạo mới'}
                  </p>
                ) : (
                  visibleAvailable.map((student) => {
                    const isSelected = selectedToAdd.has(student.id)
                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleAddSelect(student.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-blue-700 shrink-0" /> : <Square className="h-4 w-4 text-gray-400 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{student.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{student.email || student.phone || ''}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isTeacher ? 'warning' : 'success'}
                          icon={isTeacher ? Clock : UserPlus}
                          onClick={(e) => { e.stopPropagation(); handleAdd(student) }}
                          loading={adding}
                        >
                          {isTeacher ? 'Đề xuất' : 'Thêm'}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateAndEnroll} className="space-y-3">
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Tạo tài khoản học sinh và ghi danh vào lớp ngay. Mật khẩu mặc định: changeme123'
                  : 'Tạo học sinh mới và gửi yêu cầu ghi danh cho admin.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Họ tên *"
                  value={newStudent.full_name}
                  onChange={(e) => { setNewStudent((p) => ({ ...p, full_name: e.target.value })); setCreateErrors((p) => ({ ...p, full_name: null })) }}
                  error={createErrors.full_name}
                  placeholder="Nguyễn Văn A"
                />
                <Input
                  label="Email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => { setNewStudent((p) => ({ ...p, email: e.target.value })); setCreateErrors((p) => ({ ...p, email: null, phone: null })) }}
                  error={createErrors.email}
                  placeholder="hs@email.com"
                />
                <Input
                  label="Số điện thoại"
                  value={newStudent.phone}
                  onChange={(e) => { setNewStudent((p) => ({ ...p, phone: e.target.value })); setCreateErrors((p) => ({ ...p, email: null, phone: null })) }}
                  error={createErrors.phone}
                  placeholder="0901234567"
                />
              </div>
              {isTeacher && (
                <input
                  type="text"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Ghi chú cho admin..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
              )}
              <Button type="submit" icon={UserRoundPlus} loading={creating}>
                {isAdmin ? 'Tạo & ghi danh vào lớp' : 'Tạo & gửi yêu cầu ghi danh'}
              </Button>
            </form>
          )}
        </div>
      )}

      {!readOnly && pendingRequests.length > 0 && (
        <div className="border border-amber-200 rounded-lg bg-amber-50/50">
          <div className="px-3 py-2 border-b border-amber-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-700">Đang chờ duyệt ({pendingRequests.length})</h4>
          </div>
          <div className="p-2 space-y-1">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">{req.student_name}</p>
                  <p className="text-xs text-gray-500">{req.student_email || req.student_phone || ''}</p>
                </div>
                <button type="button" onClick={() => handleCancelRequest(req.id, req.student_name)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Lớp chưa có học sinh — bấm &quot;Thêm học viên&quot; phía trên</p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchStudentList}
              onChange={(e) => setSearchStudentList(e.target.value)}
              placeholder="Tìm trong danh sách..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {isAdmin && filteredStudents.length > 0 && (
            <button type="button" onClick={selectAllStudents} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-700 px-1">
              {allStudentsSelected ? <CheckSquare className="h-4 w-4 text-blue-700" /> : <Square className="h-4 w-4" />}
              {allStudentsSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredStudents.length})`}
            </button>
          )}

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredStudents.map((student, idx) => {
              const isSelected = selectedToRemove.has(student.id)
              const originalIdx = students.indexOf(student)
              return (
                <div
                  key={student.id || idx}
                  onClick={() => isAdmin && toggleRemoveSelect(student.id)}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isAdmin ? 'cursor-pointer' : ''} ${isSelected ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isAdmin && (isSelected ? <CheckSquare className="h-4 w-4 text-red-500 shrink-0" /> : <Square className="h-4 w-4 text-gray-400 shrink-0" />)}
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700 shrink-0">
                      {originalIdx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{student.full_name}</p>
                      <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                      {student.enrollment_date && (
                        <p className="text-[11px] text-gray-600 mt-0.5">Nhập học: {formatDate(student.enrollment_date)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canMessageStudents && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleMessageStudent(student) }} className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-600">
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedToRemove(new Set([student.id])); setShowRemove(true) }} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500">
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isAdmin && (
        <ConfirmDialog
          isOpen={showRemove}
          onClose={() => setShowRemove(false)}
          onConfirm={confirmBatchRemove}
          loading={removing}
          title="Xóa học sinh khỏi lớp"
          message={`Bạn có chắc chắn muốn xóa ${selectedToRemove.size} học sinh khỏi lớp?`}
        />
      )}
    </div>
  )
}
