import { useRef, useContext, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Image as ImageIcon,
  Headphones,
  Trash2,
  Upload,
  Link2,
} from 'lucide-react'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import uploadsService from '../../services/uploads.service'
import { publicUploadUrl } from '../../utils/mediaUrl'
import {
  TOEIC_PART_RANGES,
  assignImagesToPart1,
  assignAudiosToPart1Rows,
  assignAudiosToPart2,
  assignAudiosToPart3Groups,
  assignAudiosToPart4Groups,
} from '../../utils/toeicListening'

function unwrapUploadPayload(res) {
  const raw = res?.data?.data ?? res?.data
  return raw?.urls || []
}

function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-2 rounded-lg border border-gray-200 bg-white"
    >
      <button
        type="button"
        className="mt-1 p-1 rounded hover:bg-gray-100 text-gray-400 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default function ToeicMediaQueues({
  imageItems,
  onImageItemsChange,
  audioItems,
  onAudioItemsChange,
  questions,
  onApplyQuestions,
  /** 1–4: chỉ hiện khối media / nút gán tương ứng Part */
  activePart = 1,
}) {
  const fileImgRef = useRef(null)
  const fileAudRef = useRef(null)
  const { success, error: toastError } = useContext(ToastContext)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const uploadPending = async (items, setItems, label) => {
    const pending = items.filter((x) => x.file && !x.publicUrl)
    if (pending.length === 0) {
      return items
    }
    try {
      const res = await uploadsService.uploadMany(pending.map((p) => p.file))
      const urls = unwrapUploadPayload(res)
      if (!urls.length || urls.length !== pending.length) {
        toastError('Upload trả về số file không khớp.')
        return items
      }
      let i = 0
      const next = items.map((item) => {
        if (item.file && !item.publicUrl) {
          const rel = urls[i++]
          const full = publicUploadUrl(rel)
          if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(item.previewUrl)
            } catch {}
          }
          return {
            ...item,
            publicUrl: full,
            file: null,
            previewUrl: full,
          }
        }
        return item
      })
      setItems(next)
      success(`Đã upload ${pending.length} ${label}.`)
      return next
    } catch (e) {
      toastError(e.response?.data?.message || 'Upload thất bại')
      return items
    }
  }

  const urlsReady = (items) =>
    items.length > 0 && items.every((x) => x.publicUrl || (x.previewUrl && !x.file))

  const resolveUrls = (items) => {
    const missing = items.some((x) => x.file && !x.publicUrl)
    if (missing) {
      toastError('Vui lòng bấm "Upload lên server" cho ảnh/audio trước khi gán vào câu.')
      return null
    }
    return items.map((x) => x.publicUrl || x.previewUrl).filter(Boolean)
  }

  const handleImgDragEnd = (event, items, setItems) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((x) => x.id === active.id)
    const newIndex = items.findIndex((x) => x.id === over.id)
    setItems(arrayMove(items, oldIndex, newIndex))
  }

  const removeAt = (items, setItems, id) => setItems(items.filter((x) => x.id !== id))

  const addImages = (e) => {
    const files = Array.from(e.target.files || [])
    const next = files.map((f) => ({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      file: f,
      previewUrl: URL.createObjectURL(f),
      publicUrl: null,
    }))
    onImageItemsChange([...imageItems, ...next])
    e.target.value = ''
  }

  const addAudios = (e) => {
    const files = Array.from(e.target.files || [])
    const next = files.map((f) => ({
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      file: f,
      previewUrl: URL.createObjectURL(f),
      publicUrl: null,
    }))
    onAudioItemsChange([...audioItems, ...next])
    e.target.value = ''
  }

  const applyPart1 = async () => {
    let imgs = imageItems
    if (imageItems.some((x) => x.file && !x.publicUrl)) {
      imgs = await uploadPending(imageItems, onImageItemsChange, 'ảnh')
    }
    const urls = resolveUrls(imgs)
    if (!urls) return
    onApplyQuestions(assignImagesToPart1(urls, questions))
  }

  const applyPart1Audio = async () => {
    let aud = audioItems
    if (audioItems.some((x) => x.file && !x.publicUrl)) {
      aud = await uploadPending(audioItems, onAudioItemsChange, 'âm thanh')
    }
    const urls = resolveUrls(aud)
    if (!urls) return
    onApplyQuestions(assignAudiosToPart1Rows(urls, questions))
  }

  const applyPart2 = async () => {
    let aud = audioItems
    if (audioItems.some((x) => x.file && !x.publicUrl)) {
      aud = await uploadPending(audioItems, onAudioItemsChange, 'âm thanh')
    }
    const urls = resolveUrls(aud)
    if (!urls) return
    onApplyQuestions(assignAudiosToPart2(urls, questions))
  }

  const applyPart3 = async () => {
    let aud = audioItems
    if (audioItems.some((x) => x.file && !x.publicUrl)) {
      aud = await uploadPending(audioItems, onAudioItemsChange, 'âm thanh')
    }
    const urls = resolveUrls(aud)
    if (!urls) return
    onApplyQuestions(assignAudiosToPart3Groups(urls, questions))
  }

  const applyPart4 = async () => {
    let aud = audioItems
    if (audioItems.some((x) => x.file && !x.publicUrl)) {
      aud = await uploadPending(audioItems, onAudioItemsChange, 'âm thanh')
    }
    const urls = resolveUrls(aud)
    if (!urls) return
    onApplyQuestions(assignAudiosToPart4Groups(urls, questions))
  }

  const mediaCounts = useMemo(() => {
    const imgTotal = imageItems.length
    const imgOnServer = imageItems.filter((x) => x.publicUrl).length
    const imgPending = imageItems.filter((x) => x.file && !x.publicUrl).length
    const audTotal = audioItems.length
    const audOnServer = audioItems.filter((x) => x.publicUrl).length
    const audPending = audioItems.filter((x) => x.file && !x.publicUrl).length
    return { imgTotal, imgOnServer, imgPending, audTotal, audOnServer, audPending }
  }, [imageItems, audioItems])

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-900 mb-1">Bước 1 — Xếp ảnh & audio</p>
        <p className="text-xs text-emerald-800">
          Chọn <strong>tab Part</strong> phía trên: Part 1 = ảnh + audio câu 1–6; Part 2–4 = hàng audio + nút gán tương ứng. Chọn nhiều file, kéo thả thứ tự, <strong>Upload lên server</strong> rồi bấm gán.
        </p>
        <p className="text-xs text-emerald-900 mt-2 pt-2 border-t border-emerald-200/80 font-medium">
          Đã chọn: <strong>{mediaCounts.imgTotal}</strong> ảnh (đã upload {mediaCounts.imgOnServer}
          {mediaCounts.imgPending > 0 ? ` · chờ upload ${mediaCounts.imgPending}` : ''}) ·{' '}
          <strong>{mediaCounts.audTotal}</strong> audio (đã upload {mediaCounts.audOnServer}
          {mediaCounts.audPending > 0 ? ` · chờ upload ${mediaCounts.audPending}` : ''})
        </p>
      </div>

      {/* Images — chỉ Part 1 */}
      {activePart === 1 && (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-emerald-600" /> Ảnh (Part 1 — tối đa 6, thứ tự = câu 1→6)
          </h4>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileImgRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={addImages}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => fileImgRef.current?.click()}>
              + Chọn nhiều ảnh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={Upload}
              onClick={() => uploadPending(imageItems, onImageItemsChange, 'ảnh')}
            >
              Upload ảnh lên server
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => handleImgDragEnd(e, imageItems, onImageItemsChange)}
        >
          <SortableContext items={imageItems.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {imageItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center border border-dashed rounded-lg">Chưa có ảnh</p>
              ) : (
                imageItems.map((item) => (
                  <SortableRow key={item.id} id={item.id}>
                    <div className="flex flex-wrap gap-3 items-start">
                      <img
                        src={item.publicUrl || item.previewUrl}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg border bg-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 break-all">
                          {item.publicUrl ? (
                            <span className="text-green-700 flex items-center gap-1">
                              <Link2 className="h-3 w-3" /> Đã có URL server
                            </span>
                          ) : (
                            'Chưa upload — bấm Upload ảnh lên server'
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAt(imageItems, onImageItemsChange, item.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </SortableRow>
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="success" onClick={applyPart1}>
            Gán ảnh theo thứ tự → Part 1 (câu 1–6)
          </Button>
        </div>
      </div>
      )}

      {/* Audio */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Headphones className="h-4 w-4 text-indigo-600" /> File âm thanh (.mp3, .wav, …)
            <span className="text-xs font-normal text-gray-500">
              {TOEIC_PART_RANGES.find((x) => x.part === activePart)?.label || ''}
            </span>
          </h4>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileAudRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              multiple
              className="hidden"
              onChange={addAudios}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => fileAudRef.current?.click()}>
              + Chọn nhiều audio
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={Upload}
              onClick={() => uploadPending(audioItems, onAudioItemsChange, 'âm thanh')}
            >
              Upload audio lên server
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => handleImgDragEnd(e, audioItems, onAudioItemsChange)}
        >
          <SortableContext items={audioItems.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {audioItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center border border-dashed rounded-lg">Chưa có audio</p>
              ) : (
                audioItems.map((item) => (
                  <SortableRow key={item.id} id={item.id}>
                    <div className="flex flex-wrap gap-3 items-center">
                      <audio controls className="flex-1 min-w-[200px] max-h-10" src={item.publicUrl || item.previewUrl}>
                        <track kind="captions" />
                      </audio>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.publicUrl ? (
                            <span className="text-green-700">Đã có URL server</span>
                          ) : (
                            'Chưa upload'
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAt(audioItems, onAudioItemsChange, item.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </SortableRow>
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-3 flex flex-wrap gap-2">
          {activePart === 1 && (
            <Button type="button" size="sm" variant="outline" onClick={applyPart1Audio}>
              Gán 6 audio đầu → Part 1 (câu 1–6, mỗi câu một file)
            </Button>
          )}
          {activePart === 2 && (
            <Button type="button" size="sm" variant="secondary" onClick={applyPart2}>
              Gán audio lần lượt → Part 2 (câu 7–31, tối đa 25 file đầu)
            </Button>
          )}
          {activePart === 3 && (
            <Button type="button" size="sm" variant="secondary" onClick={applyPart3}>
              Gán 13 audio đầu → đầu mỗi nhóm Part 3
            </Button>
          )}
          {activePart === 4 && (
            <Button type="button" size="sm" variant="secondary" onClick={applyPart4}>
              Gán 10 audio đầu → đầu mỗi nhóm Part 4
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
