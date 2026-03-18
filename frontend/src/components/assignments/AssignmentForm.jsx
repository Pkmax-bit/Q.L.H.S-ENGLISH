import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import QuestionBuilder from './QuestionBuilder'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import assignmentsService from '../../services/assignments.service'
import subjectsService from '../../services/subjects.service'
import { validateForm, required } from '../../utils/validators'

const initialForm = {
  title: '',
  subjectId: '',
  type: 'essay',
  content: '',
  youtube_url: '',
  drive_url: '',
  total_points: '',
  questions: [],
}

export default function AssignmentForm({ isOpen, onClose, assignment, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!assignment

  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const { data: subjectsData } = useFetch(fetchSubjects)
  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []
  const subjectOptions = subjects.map((s) => ({ value: s._id || s.id, label: s.name }))

  useEffect(() => {
    if (assignment) {
      setForm({
        title: assignment.title || '',
        subjectId: assignment.subjectId || assignment.subject?._id || assignment.subject?.id || '',
        type: assignment.type || 'essay',
        content: assignment.content || '',
        youtube_url: assignment.youtube_url || assignment.youtubeUrl || '',
        drive_url: assignment.drive_url || assignment.driveUrl || '',
        total_points: assignment.total_points ?? assignment.totalPoints ?? '',
        questions: assignment.questions || [],
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [assignment, isOpen])

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
        total_points: form.total_points !== '' ? Number(form.total_points) : undefined,
      }
      if (isEdit) {
        await assignmentsService.update(assignment._id || assignment.id, payload)
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
            label="Môn học"
            name="subjectId"
            value={form.subjectId}
            onChange={handleChange}
            options={subjectOptions}
            placeholder="Chọn môn học"
            error={errors.subjectId}
            required
          />
          <Select
            label="Loại bài tập"
            name="type"
            value={form.type}
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
          label="Nội dung / Hướng dẫn"
          name="content"
          type="textarea"
          value={form.content}
          onChange={handleChange}
          placeholder="Mô tả bài tập, hướng dẫn làm bài..."
          rows={3}
        />

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
