import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import financesService from '../../services/finances.service'
import { validateForm, required, positiveNumber } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  type: 'income',
  categoryId: '',
  amount: '',
  description: '',
  payment_date: '',
  payment_method: 'cash',
  reference_type: '',
  reference_id: '',
}

export default function FinanceForm({ isOpen, onClose, finance, categories = [], onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!finance

  const categoryOptions = categories.map((c) => ({ value: c._id || c.id, label: c.name }))

  useEffect(() => {
    if (finance) {
      setForm({
        type: finance.type || 'income',
        categoryId: finance.categoryId || finance.category?._id || finance.category?.id || '',
        amount: finance.amount ?? '',
        description: finance.description || '',
        payment_date: toInputDate(finance.payment_date || finance.paymentDate) || '',
        payment_method: finance.payment_method || finance.paymentMethod || 'cash',
        reference_type: finance.reference_type || finance.referenceType || '',
        reference_id: finance.reference_id || finance.referenceId || '',
      })
    } else {
      setForm({
        ...initialForm,
        payment_date: new Date().toISOString().split('T')[0],
      })
    }
    setErrors({})
  }, [finance, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      amount: [
        () => required(form.amount, 'Số tiền'),
        () => positiveNumber(form.amount, 'Số tiền'),
      ],
      payment_date: [() => required(form.payment_date, 'Ngày thanh toán')],
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
        amount: Number(form.amount),
      }
      if (isEdit) {
        await financesService.update(finance._id || finance.id, payload)
        success('Cập nhật giao dịch thành công')
      } else {
        await financesService.create(payload)
        success('Thêm giao dịch thành công')
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
      title={isEdit ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}
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
          <Select
            label="Loại"
            name="type"
            value={form.type}
            onChange={handleChange}
            options={[
              { value: 'income', label: 'Thu' },
              { value: 'expense', label: 'Chi' },
            ]}
          />
          <Select
            label="Danh mục"
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            options={categoryOptions}
            placeholder="Chọn danh mục"
          />
          <Input
            label="Số tiền"
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            error={errors.amount}
            placeholder="1000000"
            required
          />
          <Input
            label="Ngày thanh toán"
            name="payment_date"
            type="date"
            value={form.payment_date}
            onChange={handleChange}
            error={errors.payment_date}
            required
          />
          <Select
            label="Phương thức thanh toán"
            name="payment_method"
            value={form.payment_method}
            onChange={handleChange}
            options={[
              { value: 'cash', label: 'Tiền mặt' },
              { value: 'bank_transfer', label: 'Chuyển khoản' },
              { value: 'card', label: 'Thẻ' },
              { value: 'other', label: 'Khác' },
            ]}
          />
          <Input
            label="Loại tham chiếu"
            name="reference_type"
            value={form.reference_type}
            onChange={handleChange}
            placeholder="student, class..."
          />
          <Input
            label="ID tham chiếu"
            name="reference_id"
            value={form.reference_id}
            onChange={handleChange}
            placeholder="ID đối tượng liên quan"
          />
        </div>
        <Input
          label="Mô tả"
          name="description"
          type="textarea"
          value={form.description}
          onChange={handleChange}
          placeholder="Mô tả giao dịch..."
          rows={3}
        />
      </form>
    </Modal>
  )
}
