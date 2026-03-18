import { useState, useEffect, useContext, useCallback } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import schedulesService from '../../services/schedules.service'
import classesService from '../../services/classes.service'
import { validateForm, required } from '../../utils/validators'

const initialForm = {
  classId: '',
  name: '',
  start_date: '',
  end_date: '',
}

export default function ScheduleForm({ isOpen, onClose, schedule, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!schedule

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map((c) => ({ value: c._id || c.id, label: c.name }))

  useEffect(() => {
    if (schedule) {
      setForm({
        classId: schedule.classId || schedule.class?._id || schedule.class?.id || '',
        name: schedule.name || '',
        start_date: schedule.start_date || schedule.startDate || '',
        end_date: schedule.end_date || schedule.endDate || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [schedule, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên thời khóa biểu')],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      if (isEdit) {
        await schedulesService.update(schedule._id || schedule.id, form)
        success('Cập nhật thời khóa biểu thành công')
      } else {
        await schedulesService.create(form)
        success('Thêm thời khóa biểu thành công')
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
      title={isEdit ? 'Chỉnh sửa thời khóa biểu' : 'Thêm thời khóa biểu mới'}
      size="md"
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
        <Input
          label="Tên thời khóa biểu"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="TKB Học kỳ 1 - 2024"
          required
        />
        <Select
          label="Lớp học"
          name="classId"
          value={form.classId}
          onChange={handleChange}
          options={classOptions}
          placeholder="Chọn lớp (tùy chọn)"
        />
        <div className="grid grid-cols-2 gap-4">
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
      </form>
    </Modal>
  )
}
