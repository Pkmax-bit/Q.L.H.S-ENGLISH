import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import QuestionBuilder from './QuestionBuilder'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import assignmentsService from '../../services/assignments.service'
import classesService from '../../services/classes.service'
import lessonsService from '../../services/lessons.service'
import { validateForm, required } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  title: '',
  class_id: '',
  lesson_id: '',
  assignment_type: 'essay',
  total_points: '',
  due_date: '',
  is_published: false,
  time_limit_minutes: '',
  questions: [],
}

export default function AssignmentForm({ isOpen, onClose, assignment, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!assignment

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  const fetchLessons = useCallback(() => lessonsService.getAll(), [])
  const { data: lessonsData } = useFetch(fetchLessons)
  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || []
  // Filter lessons by selected class if possible
  const filteredLessons = form.class_id
    ? lessons.filter((l) => l.class_id === form.class_id || l.class?.id === form.class_id)
    : lessons
  const lessonOptions = filteredLessons.map((l) => ({ value: l.id, label: l.title }))

  useEffect(() => {
    if (assignment) {
      setForm({
        title: assignment.title || '',
        class_id: assignment.class_id || assignment.class?.id || '',
        lesson_id: assignment.lesson_id || assignment.lesson?.id || '',
        assignment_type: assignment.assignment_type || 'essay',
        total_points: assignment.total_points ?? '',
        due_date: toInputDate(assignment.due_date) || '',
        is_published: assignment.is_published || false,
        time_limit_minutes: assignment.time_limit_minutes ?? '',
        questions: assignment.questions || [],
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [assignment, isOpen])

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
        total_points: form.total_points !== '' ? Number(form.total_points) : undefined,
        time_limit_minutes: form.time_limit_minutes !== '' ? Number(form.time_limit_minutes) : undefined,
        lesson_id: form.lesson_id || undefined,
      }
      if (isEdit) {
        await assignmentsService.update(assignment.id, payload)
        success('Cập nhật bài tập thành công')
      } else {
        await assignmentsService.create(payload)
        success('Thêm bài tập thành công')
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
      title={isEdit ? 'Chỉnh sửa bài tập' : 'Thêm bài tập mới'}
      size="xl"
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
            placeholder="Tên bài tập"
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
            label="Bài học (tùy chọn)"
            name="lesson_id"
            value={form.lesson_id}
            onChange={handleChange}
            options={lessonOptions}
            placeholder="Chọn bài học"
          />
          <Select
            label="Loại bài tập"
            name="assignment_type"
            value={form.assignment_type}
            onChange={handleChange}
            options={[
              { value: 'essay', label: 'Tự luận' },
              { value: 'multiple_choice', label: 'Trắc nghiệm' },
              { value: 'mixed', label: 'Hỗn hợp' },
            ]}
          />
          <Input
            label="Tổng điểm"
            name="total_points"
            type="number"
            value={form.total_points}
            onChange={handleChange}
            placeholder="100"
          />
          <Input
            label="Hạn nộp"
            name="due_date"
            type="date"
            value={form.due_date}
            onChange={handleChange}
          />
          <Input
            label="Thời gian làm bài (phút)"
            name="time_limit_minutes"
            type="number"
            value={form.time_limit_minutes}
            onChange={handleChange}
            placeholder="60"
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

        {/* Question builder */}
        <div className="pt-4 border-t border-gray-100">
          <QuestionBuilder
            questions={form.questions}
            onChange={(questions) => setForm((prev) => ({ ...prev, questions }))}
          />
        </div>
      </form>
    </Modal>
  )
}
