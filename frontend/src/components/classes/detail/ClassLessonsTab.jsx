import { useState, useContext, useCallback } from 'react'
import { BookOpen, FileText, Youtube, HardDrive, Eye, EyeOff, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import Button from '../../common/Button'
import ConfirmDialog from '../../common/ConfirmDialog'
import LessonDetail from '../../lessons/LessonDetail'
import LessonForm from '../../lessons/LessonForm'
import { ToastContext } from '../../../context/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useFetch } from '../../../hooks/useFetch'
import lessonsService from '../../../services/lessons.service'
import { formatDate } from '../../../utils/formatDate'

const CONTENT_ICONS = {
  text: FileText,
  file: HardDrive,
  video: Youtube,
  youtube: Youtube,
  drive: HardDrive,
}

export default function ClassLessonsTab({ lessons: initialLessons, classId, onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const canManage = isAdmin || isTeacher

  // Fetch lessons for this class (live data)
  const fetchLessons = useCallback(() => lessonsService.getAll({ class_id: classId, limit: 200 }), [classId])
  const { data: lessonsData, loading, execute: reloadLessons } = useFetch(fetchLessons)
  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || initialLessons || []

  const handleAdd = () => {
    setSelected(null)
    setShowForm(true)
  }

  const handleEdit = (lesson) => {
    setSelected(lesson)
    setShowForm(true)
  }

  const handleView = (lesson) => {
    // Fetch full lesson detail for view
    lessonsService.getById(lesson.id).then(res => {
      const data = res.data?.data ?? res.data ?? res
      setSelected(data)
      setShowDetail(true)
    }).catch(() => {
      setSelected(lesson)
      setShowDetail(true)
    })
  }

  const handleDeleteClick = (lesson) => {
    setSelected(lesson)
    setShowDelete(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await lessonsService.delete(selected.id)
      success('Xóa bài học thành công')
      reloadLessons()
      if (onReload) onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa bài học thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelected(null)
    reloadLessons()
    if (onReload) onReload()
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      {canManage && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Danh sách bài học ({lessons.length})
          </h3>
          <Button size="sm" icon={Plus} onClick={handleAdd}>
            Thêm bài học
          </Button>
        </div>
      )}

      {/* Lessons list */}
      {lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có bài học nào</p>
          <p className="text-sm text-gray-400 mt-1">
            {canManage ? 'Nhấn "Thêm bài học" để tạo bài học mới' : 'Bài học sẽ hiển thị ở đây khi được tạo'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {lessons.map((lesson, idx) => {
            const Icon = CONTENT_ICONS[lesson.content_type] || FileText
            return (
              <div
                key={lesson.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleView(lesson)}
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                    {lesson.order_index ?? idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors truncate">
                        {lesson.title}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                        <Icon className="h-3 w-3" />
                        {lesson.content_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>Tạo: {formatDate(lesson.created_at)}</span>
                      {lesson.created_by_name && <span>bởi {lesson.created_by_name}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {lesson.is_published ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                      <Eye className="h-3 w-3" />
                      Đã xuất bản
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                      <EyeOff className="h-3 w-3" />
                      Nháp
                    </span>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(lesson) }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(lesson) }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lesson Form Modal */}
      {canManage && (
        <LessonForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setSelected(null) }}
          lesson={selected}
          defaultClassId={classId}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Lesson Detail Modal */}
      <LessonDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        lesson={selected}
      />

      {/* Delete Confirm */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={showDelete}
          onClose={() => { setShowDelete(false); setSelected(null) }}
          onConfirm={confirmDelete}
          loading={deleting}
          title="Xóa bài học"
          message={`Bạn có chắc chắn muốn xóa bài học "${selected?.title}"? Hành động này không thể hoàn tác.`}
        />
      )}
    </div>
  )
}
