import { useState, useEffect, useCallback, useContext } from 'react'
import {
  Library, Plus, Search, Pencil, Trash2, Image as ImageIcon, Music, ChevronLeft, ChevronRight,
  Copy, Loader2,
} from 'lucide-react'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import Input from '../components/common/Input'
import Select from '../components/common/Select'
import Table from '../components/common/Table'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { ToastContext } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import questionBankService from '../services/questionBank.service'

const TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'essay', label: 'Tự luận' },
]

function parseOptionsText(text) {
  const t = (text || '').trim()
  if (!t) return null
  try {
    const parsed = JSON.parse(t)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function optionsToText(options) {
  if (!options || !Array.isArray(options)) return '[]'
  return JSON.stringify(options, null, 2)
}

function emptyForm() {
  return {
    label: '',
    question_text: '',
    question_type: 'multiple_choice',
    optionsText: JSON.stringify(['A', 'B', 'C', 'D'], null, 2),
    correct_answer: '',
    points: 1,
    file_url: '',
    youtube_url: '',
    file_storage_path: '',
    audio_storage_path: '',
    tagsStr: '',
    skill: '',
  }
}

export default function QuestionBankPage() {
  const { success, error: toastError } = useContext(ToastContext)
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [skill, setSkill] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, skill])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await questionBankService.getAll({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        skill: skill.trim() || undefined,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      })
      const body = res.data
      setItems(Array.isArray(body.data) ? body.data : [])
      setPagination(body.pagination || null)
    } catch (err) {
      toastError(err.response?.data?.message || 'Không tải được ngân hàng câu hỏi')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, skill, toastError])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      label: row.label || '',
      question_text: row.question_text || '',
      question_type: row.question_type || 'multiple_choice',
      optionsText: optionsToText(row.options),
      correct_answer: row.correct_answer ?? '',
      points: row.points ?? 1,
      file_url: row.file_url || '',
      youtube_url: row.youtube_url || '',
      file_storage_path: row.file_storage_path || '',
      audio_storage_path: row.audio_storage_path || '',
      tagsStr: Array.isArray(row.tags) ? row.tags.join(', ') : '',
      skill: row.skill || '',
    })
    setModalOpen(true)
  }

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingImage(true)
    try {
      const res = await questionBankService.upload(file)
      const payload = res.data?.data || res.data
      setForm((f) => ({
        ...f,
        file_url: payload.url,
        file_storage_path: payload.storage_path,
      }))
      success('Đã tải ảnh lên Supabase Storage')
    } catch (err) {
      toastError(err.response?.data?.message || err.message || 'Upload ảnh thất bại')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleUploadAudio = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAudio(true)
    try {
      const res = await questionBankService.upload(file)
      const payload = res.data?.data || res.data
      setForm((f) => ({
        ...f,
        youtube_url: payload.url,
        audio_storage_path: payload.storage_path,
      }))
      success('Đã tải âm thanh lên Supabase Storage')
    } catch (err) {
      toastError(err.response?.data?.message || err.message || 'Upload âm thanh thất bại')
    } finally {
      setUploadingAudio(false)
    }
  }

  const clearImage = () => {
    setForm((f) => ({ ...f, file_url: '', file_storage_path: '' }))
  }

  const clearAudio = () => {
    setForm((f) => ({ ...f, youtube_url: '', audio_storage_path: '' }))
  }

  const submitForm = async () => {
    const options = parseOptionsText(form.optionsText)
    if (form.question_type === 'multiple_choice' && (!options || options.length === 0)) {
      toastError('Trắc nghiệm cần mảng options hợp lệ (JSON)')
      return
    }

    const tags = form.tagsStr
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      label: form.label || null,
      question_text: form.question_text,
      question_type: form.question_type,
      options: form.question_type === 'multiple_choice' ? options : null,
      correct_answer: form.correct_answer || null,
      points: Number(form.points) || 1,
      file_url: form.file_url || null,
      youtube_url: form.youtube_url || null,
      file_storage_path: form.file_storage_path || null,
      audio_storage_path: form.audio_storage_path || null,
      tags,
      skill: form.skill || null,
    }

    setSaving(true)
    try {
      if (editingId) {
        await questionBankService.update(editingId, payload)
        success('Đã cập nhật')
      } else {
        await questionBankService.create(payload)
        success('Đã thêm vào ngân hàng')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toastError(err.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await questionBankService.remove(deleteTarget.id)
      success('Đã xóa')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toastError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const copyPayload = (row) => {
    const snippet = {
      question_text: row.question_text,
      question_type: row.question_type,
      options: row.options,
      correct_answer: row.correct_answer,
      points: row.points,
      file_url: row.file_url,
      youtube_url: row.youtube_url,
    }
    navigator.clipboard.writeText(JSON.stringify(snippet, null, 2))
    success('Đã sao chép JSON câu hỏi')
  }

  const canEditRow = (row) => isAdmin || row.created_by === user?.id

  const columns = [
    {
      key: 'label',
      label: 'Nhãn',
      accessor: (row) => row.label || '—',
    },
    {
      key: 'question_text',
      label: 'Nội dung',
      accessor: (row) => {
        const t = row.question_text || ''
        return t.length > 80 ? `${t.slice(0, 80)}…` : t || '—'
      },
    },
    {
      key: 'question_type',
      label: 'Loại',
      accessor: (row) => (row.question_type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'),
    },
    {
      key: 'skill',
      label: 'Kỹ năng / Part',
      accessor: (row) => row.skill || '—',
    },
    {
      key: 'media',
      label: 'Media',
      sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          {row.file_url && (
            <span title="Có ảnh" className="text-emerald-600">
              <ImageIcon className="h-4 w-4" />
            </span>
          )}
          {row.youtube_url && (
            <span title="Có âm thanh / video" className="text-indigo-600">
              <Music className="h-4 w-4" />
            </span>
          )}
          {!row.file_url && !row.youtube_url && <span className="text-gray-300">—</span>}
        </div>
      ),
    },
    {
      key: 'created_by_name',
      label: 'Người tạo',
      accessor: (row) => row.created_by_name || '—',
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => copyPayload(row)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            title="Sao chép JSON"
          >
            <Copy className="h-4 w-4" />
          </button>
          {canEditRow(row) && (
            <>
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(row)}
                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  const totalPages = pagination?.totalPages || 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Library className="h-8 w-8 text-primary-600" />
            Ngân hàng câu hỏi
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Lưu câu hỏi và file âm thanh / ảnh trên Supabase Storage (bucket{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">question-bank</code>).
          </p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Thêm câu hỏi
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Tìm theo nhãn hoặc nội dung…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>
        <input
          type="text"
          placeholder="Lọc kỹ năng / Part…"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="sm:w-56 px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={items}
          searchable={false}
          pageSize={100}
          emptyMessage="Chưa có câu hỏi nào."
        />
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Trang {pagination.page} / {totalPages} · {pagination.total} mục
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input
            label="Nhãn ngắn (tuỳ chọn)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung câu hỏi</label>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <Select
            label="Loại"
            value={form.question_type}
            onChange={(e) => setForm((f) => ({ ...f, question_type: e.target.value }))}
            options={TYPE_OPTIONS}
          />
          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Các lựa chọn (JSON mảng chuỗi)
              </label>
              <textarea
                value={form.optionsText}
                onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
                rows={6}
                className="w-full font-mono text-xs px-3 py-2 border border-gray-200 rounded-xl"
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Đáp án đúng / gợi ý"
              value={form.correct_answer}
              onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))}
            />
            <Input
              label="Điểm"
              type="number"
              min={1}
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kỹ năng / Part (tuỳ chọn)"
              value={form.skill}
              onChange={(e) => setForm((f) => ({ ...f, skill: e.target.value }))}
              placeholder="VD: Part 3, Listening…"
            />
            <Input
              label="Tags (phân tách bằng dấu phẩy)"
              value={form.tagsStr}
              onChange={(e) => setForm((f) => ({ ...f, tagsStr: e.target.value }))}
            />
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/80">
            <p className="text-sm font-medium text-gray-800">Ảnh đính kèm (Supabase bucket)</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm hover:bg-gray-50">
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  Tải ảnh lên
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} disabled={uploadingImage} />
              </label>
              {(form.file_url || form.file_storage_path) && (
                <Button type="button" variant="secondary" size="sm" onClick={clearImage}>
                  Xóa ảnh
                </Button>
              )}
            </div>
            {form.file_url && (
              <p className="text-xs text-gray-600 break-all">{form.file_url}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/80">
            <p className="text-sm font-medium text-gray-800">Âm thanh / video (URL hoặc upload lên bucket)</p>
            <Input
              label="URL (YouTube hoặc file âm thanh công khai)"
              value={form.youtube_url}
              onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
              placeholder="https://..."
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm hover:bg-gray-50">
                  {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
                  Tải file âm thanh lên
                </span>
                <input type="file" accept="audio/*" className="hidden" onChange={handleUploadAudio} disabled={uploadingAudio} />
              </label>
              {form.audio_storage_path && (
                <Button type="button" variant="secondary" size="sm" onClick={clearAudio}>
                  Xóa file đã upload
                </Button>
              )}
            </div>
            {form.audio_storage_path && (
              <p className="text-xs text-gray-500">Storage path: {form.audio_storage_path}</p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa câu hỏi?"
        message={
          deleteTarget
            ? `Xóa "${(deleteTarget.label || deleteTarget.question_text || '').slice(0, 60)}…"? File trên Storage cũng sẽ bị xóa.`
            : ''
        }
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
