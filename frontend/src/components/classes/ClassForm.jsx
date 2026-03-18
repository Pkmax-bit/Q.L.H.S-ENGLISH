import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import classesService from '../../services/classes.service'
import teachersService from '../../services/teachers.service'
import { validateForm, required, positiveNumber } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  name: '',
  teacher_id: '',
  max_students: '',
  status: 'active',
  start_date: '',
  end_date: '',
  description: '',
}

export default function ClassForm({ isOpen, onClose, classData, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!classData

  const fetchTeachers = useCallback(() => teachersService.getAll(), [])
  const { data: teachersData } = useFetch(fetchTeachers)

  const teachers = Array.isArray(teachersData) ? teachersData : teachersData?.teachers || []
  const teacherOptions = teachers.map((t) => ({ value: t.id, label: t.full_name }))

  useEffect(() => {
    if (classData) {
      setForm({
        name: classData.name || '',
        teacher_id: classData.teacher_id || classData.teacher?.id || '',
        max_students: classData.max_students ?? '',
        status: classData.status || 'active',
        start_date: toInputDate(classData.start_date) || '',
        end_date: toInputDate(classData.end_date) || '',
        description: classData.description || '',
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
      max_students: [() => positiveNumber(form.max_students, 'Sĩ số tối đa')],
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
        max_students: form.max_students ? Number(form.max_students) : undefined,
        teacher_id: form.teacher_id || undefined,
      }
      if (isEdit) {
        await classesService.update(classData.id, payload)
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
            label="Giáo viên"
            name="teacher_id"
            value={form.teacher_id}
            onChange={handleChange}
            options={teacherOptions}
            placeholder="Chọn giáo viên"
          />
          <Input
            label="Sĩ số tối đa"
            name="max_students"
            type="number"
            value={form.max_students}
            onChange={handleChange}
            error={errors.max_students}
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
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
          />
          <Input
            label="Ngày kết thúc"
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
          />
        </div>
        <Input
          label="Mô tả"
          name="description"
          type="textarea"
          value={form.description}
          onChange={handleChange}
          placeholder="Mô tả lớp học..."
          rows={3}
        />
      </form>
    </Modal>
  )
}
