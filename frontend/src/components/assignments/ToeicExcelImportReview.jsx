import { useState, useMemo, useEffect, useContext, useRef } from 'react'
import {
  FileSpreadsheet, X, AlertTriangle, CheckCircle2, Image as ImageIcon, Headphones,
} from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import assignmentsService from '../../services/assignments.service'
import {
  mergeParsedExcelIntoToeicSkeleton,
  TOEIC_FULL_QUESTIONS,
  getToeicListeningMeta,
} from '../../utils/toeicListening'
import { mediaFileNameFromUrl } from '../../utils/mediaUrl'
import { mcqLetter } from '../../utils/assignmentHelpers'

function unwrapParsePayload(response) {
  const body = response?.data
  return body?.data ?? body
}

function stripHtml(s) {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const TEMPLATE_DOWNLOAD_NAME = {
  general: 'mau-import-cau-hoi.xlsx',
  toeic_listening: 'mau-toeic-listening-theo-part.xlsx',
  toeic_lr: 'mau-toeic-nghe-doc.xlsx',
  toeic_four_skills: 'mau-toeic-4-ky-nang.xlsx',
}

const TEMPLATE_LABEL = {
  general: 'chung (Trắc nghiệm + Part 1 + …)',
  toeic_listening: 'Listening — sheet L-P1 … L-P4',
  toeic_lr: 'Nghe + Đọc — L-P* và R-P*',
  toeic_four_skills: '4 kỹ năng — L-P*, R-P*, Speaking, Writing',
}

export default function ToeicExcelImportReview({
  isOpen,
  onClose,
  skeletonQuestions,
  imageItems = [],
  audioItems = [],
  onApply,
  /** general | toeic_listening | toeic_lr | toeic_four_skills */
  templateVariant = 'toeic_listening',
  exportAssignmentType = 'toeic_listening',
  /** Mảng xuất Excel; mặc định dùng skeleton nếu không truyền (chỉ phù hợp listening thuần) */
  questionsForExport,
}) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const { success: toastSuccess, error: toastError } = useContext(ToastContext)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setParseResult(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  const mergedPreview = useMemo(() => {
    if (!parseResult?.questions?.length || !skeletonQuestions?.length) return null
    return mergeParsedExcelIntoToeicSkeleton(skeletonQuestions, parseResult.questions)
  }, [parseResult, skeletonQuestions])

  const mediaStats = useMemo(() => {
    if (!mergedPreview) return { imgQ: 0, audQ: 0, images: 0, audios: 0 }
    let imgQ = 0
    let audQ = 0
    mergedPreview.forEach((q) => {
      if (q.file_url) imgQ += 1
      if (q.youtube_url) audQ += 1
    })
    return {
      imgQ,
      audQ,
      images: imageItems.length,
      audios: audioItems.length,
    }
  }, [mergedPreview, imageItems.length, audioItems.length])

  const handleFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Chỉ chấp nhận .xlsx, .xls')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File tối đa 10MB')
      return
    }
    setFile(f)
    setError(null)
    setParseResult(null)
  }

  const handleParse = async () => {
    if (!file) return
    if (!skeletonQuestions?.length) {
      toastError('Cần tạo khung 100 câu trước khi import Excel.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await assignmentsService.parseExcelQuestions(file)
      const payload = unwrapParsePayload(res)
      if (!payload?.questions?.length) {
        setError('File không có câu hỏi hợp lệ (cần sheet Part 1 (TOEIC), Trắc nghiệm hoặc Tự luận — đúng tiêu đề cột).')
        return
      }
      setParseResult({
        questions: payload.questions,
        summary: payload.summary,
        warnings: payload.warnings || [],
      })
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi đọc file'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await assignmentsService.downloadQuestionTemplate({ variant: templateVariant })
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = TEMPLATE_DOWNLOAD_NAME[templateVariant] || TEMPLATE_DOWNLOAD_NAME.general
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toastError('Không tải được mẫu')
    }
  }

  const exportPayload = questionsForExport?.length ? questionsForExport : skeletonQuestions
  const exportFilename =
    exportAssignmentType === 'toeic_four_skills'
      ? 'toeic-4-ky-nang-cau-hoi-media.xlsx'
      : exportAssignmentType === 'toeic_lr'
        ? 'toeic-nghe-doc-cau-hoi-media.xlsx'
        : 'toeic-listening-cau-hoi-media.xlsx'

  const handleExportExcel = async () => {
    if (!exportPayload?.length) {
      toastError('Chưa có câu hỏi để xuất.')
      return
    }
    try {
      const res = await assignmentsService.exportQuestionsExcel({
        questions: exportPayload,
        assignment_type: exportAssignmentType,
      })
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Đã tải Excel — trong sheet có cột tên file ảnh / âm thanh.')
    } catch (e) {
      toastError(e.response?.data?.message || 'Không xuất được Excel')
    }
  }

  const handleApply = () => {
    if (!mergedPreview) return
    onApply(mergedPreview)
    toastSuccess(`Đã áp dụng ${parseResult.questions.length} câu từ Excel (theo thứ tự, tối đa ${TOEIC_FULL_QUESTIONS} câu).`)
    onClose()
  }

  const canApply = !!mergedPreview && skeletonQuestions.length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Excel — Xem lại trước khi áp dụng"
      size="full"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button type="button" onClick={handleApply} disabled={!canApply}>
            Áp dụng vào đề
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {!skeletonQuestions?.length && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            Tạo khung 100 câu (TOEIC) trước, rồi mở lại import Excel.
          </div>
        )}

        {/* Bước chọn file */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> File Excel — sheet &quot;Part 1 (TOEIC)&quot; và/hoặc &quot;Trắc nghiệm&quot;
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Tải mẫu ({TEMPLATE_LABEL[templateVariant] || templateVariant})
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Xuất Excel hiện tại (URL + tên file media)
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Chọn file Excel
            </Button>
            {file && (
              <span className="text-sm text-gray-700">
                {file.name}{' '}
                <button
                  type="button"
                  onClick={() => { setFile(null); setParseResult(null) }}
                  className="text-red-500 ml-1"
                >
                  <X className="h-4 w-4 inline" />
                </button>
              </span>
            )}
            {file && !parseResult && (
              <Button type="button" size="sm" onClick={handleParse} loading={loading} icon={loading ? undefined : FileSpreadsheet}>
                {loading ? 'Đang đọc...' : 'Đọc & chuẩn bị review'}
              </Button>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>

        {parseResult && (
          <>
            {parseResult.warnings?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-medium mb-1">Cảnh báo từ file:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {parseResult.warnings.slice(0, 12).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {parseResult.warnings.length > 12 && (
                    <li>… và {parseResult.warnings.length - 12} dòng khác</li>
                  )}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Media review */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Review media (hàng chờ & đề sau merge)
                </h3>
                <p className="text-xs text-emerald-800">
                  Ảnh đã chọn: <strong>{mediaStats.images}</strong> · Audio đã chọn: <strong>{mediaStats.audios}</strong>
                  <br />
                  Trên đề (sau merge): <strong>{mediaStats.imgQ}</strong> câu có URL ảnh ·{' '}
                  <strong>{mediaStats.audQ}</strong> câu có URL âm thanh
                </p>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" /> Ảnh (hàng chờ)
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {imageItems.length === 0 ? (
                      <span className="text-xs text-gray-400">Chưa có ảnh trong Bước 1</span>
                    ) : (
                      imageItems.map((it) => (
                        <img
                          key={it.id}
                          src={it.publicUrl || it.previewUrl}
                          alt=""
                          title={it.name}
                          className="w-14 h-14 object-cover rounded border"
                        />
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Headphones className="h-3.5 w-3.5" /> Audio (hàng chờ — tối đa 3 mục nghe thử)
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {audioItems.length === 0 ? (
                      <span className="text-xs text-gray-400">Chưa có audio trong Bước 1</span>
                    ) : (
                      audioItems.slice(0, 3).map((it) => (
                        <audio
                          key={it.id}
                          controls
                          className="w-full h-8"
                          src={it.publicUrl || it.previewUrl}
                        >
                          <track kind="captions" />
                        </audio>
                      ))
                    )}
                    {audioItems.length > 3 && (
                      <p className="text-[11px] text-gray-500">+ {audioItems.length - 3} file khác…</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Questions review */}
              <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4 space-y-3">
                <h3 className="text-sm font-bold text-violet-900">Review câu hỏi (sau khi gộp vào khung TOEIC)</h3>
                <p className="text-xs text-violet-800">
                  Đọc được <strong>{parseResult.summary?.total ?? parseResult.questions.length}</strong> câu từ Excel ·
                  Trắc nghiệm: <strong>{parseResult.summary?.multiple_choice ?? '—'}</strong>
                  <br />
                  Sẽ điền lần lượt vào câu <strong>1 → {Math.min(parseResult.questions.length, TOEIC_FULL_QUESTIONS)}</strong> của đề.
                </p>
                <div className="border border-violet-100 rounded-lg overflow-hidden max-h-72 overflow-y-auto bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-violet-100/80 sticky top-0">
                      <tr>
                        <th className="text-left p-2 w-10">#</th>
                        <th className="text-left p-2 w-16">Part</th>
                        <th className="text-left p-2 max-w-[120px]">Ảnh / audio (tên file)</th>
                        <th className="text-left p-2">Câu hỏi (rút gọn)</th>
                        <th className="text-left p-2 w-12">Đúng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(mergedPreview || []).slice(0, 24).map((q, idx) => {
                        const meta = getToeicListeningMeta(idx)
                        const stem = stripHtml(q.question_text || q.text || '')
                        const ci = (q.options || []).findIndex((o) => o.is_correct)
                        const letter = ci >= 0 ? mcqLetter(ci) : '—'
                        const img = mediaFileNameFromUrl(q.file_url)
                        const aud = mediaFileNameFromUrl(q.youtube_url)
                        const mediaLabel = [img && `Ảnh: ${img}`, aud && `Audio: ${aud}`].filter(Boolean).join(' · ') || '—'
                        return (
                          <tr key={q.id || idx} className="border-t border-gray-100">
                            <td className="p-2 text-gray-500">{idx + 1}</td>
                            <td className="p-2 text-indigo-700 font-medium">{meta.label}</td>
                            <td className="p-2 text-gray-700 max-w-[120px] truncate align-top" title={mediaLabel}>
                              {mediaLabel}
                            </td>
                            <td className="p-2 text-gray-800 max-w-[200px] truncate" title={stem}>
                              {stem || '(trống)'}
                            </td>
                            <td className="p-2 font-semibold text-green-700">{letter}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {(mergedPreview?.length || 0) > 24 && (
                    <p className="text-[11px] text-gray-500 p-2 bg-gray-50">
                      Hiển thị 24 dòng đầu — tổng {mergedPreview.length} câu trong đề.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
