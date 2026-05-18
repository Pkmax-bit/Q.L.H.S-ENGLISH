import { useState, useCallback, useContext, useMemo, useEffect } from 'react'
import {
  Package, Plus, Pencil, Trash2, BookOpen, Search, X, ChevronDown,
  ChevronRight, GripVertical, Check,
} from 'lucide-react'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import { ToastContext } from '../context/ToastContext'
import lessonBundlesService from '../services/lessonBundles.service'
import lessonsService from '../services/lessons.service'
import subjectsService from '../services/subjects.service'

export default function LessonBundlesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { success, error: showError } = useContext(ToastContext)

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [showAddItems, setShowAddItems] = useState(false)
  const [addItemsTarget, setAddItemsTarget] = useState(null)

  const fetchBundles = useCallback(
    () => lessonBundlesService.getAll({ search }),
    [search],
  )
  const { data, loading, execute: reload } = useFetch(fetchBundles, [search])
  const bundles = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.bundles || data?.data || []
  }, [data])

  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const { data: subjectsData } = useFetch(fetchSubjects)
  const subjects = useMemo(() => {
    if (Array.isArray(subjectsData)) return subjectsData
    return subjectsData?.subjects || subjectsData?.data || []
  }, [subjectsData])

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  const handleEdit = (b) => {
    setEditing(b)
    setShowForm(true)
  }

  const handleDelete = (b) => {
    setDeleteTarget(b)
    setShowDelete(true)
  }

  const confirmDelete = async () => {
    try {
      await lessonBundlesService.delete(deleteTarget.id)
      success('Đã xóa bộ bài học')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setShowDelete(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Bộ bài học
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gom nhiều bài học (bài mẫu hoặc bài đã có) thành một bộ. Khi áp
            dụng vào lớp, bạn có thể chọn cả bộ hoặc chỉ vài bài trong bộ.
          </p>
        </div>
        <Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true) }}>
          Tạo bộ mới
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bộ bài học..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bundles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có bộ bài học nào</p>
          <p className="text-sm text-gray-400 mt-1">
            Bấm <strong>"Tạo bộ mới"</strong> để gom các bài học thành một bộ.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bundles.map((b) => (
            <BundleRow
              key={b.id}
              bundle={b}
              expanded={!!expanded[b.id]}
              onToggle={() => toggleExpand(b.id)}
              onEdit={() => handleEdit(b)}
              onDelete={() => handleDelete(b)}
              onAddItems={() => {
                setAddItemsTarget(b)
                setShowAddItems(true)
              }}
              onItemsChanged={reload}
              canDelete={isAdmin}
            />
          ))}
        </div>
      )}

      <BundleForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        bundle={editing}
        subjects={subjects}
        onSuccess={() => { setShowForm(false); setEditing(null); reload() }}
      />

      <AddLessonsToBundleModal
        isOpen={showAddItems}
        onClose={() => { setShowAddItems(false); setAddItemsTarget(null) }}
        bundle={addItemsTarget}
        onAdded={() => { setShowAddItems(false); setAddItemsTarget(null); reload() }}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Xóa bộ bài học"
        message={`Xóa bộ "${deleteTarget?.name}"? Các bài học bên trong KHÔNG bị xóa, chỉ liên kết bị gỡ.`}
      />
    </div>
  )
}

