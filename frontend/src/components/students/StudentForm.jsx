import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import studentsService from '../../services/students.service'
import { validateForm, required, email, phone } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  parentName: '',
  parentPhone: '',
  status: 'active',
  notes: '',
}

export default function StudentForm({ isOpen, onClose, student, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!student

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        dateOfBirth: toInputDate(student.dateOfBirth) || '',
        gender: student.gender || '',
        address: student.address || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        status: student.status || 'active',
        notes: student.notes || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [student, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Họ tên')],
      email: [() => email(form.email)],
      phone: [() => phone(form.phone)],
      parentPhone: [() => phone(form.parentPhone)],
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
        await studentsService.update(student._id || student.id, form)
        success('Cập nhật học sinh thành công')
      } else {
        await studentsService.create(form)
        success('Thêm học sinh thành công')
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
      title={isEdit ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Cập nhật' : 'Thêm mới'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Họ tên" name="name" value={form.name} onChange={handleChange} error={errors.name} placeholder="Nguyễn Văn A" required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} placeholder="example@email.com" />
          <Input label="Số điện thoại" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="0901234567" />
          <Input label="Ngày sinh" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
          <Select
            label="Giới tính"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            placeholder="Chọn giới tính"
            options={[
              { value: 'male', label: 'Nam' },
              { value: 'female', label: 'Nữ' },
              { value: 'other', label: 'Khác' },
            ]}
          />
          <Select
            label="Trạng thái"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: 'active', label: 'Đang học' },
              { value: 'inactive', label: 'Nghỉ học' },
            ]}
          />
          <Input label="Phụ huynh" name="parentName" value={form.parentName} onChange={handleChange} placeholder="Tên phụ huynh" />
          <Input label="SĐT phụ huynh" name="parentPhone" value={form.parentPhone} onChange={handleChange} error={errors.parentPhone} placeholder="0901234567" />
        </div>
        <Input label="Địa chỉ" name="address" value={form.address} onChange={handleChange} placeholder="Địa chỉ..." />
        <Input label="Ghi chú" name="notes" type="textarea" value={form.notes} onChange={handleChange} placeholder="Ghi chú thêm..." rows={3} />
      </form>
    </Modal>
  )
}
