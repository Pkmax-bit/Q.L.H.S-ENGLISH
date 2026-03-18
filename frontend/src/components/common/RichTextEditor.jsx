import { useMemo } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['blockquote', 'code-block'],
  ['link', 'image', 'video'],
  [{ direction: 'rtl' }],
  ['clean'],
]

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  error,
  minHeight = '250px',
}) {
  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR_OPTIONS,
      clipboard: { matchVisual: false },
    }),
    []
  )

  const formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'script',
    'list',
    'indent',
    'align',
    'blockquote',
    'code-block',
    'link',
    'image',
    'video',
    'direction',
  ]

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div
        className={`rich-editor-wrapper rounded-lg border ${
          error ? 'border-red-400' : 'border-gray-300'
        } overflow-hidden`}
      >
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ minHeight }}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <style>{`
        .rich-editor-wrapper .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          background: #f9fafb;
          padding: 8px 12px;
          flex-wrap: wrap;
        }
        .rich-editor-wrapper .ql-container {
          border: none !important;
          font-size: 14px;
          min-height: ${minHeight};
        }
        .rich-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          padding: 16px;
          line-height: 1.7;
        }
        .rich-editor-wrapper .ql-editor h1 { font-size: 1.5em; font-weight: 700; margin: 12px 0 8px; }
        .rich-editor-wrapper .ql-editor h2 { font-size: 1.25em; font-weight: 600; margin: 10px 0 6px; }
        .rich-editor-wrapper .ql-editor h3 { font-size: 1.1em; font-weight: 600; margin: 8px 0 4px; }
        .rich-editor-wrapper .ql-editor blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 16px;
          color: #4b5563;
          background: #eff6ff;
          border-radius: 0 8px 8px 0;
          padding: 12px 16px;
          margin: 8px 0;
        }
        .rich-editor-wrapper .ql-editor pre.ql-syntax {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
        }
        .rich-editor-wrapper .ql-editor a { color: #2563eb; text-decoration: underline; }
        .rich-editor-wrapper .ql-editor img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .rich-editor-wrapper .ql-editor .ql-video {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 8px;
        }
        .rich-editor-wrapper .ql-editor ul[data-checked="true"] > li::before {
          content: '☑';
          color: #22c55e;
        }
        .rich-editor-wrapper .ql-editor ul[data-checked="false"] > li::before {
          content: '☐';
          color: #9ca3af;
        }
      `}</style>
    </div>
  )
}