/* ============== Bundle row (expandable) ============== */
function BundleRow({
  bundle, expanded, onToggle, onEdit, onDelete, onAddItems, onItemsChanged, canDelete,
}) {
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true)
    try {
      const res = await lessonBundlesService.getById(bundle.id)
      setDetail(res.data?.data ?? res.data)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [bundle.id])

  const handleToggle = () => {
    onToggle()
    if (!expanded && !detail) loadDetail()
  }

  const handleRemoveItem = async (lessonId) => {
    try {
      await lessonBundlesService.removeItem(bundle.id, lessonId)
      success('Đã gỡ bài khỏi bộ')
      loadDetail()
      onItemsChanged?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Gỡ thất bại')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        <button
          onClick={handleToggle}
          className="p-1 rounded hover:bg-gray-200 text-gray-500"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{bundle.name}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {bundle.item_count} bài
            </span>
            {bundle.subject_name && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {bundle.subject_name}
              </span>
            )}
          </div>
          {bundle.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bundle.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="outline" icon={Plus} onClick={onAddItems}>
            Thêm bài
          </Button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-blue-100 text-blue-500"
            title="Sửa"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-100 text-red-500"
              title="Xóa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          {loadingDetail ? (
            <LoadingSpinner />
          ) : !detail || (detail.items || []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Chưa có bài nào trong bộ. Bấm "Thêm bài" để chọn từ kho bài học.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
              {detail.items.map((it, idx) => (
                <li key={it.item_id} className="flex items-center gap-3 px-3 py-2">
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <span className="text-xs text-gray-400 w-6">#{idx + 1}</span>
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{it.title}</p>
                    <p className="text-xs text-gray-400">
                      {it.content_type}
                      {it.is_template ? ' • Mẫu' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(it.id)}
                    className="p-1.5 rounded hover:bg-red-100 text-red-400"
                    title="Gỡ khỏi bộ"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ============== Bundle form (create/edit) ============== */
function BundleForm({ isOpen, onClose, bundle, subjects, onSuccess }) {
  const isEdit = !!bundle
  const { success, error: showError } = useContext(ToastContext)
  const [form, setForm] = useState({ name: '', description: '', subject_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: bundle?.name || '',
        description: bundle?.description || '',
        subject_id: bundle?.subject_id || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bundle?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showError('Tên bộ là bắt buộc')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        subject_id: form.subject_id || null,
      }
      if (isEdit) {
        await lessonBundlesService.update(bundle.id, payload)
        success('Đã cập nhật bộ')
      } else {
        await lessonBundlesService.create(payload)
        success('Đã tạo bộ')
      }
      onSuccess?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const subjectOptions = subjects.map((s) => ({
    value: s.id,
    label: s.name + (s.code ? ` (${s.code})` : ''),
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa bộ bài học' : 'Tạo bộ bài học mới'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Cập nhật' : 'Tạo'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên bộ"
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="VD: Tiếng Anh giao tiếp 1A"
          required
        />
        <Select
          label="Môn học (tùy chọn)"
          name="subject_id"
          value={form.subject_id}
          onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          options={subjectOptions}
          placeholder="— Không gắn môn —"
        />
        <Input
          label="Mô tả"
          name="description"
          type="textarea"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Ghi chú về bộ này..."
        />
      </form>
    </Modal>
  )
}

/* ============== Add lessons to bundle (picker) ============== */
function AddLessonsToBundleModal({ isOpen, onClose, bundle, onAdded }) {
  const { success, error: showError } = useContext(ToastContext)
  const [search, setSearch] = useState('')
  const [onlyTemplates, setOnlyTemplates] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [adding, setAdding] = useState(false)
  const [existingIds, setExistingIds] = useState(new Set())

  const fetchLessons = useCallback(() => {
    const params = { limit: 200 }
    if (search) params.search = search
    if (onlyTemplates) params.is_template = true
    return lessonsService.getAll(params)
  }, [search, onlyTemplates])
  const { data, loading } = useFetch(fetchLessons, [search, onlyTemplates], isOpen)
  const lessons = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.lessons || data?.data || []
  }, [data])

  useEffect(() => {
    if (!isOpen || !bundle?.id) return
    lessonBundlesService
      .getById(bundle.id)
      .then((res) => {
        const d = res.data?.data ?? res.data
        setExistingIds(new Set((d?.items || []).map((i) => i.id)))
      })
      .catch(() => setExistingIds(new Set()))
    setSelectedIds([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bundle?.id])

  const toggle = (id) => {
    if (existingIds.has(id)) return
    setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      showError('Chọn ít nhất 1 bài')
      return
    }
    setAdding(true)
    try {
      const res = await lessonBundlesService.addItems(bundle.id, selectedIds)
      const added = res.data?.data?.added ?? res.data?.added ?? selectedIds.length
      success(`Đã thêm ${added} bài vào bộ`)
      onAdded?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Thêm thất bại')
    } finally {
      setAdding(false)
    }
  }

  if (!bundle) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thêm bài vào bộ: ${bundle.name}`}
      size="2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={adding}>Hủy</Button>
          <Button
            onClick={handleAdd}
            loading={adding}
            disabled={selectedIds.length === 0}
            icon={Plus}
          >
            Thêm {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bài học..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyTemplates}
              onChange={(e) => setOnlyTemplates(e.target.checked)}
              className="rounded"
            />
            Chỉ hiện bài mẫu
          </label>
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-1">
          {loading ? (
            <LoadingSpinner />
          ) : lessons.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Không có bài học nào.</p>
          ) : (
            lessons.map((l) => {
              const inBundle = existingIds.has(l.id)
              const isSelected = selectedIds.includes(l.id)
              return (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => toggle(l.id)}
                  disabled={inBundle}
                  className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                    inBundle
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}
                  >
                    {(isSelected || inBundle) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <p className="text-sm font-medium text-gray-800 truncate">{l.title}</p>
                      {l.is_template && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Mẫu
                        </span>
                      )}
                      {inBundle && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Đã có trong bộ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {l.content_type}
                      {l.class_name ? ` • ${l.class_name}` : ''}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
