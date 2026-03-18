import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import classesService from '../../services/classes.service'
import subjectsService from '../../services/subjects.service'
import teachersService from '../../services/teachers.service'
import { validateForm, required, positiveNumber } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  name: '',
  subjectId: '',
  teacherId: '',
  maxStudents: '',
  status: 'active',
  startDate: '',
  endDate: '',
  notes: '',
}

export default function ClassForm({ isOpen, onClose, classData, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!classData

  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const fetchTeachers = useCallback(() => teachersService.getAll(), [])
  const { data: subjectsData } = useFetch(fetchSubjects)
  const { data: teachersData } = useFetch(fetchTeachers)

  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []
  const teachers = Array.isArray(teachersData) ? teachersData : teachersData?.teachers || []

  const subjectOptions = subjects.map((s) => ({ value: s._id || s.id, label: s.name }))
  const teacherOptions = teachers.map((t) => ({ value: t._id || t.id, label: t.name }))

  useEffect(() => {
    if (classData) {
      setForm({
        name: classData.name || '',
        subjectId: classData.subjectId || classData.subject?._id || classData.subject?.id || '',
        teacherId: classData.teacherId || classData.teacher?._id || classData.teacher?.id || '',
        maxStudents: classData.maxStudents ?? '',
        status: classData.status || 'active',
        startDate: toInputDate(classData.startDate) || '',
        endDate: toInputDate(classData.endDate) || '',
        notes: classData.notes || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [classData, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên lớp')],
      subjectId: [() => required(form.subjectId, 'Môn học')],
      maxStudents: [() => positiveNumber(form.maxStudents, 'Sĩ số tối đa')],
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
        maxStudents: form.maxStudents ? Number(form.maxStudents) : undefined,
      }
      if (isEdit) {
        await classesService.update(classData._id || classData.id, payload)
        success('Cập nhật lớp học thành công')
      } else {
        await classesService.create(payload)
        success('Thêm lớp học thành công')
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
      title={isEdit ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
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
            label="Tên lớp"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Lớp Toán A1"
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
            label="Giáo viên chủ nhiệm"
            name="teacherId"
            value={form.teacherId}
            onChange={handleChange}
            options={teacherOptions}
            placeholder="Chọn giáo viên"
          />
          <Input
            label="Sĩ số tối đa"
            name="maxStudents"
            type="number"
            value={form.maxStudents}
            onChange={handleChange}
            error={errors.maxStudents}
            placeholder="30"
          />
          <Select
            label="Trạng thái"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: 'active', label: 'Hoạt động' },
              { value: 'inactive', label: 'Ngừng hoạt động' },
              { value: 'completed', label: 'Hoàn thành' },
            ]}
          />
          <Input
            label="Ngày bắt đầu"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
          />
          <Input
            label="Ngày kết thúc"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
          />
        </div>
        <Input
          label="Ghi chú"
          name="notes"
          type="textarea"
          value={form.notes}
          onChange={handleChange}
          placeholder="Ghi chú thêm..."
          rows={3}
        />
      </form>
    </Modal>
  )
}
