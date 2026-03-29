import { useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { Eye, EyeOff } from 'lucide-react'
import RichContentViewer from './RichContentViewer'

/* ===== Custom Image Handler ===== */
function imageHandler() {
  const quill = this.quill
  const range = quill.getSelection()

  const container = document.createElement('div')
  container.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50'
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4">
      <h3 class="text-lg font-bold text-gray-900">Chèn hình ảnh</h3>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Dán URL hình ảnh</label>
        <input id="img-url-input" type="text" placeholder="https://example.com/image.jpg"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="relative">
        <div class="absolute inset-x-0 top-1/2 border-t border-gray-200"></div>
        <p class="relative text-center text-xs text-gray-400 bg-white px-3 w-fit mx-auto">hoặc</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tải từ máy tính</label>
        <label class="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <span class="text-sm text-gray-600">📷 Chọn ảnh từ máy (tối đa 5MB)</span>
          <input id="img-file-input" type="file" accept="image/*" class="hidden" />
        </label>
        <p id="img-file-name" class="text-xs text-gray-400 mt-1"></p>
      </div>
      <div id="img-preview-box" class="hidden">
        <img id="img-preview" class="max-h-40 rounded-lg border border-gray-200 mx-auto" />
      </div>
      <div class="flex gap-3 justify-end pt-2">
        <button id="img-cancel-btn" class="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
        <button id="img-insert-btn" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled>Chèn ảnh</button>
      </div>
    </div>`
  document.body.appendChild(container)

  const urlInput = container.querySelector('#img-url-input')
  const fileInput = container.querySelector('#img-file-input')
  const fileName = container.querySelector('#img-file-name')
  const previewBox = container.querySelector('#img-preview-box')
  const previewImg = container.querySelector('#img-preview')
  const cancelBtn = container.querySelector('#img-cancel-btn')
  const insertBtn = container.querySelector('#img-insert-btn')
  let imageData = null

  const showPreview = (src) => {
    previewImg.src = src; previewBox.classList.remove('hidden')
    insertBtn.disabled = false; imageData = src
  }
  urlInput.addEventListener('input', () => {
    const url = urlInput.value.trim()
    if (url && /^https?:\/\//.test(url)) showPreview(url)
    else { previewBox.classList.add('hidden'); insertBtn.disabled = true; imageData = null }
  })
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Ảnh quá lớn (tối đa 5MB)'); return }
    fileName.textContent = file.name
    const reader = new FileReader()
    reader.onload = (e) => { showPreview(e.target.result); urlInput.value = '' }
    reader.readAsDataURL(file)
  })
  const cleanup = () => document.body.removeChild(container)
  cancelBtn.addEventListener('click', cleanup)
  container.addEventListener('click', (e) => { if (e.target === container) cleanup() })
  insertBtn.addEventListener('click', () => {
    if (imageData) {
      const idx = range ? range.index : quill.getLength()
      quill.insertEmbed(idx, 'image', imageData); quill.setSelection(idx + 1)
    }
    cleanup()
  })
  urlInput.focus()
}

/* ===== Custom Table Handler ===== */
function tableHandler() {
  const quill = this.quill
  const container = document.createElement('div')
  container.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50'
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
      <h3 class="text-lg font-bold text-gray-900">Chèn bảng</h3>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số hàng</label>
          <input id="tbl-rows" type="number" min="1" max="20" value="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số cột</label>
          <input id="tbl-cols" type="number" min="1" max="10" value="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div class="flex gap-3 justify-end pt-2">
        <button id="tbl-cancel" class="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
        <button id="tbl-insert" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Chèn bảng</button>
      </div>
    </div>`
  document.body.appendChild(container)

  const cleanup = () => document.body.removeChild(container)
  container.querySelector('#tbl-cancel').addEventListener('click', cleanup)
  container.addEventListener('click', (e) => { if (e.target === container) cleanup() })

  container.querySelector('#tbl-insert').addEventListener('click', () => {
    const rows = parseInt(container.querySelector('#tbl-rows').value) || 3
    const cols = parseInt(container.querySelector('#tbl-cols').value) || 3

    // Build HTML table
    let html = '<table><tbody>'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) {
        html += `<td>${r === 0 ? `Cột ${c + 1}` : ''}</td>`
      }
      html += '</tr>'
    }
    html += '</tbody></table>'

    const range = quill.getSelection()
    const idx = range ? range.index : quill.getLength()
    quill.clipboard.dangerouslyPasteHTML(idx, html)
    cleanup()
  })
}

/* ===== Toolbar Config ===== */
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],

  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],

  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],

  ['blockquote', 'code-block'],
  ['link', 'image', 'video', 'table'],

  [{ direction: 'rtl' }],
  ['clean'],
]

