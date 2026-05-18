import { useState, useContext, useCallback, useMemo, useEffect } from 'react'
import {
  Copy, Check, Search, BookOpen, FileText, Package,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import templatesService from '../../services/templates.service'
import lessonBundlesService from '../../services/lessonBundles.service'

/**
 * Modal chọn mẫu bài học / bài tập / bộ bài học để áp dụng vào lớp.
 * Props:
 *   isOpen, onClose, type ('lesson' | 'assignment'), classId, className?, onApplied?
 */
export default function ApplyTemplatesModal({
  isOpen,
  onClose,
  type = 'lesson',
  classId,
  className,
  onApplied,
}) {
  const isLesson = type === 'lesson'
  // Khi là bài học: cho phép chọn giữa "templates" và "bundles"
  const [mode, setMode] = useState('templates') // 'templates' | 'bundles'

  useEffect(() => {
    if (!isOpen) {
      setMode('templates')
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Áp dụng ${isLesson ? 'bài học' : 'bài tập'} vào lớp`}
      size="2xl"
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Áp dụng vào lớp{' '}
          <span className="font-semibold text-gray-800">
            {className || '— lớp đã chọn —'}
          </span>
          . Bản sao mới mặc định là <em>Nháp</em>; bạn có thể chỉnh và xuất bản
          sau.
        </p>

        {isLesson && (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setMode('templates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'templates'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Bài học mẫu
            </button>
            <button
              type="button"
              onClick={() => setMode('bundles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'bundles'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="h-4 w-4" /> Bộ bài học
            </button>
          </div>
        )}

        {!isLesson || mode === 'templates' ? (
          <TemplatePicker
            isLesson={isLesson}
            classId={classId}
            isOpen={isOpen}
            onApplied={onApplied}
            onClose={onClose}
          />
        ) : (
          <BundlePicker
            classId={classId}
            isOpen={isOpen}
            onApplied={onApplied}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  )
}

/* ================ Template picker (lesson/assignment) ================ */
function TemplatePicker({ isLesson, classId, isOpen, onApplied, onClose }) {
  const { success, error: showError } = useContext(ToastContext) || {}
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [applying, setApplying] = useState(false)

  const fetchTemplates = useCallback(() => {
    return isLesson
      ? templatesService.getLessonTemplates({ search })
      : templatesService.getAssignmentTemplates({ search })
  }, [isLesson, search])

  const { data, loading } = useFetch(fetchTemplates, [isLesson, search], isOpen)
  const items = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.lessons || data?.assignments || data?.data || []
  }, [data])

  useEffect(() => {
    if (!isOpen) setSelectedIds([])
  }, [isOpen])

  const toggle = (id) =>
    setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const handleApply = async () => {
    if (selectedIds.length === 0) {
      showError?.('Hãy chọn ít nhất 1 mẫu')
      return
    }
    setApplying(true)
    try {
      const fn = isLesson
        ? templatesService.applyLessonTemplates
        : templatesService.applyAssignmentTemplates
      const res = await fn({ template_ids: selectedIds, class_id: classId })
      const created = res.data?.data?.created ?? res.data?.created ?? selectedIds.length
      success?.(`Đã áp dụng ${created} ${isLesson ? 'bài học' : 'bài tập'} mẫu vào lớp`)
      setSelectedIds([])
      onApplied?.()
      onClose?.()
    } catch (err) {
      showError?.(err.response?.data?.message || 'Áp dụng mẫu thất bại')
    } finally {
      setApplying(false)
    }
  }

  const Icon = isLesson ? BookOpen : FileText
  const accent = isLesson
    ? 'border-blue-500 bg-blue-50/40'
    : 'border-purple-500 bg-purple-50/40'
  const checkboxAccent = isLesson
    ? 'bg-blue-600 border-blue-600'
    : 'bg-purple-600 border-purple-600'

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Tìm mẫu ${isLesson ? 'bài học' : 'bài tập'}...`}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() =>
              setSelectedIds(
                selectedIds.length === items.length
                  ? []
                  : items.map((i) => i.id),
              )
            }
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedIds.length === items.length
              ? 'Bỏ chọn tất cả'
              : `Chọn tất cả (${items.length})`}
          </button>
          {selectedIds.length > 0 && (
            <span className="text-gray-500">Đã chọn {selectedIds.length}</span>
          )}
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Icon className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có mẫu nào.</p>
            <p className="text-xs mt-1">
              Vào trang <strong>Mẫu bài giảng</strong> để đánh dấu bài học/bài
              tập là mẫu trước.
            </p>
          </div>
        ) : (
          items.map((it) => {
            const isSelected = selectedIds.includes(it.id)
            const qCount = it.assignment_questions?.length || 0
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? accent
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? checkboxAccent : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {it.title}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Mẫu
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {isLesson ? (
                      <>
                        {it.content_type && <span>📄 {it.content_type}</span>}
                        {it.youtube_url && <span>🎬 Video</span>}
                        {it.file_url && <span>📎 File</span>}
                        {it.drive_url && <span>📁 Drive</span>}
                      </>
                    ) : (
                      <>
                        <span>📝 {qCount} câu hỏi</span>
                        {it.total_points != null && (
                          <span>🎯 {it.total_points} điểm</span>
                        )}
                        {it.time_limit_minutes && (
                          <span>⏱️ {it.time_limit_minutes} phút</span>
                        )}
                        {it.assignment_type && (
                          <span className="text-purple-700">
                            {it.assignment_type}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onClose} disabled={applying}>
          Hủy
        </Button>
        <Button
          onClick={handleApply}
          loading={applying}
          disabled={selectedIds.length === 0}
          icon={Copy}
        >
          Áp dụng {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
        </Button>
      </div>
    </div>
  )
}

/* ================ Bundle picker (chỉ cho lesson) ================ */
function BundlePicker({ classId, isOpen, onApplied, onClose }) {
  const { success, error: showError } = useContext(ToastContext) || {}
  const [search, setSearch] = useState('')
  const [applying, setApplying] = useState(false)
  // Per-bundle state: { [bundleId]: { selectAll: bool, lessonIds: Set, items: [] } }
  const [bundleState, setBundleState] = useState({})
  const [expanded, setExpanded] = useState({})
  const [loadingDetail, setLoadingDetail] = useState({})

  const fetchBundles = useCallback(
    () => lessonBundlesService.getAll({ search }),
    [search],
  )
  const { data, loading } = useFetch(fetchBundles, [search], isOpen)
  const bundles = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.bundles || data?.data || []
  }, [data])

  useEffect(() => {
    if (!isOpen) {
      setBundleState({})
      setExpanded({})
    }
  }, [isOpen])

  const ensureDetail = async (bundleId) => {
    if (bundleState[bundleId]?.items) return
    setLoadingDetail((p) => ({ ...p, [bundleId]: true }))
    try {
      const res = await lessonBundlesService.getById(bundleId)
      const d = res.data?.data ?? res.data
      setBundleState((p) => ({
        ...p,
        [bundleId]: {
          ...(p[bundleId] || {}),
          items: d?.items || [],
        },
      }))
    } catch {
      setBundleState((p) => ({
        ...p,
        [bundleId]: { ...(p[bundleId] || {}), items: [] },
      }))
    } finally {
      setLoadingDetail((p) => ({ ...p, [bundleId]: false }))
    }
  }

  const toggleExpand = (bundleId) => {
    setExpanded((p) => ({ ...p, [bundleId]: !p[bundleId] }))
    if (!expanded[bundleId]) ensureDetail(bundleId)
  }

  const toggleSelectAll = async (bundle) => {
    const cur = bundleState[bundle.id] || {}
    const willSelect = !cur.selectAll
    setBundleState((p) => ({
      ...p,
      [bundle.id]: {
        items: cur.items,
        selectAll: willSelect,
        // selectAll → áp toàn bộ bộ; clear sub-selections
        lessonIds: new Set(),
      },
    }))
  }

  const toggleLesson = async (bundle, lessonId) => {
    await ensureDetail(bundle.id)
    setBundleState((p) => {
      const cur = p[bundle.id] || { items: [], selectAll: false, lessonIds: new Set() }
      const ids = new Set(cur.lessonIds || [])
      if (ids.has(lessonId)) ids.delete(lessonId)
      else ids.add(lessonId)
      return {
        ...p,
        [bundle.id]: {
          ...cur,
          selectAll: false, // chuyển sang chế độ chọn lẻ
          lessonIds: ids,
        },
      }
    })
  }

  // Tính các bundle sẽ apply
  const queue = useMemo(() => {
    const out = []
    for (const b of bundles) {
      const st = bundleState[b.id]
      if (!st) continue
      if (st.selectAll) {
        out.push({ bundleId: b.id, name: b.name, lessonIds: null })
      } else if (st.lessonIds && st.lessonIds.size > 0) {
        out.push({
          bundleId: b.id,
          name: b.name,
          lessonIds: Array.from(st.lessonIds),
        })
      }
    }
    return out
  }, [bundleState, bundles])

  const totalLessonsToApply = useMemo(() => {
    let n = 0
    for (const q of queue) {
      if (q.lessonIds === null) {
        const b = bundles.find((x) => x.id === q.bundleId)
        n += b?.item_count || 0
      } else {
        n += q.lessonIds.length
      }
    }
    return n
  }, [queue, bundles])

  const handleApply = async () => {
    if (queue.length === 0) {
      showError?.('Chọn ít nhất 1 bộ hoặc bài trong bộ')
      return
    }
    setApplying(true)
    try {
      let totalCreated = 0
      for (const q of queue) {
        const res = await lessonBundlesService.applyToClass(
          q.bundleId,
          classId,
          q.lessonIds || undefined,
        )
        totalCreated +=
          res.data?.data?.created ?? res.data?.created ?? 0
      }
      success?.(`Đã áp dụng ${totalCreated} bài học từ bộ vào lớp`)
      onApplied?.()
      onClose?.()
    } catch (err) {
      showError?.(err.response?.data?.message || 'Áp dụng bộ thất bại')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bộ bài học..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
        {loading ? (
          <LoadingSpinner />
        ) : bundles.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có bộ bài học nào.</p>
            <p className="text-xs mt-1">
              Vào trang <strong>Bộ bài học</strong> để tạo bộ trước.
            </p>
          </div>
        ) : (
          bundles.map((b) => {
            const st = bundleState[b.id] || {}
            const isAllSelected = !!st.selectAll
            const partialCount = st.lessonIds ? st.lessonIds.size : 0
            const isExpanded = !!expanded[b.id]
            const items = st.items || []
            return (
              <div
                key={b.id}
                className={`rounded-lg border-2 transition-all ${
                  isAllSelected
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : partialCount > 0
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(b)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isAllSelected
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-gray-300'
                    }`}
                    title="Áp dụng cả bộ"
                  >
                    {isAllSelected && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(b.id)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 flex-shrink-0"
                    title="Mở rộng để chọn từng bài"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Package className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {b.name}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {b.item_count} bài
                      </span>
                      {b.subject_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {b.subject_name}
                        </span>
                      )}
                      {isAllSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                          Áp dụng cả bộ
                        </span>
                      )}
                      {!isAllSelected && partialCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                          Đã chọn {partialCount} bài
                        </span>
                      )}
                    </div>
                    {b.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {b.description}
                      </p>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 py-2 bg-white/60">
                    {loadingDetail[b.id] ? (
                      <LoadingSpinner />
                    ) : items.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">
                        Bộ này chưa có bài nào.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {items.map((l, idx) => {
                          const checked =
                            isAllSelected ||
                            (st.lessonIds && st.lessonIds.has(l.id))
                          return (
                            <li key={l.id}>
                              <button
                                type="button"
                                onClick={() => toggleLesson(b, l.id)}
                                disabled={isAllSelected}
                                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                                  isAllSelected
                                    ? 'opacity-70 cursor-not-allowed bg-emerald-50'
                                    : checked
                                      ? 'bg-emerald-50'
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    checked
                                      ? 'bg-emerald-600 border-emerald-600'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {checked && (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 w-5">
                                  #{idx + 1}
                                </span>
                                <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                                <span className="truncate text-gray-700">
                                  {l.title}
                                </span>
                                {l.is_template && (
                                  <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                                    Mẫu
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {queue.length > 0
            ? `Sẽ tạo ~${totalLessonsToApply} bài học từ ${queue.length} bộ`
            : 'Tick "cả bộ" hoặc mở rộng để chọn từng bài'}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={applying}>
            Hủy
          </Button>
          <Button
            onClick={handleApply}
            loading={applying}
            disabled={queue.length === 0}
            icon={Copy}
          >
            Áp dụng
          </Button>
        </div>
      </div>
    </div>
  )
}
