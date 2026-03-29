import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import RichTextEditor from '../common/RichTextEditor'
import RichContentViewer from '../common/RichContentViewer'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import lessonsService from '../../services/lessons.service'
import classesService from '../../services/classes.service'
import { validateForm, required } from '../../utils/validators'
import { formatDate } from '../../utils/formatDate'
import {
  Youtube, FolderOpen, FileText, Link, Pencil, Eye,
  BookOpen, Calendar, ExternalLink, CheckCircle
} from 'lucide-react'

const initialForm = {
  title: '',
  class_id: '',
  content: '',
  content_type: 'text',
  is_published: false,
  file_url: '',
  youtube_url: '',
  drive_url: '',
  order_index: '',
}

function extractYoutubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

export default function LessonForm({ isOpen, onClose, lesson, onSuccess, defaultClassId }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('edit') // 'edit' | 'preview'
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!(lesson && lesson.id)

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  useEffect(() => {
    if (lesson && lesson.id) {
      setForm({
        title: lesson.title || '',
        class_id: lesson.class_id || lesson.class?.id || '',
        content: lesson.content || '',
        content_type: lesson.content_type || 'text',
        is_published: lesson.is_published || false,
        file_url: lesson.file_url || '',
        youtube_url: lesson.youtube_url || '',
        drive_url: lesson.drive_url || '',
        order_index: lesson.order_index ?? '',
      })
    } else {
      setForm({ ...initialForm, class_id: defaultClassId || '' })
    }
    setErrors({})
    setActiveTab('edit')
  }, [lesson, isOpen, defaultClassId])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleContentChange = (value) => {
    setForm((prev) => ({ ...prev, content: value }))
  }

  const validate = () => {
    return validateForm({
      title: [() => required(form.title, 'Tiêu đề')],
      class_id: [() => required(form.class_id, 'Lớp học')],
    })
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setActiveTab('edit')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        order_index: form.order_index !== '' ? Number(form.order_index) : undefined,
      }

      if (isEdit) {
        await lessonsService.update(lesson.id, payload)
        success('Cập nhật bài học thành công')
      } else {
        await lessonsService.create(payload)
        success('Thêm bài học thành công')
      }
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const selectedClassName = classOptions.find(c => c.value === form.class_id)?.label || ''
  const ytId = extractYoutubeId(form.youtube_url)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
      size="2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          {activeTab === 'preview' && (
            <Button variant="outline" icon={Pencil} onClick={() => setActiveTab('edit')}>
              Quay lại soạn
            </Button>
          )}
          {activeTab === 'edit' && (
            <Button variant="secondary" icon={Eye} onClick={() => setActiveTab('preview')}>
              Xem trước
            </Button>
          )}
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </>
      }
    >
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'edit'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Soạn nội dung
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'preview'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Xem trước bài học
        </button>
      </div>

      {/* ======== EDIT TAB ======== */}
      {activeTab === 'edit' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tiêu đề"
              name="title"
              value={form.title}
              onChange={handleChange}
              error={errors.title}
              placeholder="Tên bài học"
              required
            />
            <Select
              label="Lớp học"
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
              options={classOptions}
              placeholder="Chọn lớp học"
              error={errors.class_id}
              required
            />
            <Select
              label="Loại nội dung"
              name="content_type"
              value={form.content_type}
              onChange={handleChange}
              options={[
                { value: 'text', label: 'Văn bản' },
                { value: 'video', label: 'Video' },
                { value: 'file', label: 'Tệp tin' },
              ]}
            />
            <Input
              label="Thứ tự"
              name="order_index"
              type="number"
              value={form.order_index}
              onChange={handleChange}
              placeholder="1"
            />
          </div>

          {/* Media links */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Link className="h-4 w-4" /> Liên kết tài nguyên
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <Youtube className="h-5 w-5 text-red-500 mt-7 flex-shrink-0" />
                <Input
                  label="YouTube URL"
                  name="youtube_url"
                  value={form.youtube_url}
                  onChange={handleChange}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="flex items-start gap-2">
                <FolderOpen className="h-5 w-5 text-yellow-500 mt-7 flex-shrink-0" />
                <Input
                  label="Google Drive URL"
                  name="drive_url"
                  value={form.drive_url}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-blue-500 mt-7 flex-shrink-0" />
                <Input
                  label="URL tệp đính kèm"
                  name="file_url"
                  value={form.file_url}
                  onChange={handleChange}
                  placeholder="https://example.com/file.pdf"
                />
              </div>
            </div>
          </div>

          {/* Published toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published_edit"
              name="is_published"
              checked={form.is_published}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_published_edit" className="text-sm text-gray-700">
              Đã xuất bản (học sinh có thể nhìn thấy)
            </label>
          </div>

          {/* Rich text content - Preview button is inside RichTextEditor */}
          <RichTextEditor
            label="Nội dung bài học"
            value={form.content}
            onChange={handleContentChange}
            placeholder="Soạn nội dung bài học: thêm tiêu đề, đoạn văn, hình ảnh, danh sách..."
            minHeight="350px"
            showPreview={true}
          />
        </form>
      )}

      {/* ======== PREVIEW TAB - Mô phỏng giao diện học sinh ======== */}
      {activeTab === 'preview' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          {/* Preview banner */}
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Đây là giao diện học sinh sẽ thấy khi mở bài học này
            </p>
          </div>

          {/* Simulated lesson view */}
          <div className="bg-white rounded-b-xl overflow-hidden">
            {/* Title bar */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5">
              <div className="flex items-center gap-2 text-blue-200 text-xs mb-2">
                <BookOpen className="h-4 w-4" />
                <span>Bài học</span>
                {form.order_index && <span>• Thứ tự: {form.order_index}</span>}
                {selectedClassName && <span>• {selectedClassName}</span>}
              </div>
              <h1 className="text-xl font-bold text-white">
                {form.title || '(Chưa có tiêu đề)'}
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* YouTube embed */}
              {ytId && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500" /> Video bài giảng
                  </p>
                  <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title="preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* YouTube link fallback */}
              {form.youtube_url && !ytId && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <Youtube className="h-4 w-4" /> 
                  <span>Video: {form.youtube_url}</span>
                </div>
              )}

              {/* Content */}
              {form.content && form.content !== '<p><br></p>' && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">📝 Nội dung bài học</p>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                    <RichContentViewer content={form.content} />
                  </div>
                </div>
              )}

              {/* No content yet */}
              {(!form.content || form.content === '<p><br></p>') && !ytId && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Chưa có nội dung. Quay lại tab "Soạn nội dung" để thêm.</p>
                </div>
              )}

              {/* Resource links */}
              {(form.file_url || form.drive_url) && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">📎 Tài liệu đính kèm</p>
                  <div className="flex flex-wrap gap-3">
                    {form.drive_url && (
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        <FolderOpen className="h-4 w-4" />
                        Google Drive
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                    {form.file_url && (
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <FileText className="h-4 w-4" />
                        Tệp đính kèm
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completion marker */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-center">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Đã xem bài học
                </div>
              </div>
            </div>
          </div>

          {/* Status info */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Trạng thái: {form.is_published ? (
                <span className="text-green-600 font-medium">✅ Đã xuất bản</span>
              ) : (
                <span className="text-gray-500 font-medium">📝 Nháp (học sinh chưa thấy)</span>
              )}
            </span>
            <span>Loại: {form.content_type}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