/* ===== Component ===== */
export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  error,
  minHeight = '250px',
  showPreview: enablePreview = true,
}) {
  const quillRef = useRef(null)
  const [preview, setPreview] = useState(false)

  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR_OPTIONS,
        handlers: {
          image: imageHandler,
          table: tableHandler,
        },
      },
      table: true,
      clipboard: { matchVisual: false },
    }),
    []
  )

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'script',
    'list', 'indent', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video',
    'table', 'table-row', 'table-body', 'table-container',
    'direction',
  ]

  const hasContent = value && value !== '<p><br></p>' && value.trim()

  return (
    <div className="space-y-1.5">
      {/* Label + Preview toggle */}
      <div className="flex items-center justify-between">
        {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
        {enablePreview && (
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              preview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? 'Quay lại soạn' : 'Xem trước'}
          </button>
        )}
      </div>

      {preview ? (
        <div className="rounded-lg border border-blue-200 bg-white overflow-hidden">
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Xem trước — Học sinh sẽ nhìn thấy nội dung như bên dưới
            </p>
          </div>
          <div className="p-5" style={{ minHeight }}>
            {hasContent ? (
              <RichContentViewer content={value} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có nội dung để xem trước</p>
            )}
          </div>
        </div>
      ) : (
        <div className={`rich-editor-wrapper rounded-lg border ${error ? 'border-red-400' : 'border-gray-300'} overflow-hidden`}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value || ''}
            onChange={onChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            style={{ minHeight }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!preview && (
        <p className="text-xs text-gray-400">
          💡 Nhấn 🖼️ để chèn ảnh • Nhấn 📊 (table) để chèn bảng • Dùng màu chữ/nền để tô highlight
        </p>
      )}

      <style>{`
        .rich-editor-wrapper .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          background: #f9fafb;
          padding: 8px 12px;
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .rich-editor-wrapper .ql-toolbar .ql-formats {
          margin-right: 8px;
          margin-bottom: 4px;
        }
        .rich-editor-wrapper .ql-toolbar button,
        .rich-editor-wrapper .ql-toolbar .ql-picker-label {
          border-radius: 4px;
        }
        .rich-editor-wrapper .ql-toolbar button:hover,
        .rich-editor-wrapper .ql-toolbar .ql-picker-label:hover {
          background: #e5e7eb;
        }
        .rich-editor-wrapper .ql-toolbar button.ql-active,
        .rich-editor-wrapper .ql-toolbar .ql-picker-label.ql-active {
          background: #dbeafe;
          color: #2563eb;
        }
        /* Table button icon */
        .rich-editor-wrapper .ql-toolbar .ql-table::before {
          content: '⊞';
          font-size: 16px;
        }
        .rich-editor-wrapper .ql-toolbar .ql-table {
          width: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .rich-editor-wrapper .ql-toolbar .ql-table svg { display: none; }

        .rich-editor-wrapper .ql-container {
          border: none !important;
          font-size: 14px;
          min-height: ${minHeight};
        }
        .rich-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          padding: 16px 20px;
          line-height: 1.8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .rich-editor-wrapper .ql-editor h1 { font-size: 1.75em; font-weight: 700; margin: 16px 0 8px; color: #111827; }
        .rich-editor-wrapper .ql-editor h2 { font-size: 1.4em; font-weight: 600; margin: 14px 0 6px; color: #1f2937; }
        .rich-editor-wrapper .ql-editor h3 { font-size: 1.17em; font-weight: 600; margin: 10px 0 4px; color: #374151; }
        .rich-editor-wrapper .ql-editor p { margin: 4px 0; }
        .rich-editor-wrapper .ql-editor blockquote {
          border-left: 4px solid #3b82f6;
          background: #eff6ff;
          border-radius: 0 8px 8px 0;
          padding: 12px 16px;
          margin: 8px 0;
          color: #4b5563;
        }
        .rich-editor-wrapper .ql-editor pre.ql-syntax {
          background: #1e293b; color: #e2e8f0;
          border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px;
        }
        .rich-editor-wrapper .ql-editor a { color: #2563eb; text-decoration: underline; }
        .rich-editor-wrapper .ql-editor img { 
          max-width: 100%; border-radius: 8px; margin: 12px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .rich-editor-wrapper .ql-editor .ql-video {
          width: 100%; aspect-ratio: 16/9; border-radius: 8px; margin: 12px 0;
        }
        /* Table styles in editor */
        .rich-editor-wrapper .ql-editor table {
          width: 100%; border-collapse: collapse; margin: 12px 0;
        }
        .rich-editor-wrapper .ql-editor table td {
          border: 1px solid #d1d5db; padding: 8px 12px;
          min-width: 50px; min-height: 30px;
        }
        .rich-editor-wrapper .ql-editor table tr:first-child td {
          background: #f3f4f6; font-weight: 600;
        }
        .rich-editor-wrapper .ql-editor table tr:nth-child(even) td {
          background: #f9fafb;
        }
        .rich-editor-wrapper .ql-editor ul, .rich-editor-wrapper .ql-editor ol { padding-left: 24px; }
        .rich-editor-wrapper .ql-editor ul[data-checked="true"] > li::before { content: '☑'; color: #22c55e; }
        .rich-editor-wrapper .ql-editor ul[data-checked="false"] > li::before { content: '☐'; color: #9ca3af; }

        /* Color picker improvements */
        .rich-editor-wrapper .ql-snow .ql-color-picker .ql-picker-options,
        .rich-editor-wrapper .ql-snow .ql-background .ql-picker-options {
          width: 198px !important;
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .rich-editor-wrapper .ql-snow .ql-color-picker .ql-picker-item,
        .rich-editor-wrapper .ql-snow .ql-background .ql-picker-item {
          border-radius: 3px;
          width: 20px;
          height: 20px;
        }
        .rich-editor-wrapper .ql-snow .ql-tooltip {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  )
}
