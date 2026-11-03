import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import RichTextEditor from '../common/RichTextEditor'
import RichContentViewer from '../common/RichContentViewer'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import lessonsService from '../../services/lessons.service'
import uploadsService from '../../services/uploads.service'
import classesService from '../../services/classes.service'
import { validateForm, required } from '../../utils/validators'
import {
  Youtube, FolderOpen, FileText, Pencil, Eye,
  BookOpen, ExternalLink, CheckCircle, ChevronDown, ChevronUp,
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
  order_index: 1,
}

function extractYoutubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

function resolveContentType(form) {
  if (form.youtube_url?.trim()) return 'video'
  if (form.file_url?.trim()) return 'file'
  return 'text'
}

export default function LessonForm({ isOpen, onClose, lesson, onSuccess, defaultClassId }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [showMore, setShowMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!(lesson && lesson.id)

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = useMemo(
    () => (Array.isArray(classesData) ? classesData : classesData?.classes || []),
    [classesData],
  )
  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes],
  )

  useEffect(() => {
    if (!isOpen) return
    if (lesson && lesson.id) {
      const hasLinks = !!(lesson.youtube_url || lesson.drive_url || lesson.file_url)
      setForm({
        title: lesson.title || '',
        class_id: lesson.class_id || lesson.class?.id || '',
        content: lesson.content || '',
        content_type: lesson.content_type || 'text',
        is_published: lesson.is_published || false,
        file_url: lesson.file_url || '',
        youtube_url: lesson.youtube_url || '',
        drive_url: lesson.drive_url || '',
        order_index: lesson.order_index != null && lesson.order_index !== '' ? Number(lesson.order_index) : 1,
      })
      setShowMore(hasLinks || (lesson.order_index != null && Number(lesson.order_index) > 0))
    } else {
      setForm({ ...initialForm, class_id: defaultClassId || '', order_index: 1 })
      setShowMore(false)
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

  const handleUpload = async (file, kind) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadsService.uploadMany([file])
      const url = res.data?.data?.urls?.[0] || res.data?.urls?.[0]
      if (!url) throw new Error('Upload failed')
      if (kind === 'image') {
        setForm((prev) => ({
          ...prev,
          file_url: prev.file_url || url,
          content: `${prev.content || ''}<p><img src="${url}" alt="Minh họa bài học" /></p>`,
        }))
      } else if (kind === 'video') {
        setForm((prev) => ({ ...prev, file_url: url }))
      } else {
        setForm((prev) => ({ ...prev, file_url: url }))
      }
      success('Đã tải tệp lên bài học')
    } catch (err) {
      showError(err.response?.data?.message || 'Tải tệp thất bại')
    } finally {
      setUploading(false)
    }
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
      const orderNum = Number(form.order_index)
      const payload = {
        title: form.title.trim(),
        class_id: form.class_id,
        content: form.content || '',
        content_type: resolveContentType(form),
        is_published: !!form.is_published,
        file_url: form.file_url?.trim() || '',
        youtube_url: form.youtube_url?.trim() || '',
        drive_url: form.drive_url?.trim() || '',
        order_index: Number.isFinite(orderNum) && orderNum >= 0 ? orderNum : 1,
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

  const selectedClassName = classOptions.find((c) => c.value === form.class_id)?.label || ''
  const ytId = extractYoutubeId(form.youtube_url)
  const hasContent = form.content && form.content !== '<p><br></p>' && form.content !== '<p></p>'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
      size="xl"
      dataTour="lesson-form"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          {activeTab === 'preview' ? (
            <Button variant="outline" icon={Pencil} onClick={() => setActiveTab('edit')}>
              Quay lại soạn
            </Button>
          ) : (
            <Button variant="secondary" icon={Eye} onClick={() => setActiveTab('preview')}>
              Xem trước
            </Button>
          )}
          <Button data-tour="lesson-form-save" onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Lưu' : 'Thêm bài học'}
          </Button>
        </>
      }
    >
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'edit' ? 'bg-white text-amber-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Soạn
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'preview' ? 'bg-white text-amber-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Xem trước
        </button>
      </div>

      {activeTab === 'edit' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 -mt-1">
            Điền tiêu đề, chọn lớp, soạn nội dung — rồi bấm «Thêm bài học».
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tiêu đề bài học"
              name="title"
              value={form.title}
              onChange={handleChange}
              error={errors.title}
              placeholder="VD: Unit 1 — Chào hỏi"
              required
              dataTour="lesson-field-title"
            />
            <Select
              label="Lớp học"
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
              options={classOptions}
              placeholder="Chọn lớp"
              error={errors.class_id}
              required
              dataTour="lesson-field-class"
            />
          </div>

          <div data-tour="lesson-field-content">
          <RichTextEditor
            label="Nội dung"
            value={form.content}
            onChange={handleContentChange}
            placeholder="Gõ nội dung bài học tại đây…"
            minHeight="220px"
            showPreview={false}
          />
          </div>

          <label data-tour="lesson-field-publish" className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
            <input
              type="checkbox"
              id="is_published_edit"
              name="is_published"
              checked={form.is_published}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-800">
              <span className="font-medium">Xuất bản ngay</span>
              <span className="text-gray-500"> — học sinh trong lớp nhìn thấy bài này</span>
            </span>
          </label>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <span>Thêm video / tài liệu / thứ tự (tuỳ chọn)</span>
              {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showMore && (
              <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100 bg-gray-50/40">
                <Input
                  label="Thứ tự trong lớp"
                  name="order_index"
                  type="number"
                  min={0}
                  value={form.order_index}
                  onChange={handleChange}
                  helperText="Số nhỏ hiện trước (1, 2, 3…)"
                />
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-2">
                    <Youtube className="h-5 w-5 text-red-500 mt-7 shrink-0" />
                    <Input
                      label="Link YouTube"
                      name="youtube_url"
                      value={form.youtube_url}
                      onChange={handleChange}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <FolderOpen className="h-5 w-5 text-yellow-600 mt-7 shrink-0" />
                    <Input
                      label="Link Google Drive"
                      name="drive_url"
                      value={form.drive_url}
                      onChange={handleChange}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-amber-700 mt-7 shrink-0" />
                    <Input
                      label="Link tệp / ảnh / video"
                      name="file_url"
                      value={form.file_url}
                      onChange={handleChange}
                      placeholder="https://…/file.pdf hoặc /uploads/..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm cursor-pointer hover:border-amber-300">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0], 'image')} />
                      {uploading ? 'Đang tải…' : 'Tải ảnh vào bài'}
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm cursor-pointer hover:border-amber-300">
                      <input type="file" accept="video/mp4,video/webm,audio/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0], 'video')} />
                      {uploading ? 'Đang tải…' : 'Tải video / audio'}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {activeTab === 'preview' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Học sinh sẽ thấy bài học như thế này
            </p>
          </div>

          <div className="bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4">
              <div className="flex items-center gap-2 text-blue-200 text-xs mb-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Bài học</span>
                {form.order_index !== '' && form.order_index != null && (
                  <span>• Thứ tự {form.order_index}</span>
                )}
                {selectedClassName && <span>• {selectedClassName}</span>}
              </div>
              <h1 className="text-lg font-bold text-white">
                {form.title || '(Chưa có tiêu đề)'}
              </h1>
            </div>

            <div className="p-5 space-y-5">
              {ytId && (
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              )}

              {hasContent ? (
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <RichContentViewer content={form.content} />
                </div>
              ) : !ytId ? (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có nội dung.</p>
              ) : null}

              {(form.file_url || form.drive_url) && (
                <div className="flex flex-wrap gap-2">
                  {form.drive_url && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                      <FolderOpen className="h-3.5 w-3.5" /> Drive <ExternalLink className="h-3 w-3" />
                    </span>
                  )}
                  {form.file_url && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <FileText className="h-3.5 w-3.5" /> Tệp <ExternalLink className="h-3 w-3" />
                    </span>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-center">
                <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Đã xem bài học
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            {form.is_published ? (
              <span className="text-emerald-700 font-medium">Đã xuất bản</span>
            ) : (
              <span className="font-medium">Nháp — học sinh chưa thấy</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
