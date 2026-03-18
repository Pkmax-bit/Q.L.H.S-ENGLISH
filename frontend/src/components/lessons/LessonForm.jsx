import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import lessonsService from '../../services/lessons.service'
import classesService from '../../services/classes.service'
import { validateForm, required } from '../../utils/validators'

const initialForm = {
  title: '',
  class_id: '',
  content: '',
  content_type: 'text',
  is_published: false,
  file_url: '',
  order_index: '',
}

export default function LessonForm({ isOpen, onClose, lesson, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!lesson

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  useEffect(() => {
    if (lesson) {
      setForm({
        title: lesson.title || '',
        class_id: lesson.class_id || lesson.class?.id || '',
        content: lesson.content || '',
        content_type: lesson.content_type || 'text',
        is_published: lesson.is_published || false,
        file_url: lesson.file_url || '',
        order_index: lesson.order_index ?? '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [lesson, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      title: [() => required(form.title, 'Tiêu đề')],
      class_id: [() => required(form.class_id, 'Lớp học')],
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
          <Input
            label="URL tệp tin"
            name="file_url"
            value={form.file_url}
            onChange={handleChange}
            placeholder="https://example.com/file.pdf"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_published"
            name="is_published"
            checked={form.is_published}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_published" className="text-sm text-gray-700">
            Đã xuất bản
          </label>
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
      </form>
    </Modal>
  )
}
