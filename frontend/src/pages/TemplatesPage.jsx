import { useState, useContext, useCallback, useEffect } from 'react'
import {
  BookOpen, FileText, Copy, Check, Search, BookTemplate,
  Shield, Users, UserPlus, X, ChevronDown
} from 'lucide-react'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Modal from '../components/common/Modal'
import Select from '../components/common/Select'
import RichContentViewer from '../components/common/RichContentViewer'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import { ToastContext } from '../context/ToastContext'
import templatesService from '../services/templates.service'
import classesService from '../services/classes.service'
import teachersService from '../services/teachers.service'

const typeLabelMap = { essay: 'Tự luận', mcq: 'Trắc nghiệm', mixed: 'Hỗn hợp', multiple_choice: 'Trắc nghiệm' }

export default function TemplatesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [tab, setTab] = useState('lessons')
  const [selectedIds, setSelectedIds] = useState([])
  const [showApply, setShowApply] = useState(false)
  const [applyClassId, setApplyClassId] = useState('')
  const [applying, setApplying] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [search, setSearch] = useState('')
  const [showPermissions, setShowPermissions] = useState(false)
  const [permTarget, setPermTarget] = useState(null) // { type, id, title }
  const { success, error: showError } = useContext(ToastContext)

  const fetchLessons = useCallback(() => templatesService.getLessonTemplates({ search }), [search])
  const fetchAssignments = useCallback(() => templatesService.getAssignmentTemplates({ search }), [search])
  const fetchClasses = useCallback(() => classesService.getAll(), [])

  const { data: lessonsData, loading: lLoading } = useFetch(fetchLessons, [search])
  const { data: assignmentsData, loading: aLoading } = useFetch(fetchAssignments, [search])
  const { data: classesData } = useFetch(fetchClasses)

  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || []
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.assignments || []
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  const items = tab === 'lessons' ? lessons : assignments
  const loading = tab === 'lessons' ? lLoading : aLoading

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const selectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([])
    else setSelectedIds(items.map((i) => i.id))
  }

  const handleApply = async () => {
    if (!applyClassId) { showError('Chọn lớp học'); return }
    if (selectedIds.length === 0) { showError('Chọn ít nhất 1 mẫu'); return }

    setApplying(true)
    try {
      const fn = tab === 'lessons'
        ? templatesService.applyLessonTemplates
        : templatesService.applyAssignmentTemplates
      const result = await fn({ template_ids: selectedIds, class_id: applyClassId })
      const count = result.data?.created || result.created || selectedIds.length
      success(`Đã áp dụng ${count} ${tab === 'lessons' ? 'bài học' : 'bài tập'} mẫu vào lớp`)
      setShowApply(false)
      setSelectedIds([])
      setApplyClassId('')
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setApplying(false)
    }
  }

  const handleBulkGrantAll = async () => {
    if (selectedIds.length === 0) { showError('Chọn ít nhất 1 mẫu'); return }
    try {
      await templatesService.bulkGrantAllTeachers({
        template_type: tab === 'lessons' ? 'lesson' : 'assignment',
        template_ids: selectedIds,
      })
      success(`Đã cho phép tất cả giáo viên dùng ${selectedIds.length} mẫu`)
      setSelectedIds([])
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const openPermissions = (item) => {
    setPermTarget({
      type: tab === 'lessons' ? 'lesson' : 'assignment',
      id: item.id,
      title: item.title,
    })
    setShowPermissions(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mẫu bài giảng</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Quản lý mẫu và cấp quyền cho giáo viên' : 'Chọn mẫu để áp dụng vào lớp bạn dạy'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <>
              <Button icon={Copy} onClick={() => setShowApply(true)}>
                Áp dụng {selectedIds.length} mẫu
              </Button>
              {isAdmin && (
                <Button variant="outline" icon={Users} onClick={handleBulkGrantAll}>
                  Cho phép tất cả GV
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => { setTab('lessons'); setSelectedIds([]) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'lessons' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Bài học ({lessons.length})
          </button>
          <button
            onClick={() => { setTab('assignments'); setSelectedIds([]) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'assignments' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" /> Bài tập ({assignments.length})
          </button>
        </div>

        <div className="flex-1 relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mẫu..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Select all */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {selectedIds.length === items.length ? 'Bỏ chọn tất cả' : `Chọn tất cả (${items.length})`}
          </button>
          {selectedIds.length > 0 && (
            <span className="text-xs text-gray-500">Đã chọn {selectedIds.length} mẫu</span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookTemplate className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Chưa có mẫu {tab === 'lessons' ? 'bài học' : 'bài tập'} nào.</p>
          <p className="text-xs mt-1">
            {isAdmin
              ? 'Đánh dấu bài học/bài tập là "Mẫu" để hiện ở đây.'
              : 'Admin chưa cấp quyền sử dụng mẫu nào cho bạn.'}
          </p>
        </div>
      ) : tab === 'lessons' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.map((lesson) => {
            const isSelected = selectedIds.includes(lesson.id)
            return (
              <div
                key={lesson.id}
                className={`bg-white rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
                  isSelected ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-gray-200'
                }`}
                onClick={() => toggleSelect(lesson.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-xs text-gray-400 font-mono">#{lesson.order_index}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openPermissions(lesson) }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Quản lý quyền"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Mẫu</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">{lesson.title}</h3>
                <div className="flex gap-2 mt-2">
                  {lesson.youtube_url && <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">🎬 Video</span>}
                  {lesson.file_url && <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">📎 File</span>}
                  {lesson.drive_url && <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">📁 Drive</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewItem({ ...lesson, _type: 'lesson' }) }}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                >
                  Xem trước →
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a) => {
            const isSelected = selectedIds.includes(a.id)
            const qCount = a.assignment_questions?.length || 0
            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
                  isSelected ? 'border-purple-500 bg-purple-50/30 shadow-md' : 'border-gray-200'
                }`}
                onClick={() => toggleSelect(a.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openPermissions(a) }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Quản lý quyền"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {typeLabelMap[a.assignment_type] || a.assignment_type}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">{a.title}</h3>
                <div className="flex gap-3 text-xs text-gray-500 mt-2">
                  <span>📝 {qCount} câu hỏi</span>
                  <span>🎯 {a.total_points || 0} điểm</span>
                  {a.time_limit_minutes && <span>⏱️ {a.time_limit_minutes} phút</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewItem({ ...a, _type: 'assignment' }) }}
                  className="text-xs text-purple-600 hover:text-purple-800 mt-2 font-medium"
                >
                  Xem trước →
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Apply Modal */}
      <Modal
        isOpen={showApply}
        onClose={() => setShowApply(false)}
        title={`Áp dụng ${selectedIds.length} mẫu vào lớp`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowApply(false)}>Hủy</Button>
            <Button onClick={handleApply} loading={applying} icon={Copy}>Áp dụng</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Chọn lớp học để copy <strong>{selectedIds.length}</strong> {tab === 'lessons' ? 'bài học' : 'bài tập'} mẫu vào.
            Bài sẽ được tạo bản sao mới (trạng thái Nháp).
          </p>
          <Select
            label="Lớp học đích"
            name="class_id"
            value={applyClassId}
            onChange={(e) => setApplyClassId(e.target.value)}
            options={classOptions}
            placeholder="Chọn lớp học..."
            required
          />
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.title || 'Xem trước'}
        size="2xl"
      >
        {previewItem && (
          <div className="space-y-4">
            {previewItem._type === 'lesson' && previewItem.content && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 max-h-[500px] overflow-y-auto">
                <RichContentViewer content={previewItem.content} />
              </div>
            )}
            {previewItem._type === 'assignment' && previewItem.description && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <RichContentViewer content={previewItem.description} />
              </div>
            )}
            {previewItem._type === 'assignment' && previewItem.assignment_questions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Câu hỏi ({previewItem.assignment_questions.length})</p>
                {previewItem.assignment_questions.map((q, i) => (
                  <div key={q.id || i} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-700">Câu {i + 1}: {q.question_text}</p>
                    <span className="text-xs text-gray-400">{q.question_type} | {q.points} điểm</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Permissions Modal (admin only) */}
      {isAdmin && permTarget && (
        <TemplatePermissionsModal
          isOpen={showPermissions}
          onClose={() => { setShowPermissions(false); setPermTarget(null) }}
          templateType={permTarget.type}
          templateId={permTarget.id}
          templateTitle={permTarget.title}
        />
      )}
    </div>
  )
}

/* ========== PERMISSIONS MODAL (Admin) ========== */
function TemplatePermissionsModal({ isOpen, onClose, templateType, templateId, templateTitle }) {
  const [perms, setPerms] = useState([])
  const [loading, setLoading] = useState(false)
  const [addTeacherId, setAddTeacherId] = useState('')
  const [adding, setAdding] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchTeachers = useCallback(() => teachersService.getAll(), [])
  const { data: teachersData } = useFetch(fetchTeachers)
  const teachers = Array.isArray(teachersData) ? teachersData : teachersData?.teachers || []
  const teacherOptions = [
    { value: '__all__', label: '👥 Tất cả giáo viên' },
    ...teachers.map(t => ({ value: t.id, label: t.full_name })),
  ]

  const loadPerms = async () => {
    setLoading(true)
    try {
      const res = await templatesService.getPermissions(templateType, templateId)
      setPerms(res.data || res || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && templateId) loadPerms()
  }, [isOpen, templateId])

  const handleAdd = async () => {
    if (!addTeacherId) { showError('Chọn giáo viên'); return }
    setAdding(true)
    try {
      await templatesService.grantPermission({
        template_type: templateType,
        template_id: templateId,
        teacher_id: addTeacherId === '__all__' ? null : addTeacherId,
      })
      success('Đã cấp quyền sử dụng mẫu')
      setAddTeacherId('')
      loadPerms()
    } catch (err) {
      showError(err.response?.data?.message || 'Cấp quyền thất bại')
    } finally {
      setAdding(false)
    }
  }

  const handleRevoke = async (permId) => {
    try {
      await templatesService.revokePermission(permId)
      success('Đã thu hồi quyền')
      loadPerms()
    } catch (err) {
      showError(err.response?.data?.message || 'Thu hồi thất bại')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quản lý quyền: ${templateTitle}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Giáo viên được cấp quyền sẽ thấy mẫu này trong trang "Mẫu bài giảng" và có thể áp dụng vào lớp.
        </p>

        {/* Add permission */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Thêm giáo viên"
              name="teacher_id"
              value={addTeacherId}
              onChange={(e) => setAddTeacherId(e.target.value)}
              options={teacherOptions}
              placeholder="Chọn giáo viên..."
            />
          </div>
          <Button size="sm" icon={UserPlus} onClick={handleAdd} loading={adding}>
            Cấp quyền
          </Button>
        </div>

        {/* Current permissions */}
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Đã cấp quyền ({perms.length})
          </h4>
          {loading ? (
            <LoadingSpinner />
          ) : perms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Chưa cấp quyền cho ai. Chỉ admin dùng được mẫu này.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {perms.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      p.is_all_teachers ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {p.is_all_teachers ? <Users className="h-4 w-4" /> : p.teacher_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {p.is_all_teachers ? 'Tất cả giáo viên' : p.teacher_name || '—'}
                      </p>
                      {p.teacher_email && (
                        <p className="text-xs text-gray-400">{p.teacher_email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                    title="Thu hồi quyền"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
