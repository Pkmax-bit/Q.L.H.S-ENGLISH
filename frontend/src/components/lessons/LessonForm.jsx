import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import FileUpload from '../common/FileUpload'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import lessonsService from '../../services/lessons.service'
import subjectsService from '../../services/subjects.service'
import { validateForm, required } from '../../utils/validators'

const initialForm = {
  title: '',
  subjectId: '',
  content: '',
  youtube_url: '',
  drive_url: '',
  order_index: '',
}

export default function LessonForm({ isOpen, onClose, lesson, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState(null)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!lesson

  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const { data: subjectsData } = useFetch(fetchSubjects)
  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []
  const subjectOptions = subjects.map((s) => ({ value: s._id || s.id, label: s.name }))

  useEffect(() => {
    if (lesson) {
      setForm({
        title: lesson.title || '',
        subjectId: lesson.subjectId || lesson.subject?._id || lesson.subject?.id || '',
        content: lesson.content || '',
        youtube_url: lesson.youtube_url || lesson.youtubeUrl || '',
        drive_url: lesson.drive_url || lesson.driveUrl || '',
        order_index: lesson.order_index ?? lesson.orderIndex ?? '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
    setFiles(null)
  }, [lesson, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      title: [() => required(form.title, 'Tiêu đề')],
      subjectId: [() => required(form.subjectId, 'Môn học')],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const payload = {
        ...form,
        order_index: form.order_index !== '' ? Number(form.order_index) : undefined,
      }

      if (isEdit) {
        await lessonsService.update(lesson._id || lesson.id, payload)
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            label="Môn học"
            name="subjectId"
            value={form.subjectId}
            onChange={handleChange}
            options={subjectOptions}
            placeholder="Chọn môn học"
            error={errors.subjectId}
            required
          />
          <Input
            label="Thứ tự"
            name="order_index"
            type="number"
            value={form.order_index}
            onChange={handleChange}
            placeholder="1"
          />
          <Input
            label="YouTube URL"
            name="youtube_url"
            value={form.youtube_url}
            onChange={handleChange}
            placeholder="https://youtube.com/watch?v=..."
          />
          <Input
            label="Google Drive URL"
            name="drive_url"
            value={form.drive_url}
            onChange={handleChange}
            placeholder="https://drive.google.com/..."
          />
        </div>
        <Input
          label="Nội dung"
          name="content"
          type="textarea"
          value={form.content}
          onChange={handleChange}
          placeholder="Nội dung bài học..."
          rows={5}
        />
        <FileUpload
          label="Tệp đính kèm"
          onFileSelect={setFiles}
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png"
          maxSize={10}
        />
      </form>
    </Modal>
  )
}
