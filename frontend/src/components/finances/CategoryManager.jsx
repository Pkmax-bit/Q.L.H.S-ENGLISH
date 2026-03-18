import { useState, useContext, useCallback } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import LoadingSpinner from '../common/LoadingSpinner'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import financesService from '../../services/finances.service'
import { validateForm, required } from '../../utils/validators'

const initialForm = {
  name: '',
  type: 'income',
  description: '',
}

export default function CategoryManager() {
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchCategories = useCallback(() => financesService.getCategories(), [])
  const { data: categoriesData, loading: categoriesLoading, execute: reload } = useFetch(fetchCategories)
  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.categories || []

  const handleEdit = (cat) => {
    setSelected(cat)
    setForm({
      name: cat.name || '',
      type: cat.type || 'income',
      description: cat.description || '',
    })
    setErrors({})
    setShowForm(true)
  }

  const handleDelete = (cat) => {
    setSelected(cat)
    setShowDelete(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên danh mục')],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      if (selected) {
        await financesService.updateCategory(selected._id || selected.id, form)
        success('Cập nhật danh mục thành công')
      } else {
        await financesService.createCategory(form)
        success('Thêm danh mục thành công')
      }
      setShowForm(false)
      setSelected(null)
      setForm(initialForm)
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await financesService.deleteCategory(selected._id || selected.id)
      success('Xóa danh mục thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa danh mục thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{categories.length} danh mục</p>
        <Button
          size="sm"
          icon={Plus}
          onClick={() => { setSelected(null); setForm(initialForm); setErrors({}); setShowForm(true) }}
        >
          Thêm danh mục
        </Button>
      </div>

      {categoriesLoading ? (
        <LoadingSpinner />
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Chưa có danh mục nào</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tên</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Loại</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mô tả</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id || cat.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                  <td className="px-4 py-3 font-medium text-gray-700">{cat.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={cat.type || 'income'} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cat.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form inline */}
      {showForm && (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            {selected ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Tên danh mục"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Học phí"
                required
              />
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
            </div>
            <Input
              label="Mô tả"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Mô tả danh mục..."
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} loading={loading} size="sm">
                {selected ? 'Cập nhật' : 'Thêm'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowForm(false); setSelected(null) }}
                disabled={loading}
              >
                Hủy
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa danh mục"
        message={`Bạn có chắc chắn muốn xóa danh mục "${selected?.name}"?`}
      />
    </div>
  )
}
