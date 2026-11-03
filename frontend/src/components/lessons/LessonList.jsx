import { useState, useContext, useCallback } from 'react'
import { Plus, Download, BookCopy, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import LoadingSpinner from '../common/LoadingSpinner'
import LessonForm from './LessonForm'
import LessonDetail from './LessonDetail'
import LessonUnitSections from './LessonUnitSections'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { useAuth } from '../../hooks/useAuth'
import { ToastContext } from '../../context/ToastContext'
import lessonsService from '../../services/lessons.service'
import lessonProgressService from '../../services/lessonProgress.service'
import templatesService from '../../services/templates.service'
import { formatDate } from '../../utils/formatDate'
import { hasTcoCurriculum } from '../../utils/lessonCurriculum'

const contentTypeMap = {
  text: 'Văn bản',
  video: 'Video',
  file: 'Tệp tin',
}

export default function LessonList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'

  const fetchLessons = useCallback(
    () => lessonsService.getAll({ limit: 300, sortBy: 'order_index', sortOrder: 'ASC' }),
    []
  )
  const { data: lessons, loading, execute: reload } = useFetch(fetchLessons)
  const fetchProgress = useCallback(() => lessonProgressService.getMine(), [])
  const { data: progressData } = useFetch(fetchProgress)

  const lessonList = Array.isArray(lessons) ? lessons : lessons?.lessons || []
  const progressList = Array.isArray(progressData) ? progressData : []
  const progressMap = progressList.reduce((map, row) => {
    map[row.lesson_id] = row
    return map
  }, {})

  const columns = [
    { key: 'title', label: 'Tiêu đề' },
    {
      key: 'class',
      label: 'Lớp học',
      accessor: (row) => row.class?.name || row.class_name || '—',
    },
    {
      key: 'content_type',
      label: 'Loại nội dung',
      accessor: (row) => contentTypeMap[row.content_type] || row.content_type || '—',
    },
    { key: 'order_index', label: 'Thứ tự', accessor: (row) => row.order_index ?? '—' },
    {
      key: 'is_published',
      label: 'Trạng thái',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge
            status={row.is_published ? 'active' : 'inactive'}
            label={row.is_published ? 'Đã xuất bản' : 'Nháp'}
          />
          {row.is_template && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">Mẫu</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      accessor: (row) => formatDate(row.created_at),
    },
  ]

  const handleEdit = (lesson) => { setSelected(lesson); setShowForm(true) }
  const handleDelete = (lesson) => { setSelected(lesson); setShowDelete(true) }
  const handleView = (lesson) => { setSelected(lesson); setShowDetail(true) }

  const toggleTemplate = async (lesson) => {
    setToggling(true)
    try {
      const fn = lesson.is_template ? templatesService.unmarkTemplate : templatesService.markAsTemplate
      await fn({ type: 'lesson', ids: [lesson.id] })
      success(lesson.is_template ? 'Đã bỏ đánh dấu mẫu' : 'Đã đánh dấu làm mẫu')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setToggling(false) }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await lessonsService.delete(selected.id)
      success('Xóa bài học thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa bài học thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'title', header: 'Tiêu đề' },
      { key: 'class', header: 'Lớp học', accessor: (r) => r.class?.name || r.class_name || '' },
      { key: 'content_type', header: 'Loại nội dung', accessor: (r) => contentTypeMap[r.content_type] || '' },
      { key: 'order_index', header: 'Thứ tự' },
      { key: 'is_published', header: 'Xuất bản', accessor: (r) => r.is_published ? 'Có' : 'Không' },
    ]
    exportToExcel(lessonList, exportCols, 'danh-sach-bai-hoc')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài học</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher ? 'Bài học các lớp bạn phụ trách' : 'Quản lý danh sách bài học'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button icon={Plus} data-tour="lessons-add" onClick={() => { setSelected(null); setShowForm(true) }}>
            Thêm bài học
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : hasTcoCurriculum(lessonList) ? (
        <LessonUnitSections
          lessons={lessonList}
          showClassName
          progressMap={progressMap}
          onItemClick={handleView}
          renderActions={(lesson) => (
            <>
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
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => toggleTemplate(lesson)}
                  disabled={toggling}
                  className={`p-1.5 rounded-lg transition-colors ${
                    lesson.is_template
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600'
                  }`}
                  title={lesson.is_template ? 'Bỏ đánh dấu mẫu' : 'Đánh dấu làm mẫu'}
                >
                  <BookCopy className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleEdit(lesson)}
                className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                title="Chỉnh sửa"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(lesson)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        />
      ) : (
        <Table
          columns={columns}
          data={lessonList}
          onEdit={handleEdit}
          onDelete={isAdmin ? handleDelete : undefined}
          onView={handleView}
          actions={isAdmin ? (row) => (
            <button
              onClick={() => toggleTemplate(row)}
              disabled={toggling}
              className={`p-1 rounded-lg transition-colors ${
                row.is_template
                  ? 'text-amber-700 hover:bg-amber-50'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600'
              }`}
              title={row.is_template ? 'Bỏ đánh dấu mẫu' : 'Đánh dấu làm mẫu'}
            >
              <BookCopy className="h-4 w-4" />
            </button>
          ) : undefined}
          searchPlaceholder="Tìm bài học..."
          emptyMessage="Chưa có bài học nào"
        />
      )}

      <LessonForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        lesson={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <LessonDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        lesson={selected}
      />

      {isAdmin && (
        <ConfirmDialog
          isOpen={showDelete}
          onClose={() => { setShowDelete(false); setSelected(null) }}
          onConfirm={confirmDelete}
          loading={deleting}
          title="Xóa bài học"
          message={`Bạn có chắc chắn muốn xóa bài học "${selected?.title}"?`}
        />
      )}
    </div>
  )
}
