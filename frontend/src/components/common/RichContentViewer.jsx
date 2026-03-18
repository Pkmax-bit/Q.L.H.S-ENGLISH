export default function RichContentViewer({ content, className = '' }) {
  if (!content) return null

  return (
    <div
      className={`rich-content-viewer ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
      style={{
        lineHeight: 1.7,
        fontSize: '14px',
      }}
    >
      <style>{`
        .rich-content-viewer {
          color: #374151;
          word-wrap: break-word;
        }
        .rich-content-viewer h1 {
          font-size: 1.5em; font-weight: 700;
          margin: 16px 0 8px; color: #111827;
          border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;
        }
        .rich-content-viewer h2 {
          font-size: 1.25em; font-weight: 600;
          margin: 14px 0 6px; color: #1f2937;
        }
        .rich-content-viewer h3 {
          font-size: 1.1em; font-weight: 600;
          margin: 10px 0 4px; color: #374151;
        }
        .rich-content-viewer p { margin: 6px 0; }
        .rich-content-viewer ul, .rich-content-viewer ol {
          padding-left: 24px; margin: 6px 0;
        }
        .rich-content-viewer li { margin: 3px 0; }
        .rich-content-viewer strong { font-weight: 700; }
        .rich-content-viewer em { font-style: italic; }
        .rich-content-viewer u { text-decoration: underline; }
        .rich-content-viewer s { text-decoration: line-through; color: #9ca3af; }
        .rich-content-viewer blockquote {
          border-left: 4px solid #3b82f6;
          background: #eff6ff;
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
          margin: 10px 0;
          color: #1e40af;
        }
        .rich-content-viewer pre {
          background: #1e293b; color: #e2e8f0;
          border-radius: 8px; padding: 16px;
          overflow-x: auto; margin: 10px 0;
          font-family: monospace; font-size: 13px;
        }
        .rich-content-viewer code {
          background: #f1f5f9; color: #e11d48;
          padding: 2px 6px; border-radius: 4px;
          font-size: 13px;
        }
        .rich-content-viewer pre code {
          background: none; color: inherit;
          padding: 0;
        }
        .rich-content-viewer a {
          color: #2563eb; text-decoration: underline;
        }
        .rich-content-viewer a:hover { color: #1d4ed8; }
        .rich-content-viewer img {
          max-width: 100%; border-radius: 8px;
          margin: 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .rich-content-viewer table {
          width: 100%; border-collapse: collapse;
          margin: 10px 0; font-size: 13px;
        }
        .rich-content-viewer table th,
        .rich-content-viewer table td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px; text-align: left;
        }
        .rich-content-viewer table th {
          background: #f3f4f6; font-weight: 600;
        }
        .rich-content-viewer table tr:nth-child(even) {
          background: #f9fafb;
        }
        .rich-content-viewer .ql-video {
          width: 100%; aspect-ratio: 16/9;
          border-radius: 8px; margin: 10px 0;
        }
        .rich-content-viewer .ql-align-center { text-align: center; }
        .rich-content-viewer .ql-align-right { text-align: right; }
        .rich-content-viewer .ql-align-justify { text-align: justify; }
        .rich-content-viewer .ql-indent-1 { padding-left: 3em; }
        .rich-content-viewer .ql-indent-2 { padding-left: 6em; }
        .rich-content-viewer .ql-size-small { font-size: 0.85em; }
        .rich-content-viewer .ql-size-large { font-size: 1.2em; }
        .rich-content-viewer .ql-size-huge { font-size: 1.5em; }
      `}</style>
    </div>
  )
}
