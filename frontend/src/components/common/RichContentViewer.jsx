const STYLES = `
  .rich-content-viewer {
    color: #374151;
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.7;
    font-size: 14px;
  }
  /* Headings */
  .rich-content-viewer h1 {
    font-size: 1.75em; font-weight: 700;
    margin: 16px 0 8px; color: #111827;
    border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;
  }
  .rich-content-viewer h2 {
    font-size: 1.4em; font-weight: 600;
    margin: 14px 0 6px; color: #1f2937;
  }
  .rich-content-viewer h3 {
    font-size: 1.17em; font-weight: 600;
    margin: 10px 0 4px; color: #374151;
  }
  .rich-content-viewer h4 {
    font-size: 1em; font-weight: 600;
    margin: 8px 0 4px; color: #4b5563;
  }
  /* Paragraphs */
  .rich-content-viewer p { margin: 6px 0; }
  /* Lists */
  .rich-content-viewer ul, .rich-content-viewer ol {
    padding-left: 24px; margin: 6px 0;
  }
  .rich-content-viewer li { margin: 3px 0; }
  /* Inline styles */
  .rich-content-viewer strong { font-weight: 700; }
  .rich-content-viewer em { font-style: italic; }
  .rich-content-viewer u { text-decoration: underline; }
  .rich-content-viewer s { text-decoration: line-through; }
  .rich-content-viewer sub { vertical-align: sub; font-size: 0.8em; }
  .rich-content-viewer sup { vertical-align: super; font-size: 0.8em; }
  /* Blockquote */
  .rich-content-viewer blockquote {
    border-left: 4px solid #3b82f6;
    background: #eff6ff;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 10px 0;
    color: #1e40af;
  }
  /* Code */
  .rich-content-viewer pre {
    background: #1e293b; color: #e2e8f0;
    border-radius: 8px; padding: 16px;
    overflow-x: auto; margin: 10px 0;
    font-family: 'Fira Code', 'Consolas', monospace; font-size: 13px;
  }
  .rich-content-viewer code {
    background: #f1f5f9; color: #e11d48;
    padding: 2px 6px; border-radius: 4px; font-size: 13px;
  }
  .rich-content-viewer pre code {
    background: none; color: inherit; padding: 0;
  }
  /* Links */
  .rich-content-viewer a { color: #2563eb; text-decoration: underline; }
  .rich-content-viewer a:hover { color: #1d4ed8; }
  /* Images */
  .rich-content-viewer img {
    max-width: 100%; border-radius: 8px;
    margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  /* ===== TABLE STYLES ===== */
  .rich-content-viewer table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    overflow: hidden;
  }
  .rich-content-viewer table th,
  .rich-content-viewer table td {
    border: 1px solid #d1d5db;
    padding: 10px 14px;
    text-align: left;
    vertical-align: top;
  }
  .rich-content-viewer table th {
    background: #f3f4f6;
    font-weight: 600;
    color: #374151;
  }
  .rich-content-viewer table tr:first-child td {
    background: #f3f4f6;
    font-weight: 600;
    color: #374151;
  }
  .rich-content-viewer table tr:nth-child(even) td {
    background: #f9fafb;
  }
  .rich-content-viewer table tr:hover td {
    background: #eff6ff;
  }
  .rich-content-viewer table tr:first-child:hover td {
    background: #e5e7eb;
  }

  /* ===== VIDEO ===== */
  .rich-content-viewer .ql-video,
  .rich-content-viewer iframe {
    width: 100%; aspect-ratio: 16/9;
    border-radius: 8px; margin: 10px 0;
    border: none;
  }

  /* ===== QUILL ALIGNMENT ===== */
  .rich-content-viewer .ql-align-center { text-align: center; }
  .rich-content-viewer .ql-align-right { text-align: right; }
  .rich-content-viewer .ql-align-justify { text-align: justify; }

  /* ===== QUILL INDENT ===== */
  .rich-content-viewer .ql-indent-1 { padding-left: 3em; }
  .rich-content-viewer .ql-indent-2 { padding-left: 6em; }
  .rich-content-viewer .ql-indent-3 { padding-left: 9em; }

  /* ===== QUILL SIZES ===== */
  .rich-content-viewer .ql-size-small { font-size: 0.85em; }
  .rich-content-viewer .ql-size-large { font-size: 1.2em; }
  .rich-content-viewer .ql-size-huge { font-size: 1.5em; }

  /* ===== QUILL DIRECTION ===== */
  .rich-content-viewer .ql-direction-rtl { direction: rtl; text-align: right; }

  /* ===== QUILL FONT ===== */
  .rich-content-viewer .ql-font-serif { font-family: Georgia, 'Times New Roman', serif; }
  .rich-content-viewer .ql-font-monospace { font-family: 'Fira Code', 'Consolas', monospace; }

  /* ===== CHECKLIST ===== */
  .rich-content-viewer ul[data-checked="true"] > li::before { content: '☑ '; color: #22c55e; }
  .rich-content-viewer ul[data-checked="false"] > li::before { content: '☐ '; color: #9ca3af; }

  /* ===== INLINE COLOR/BACKGROUND ===== */
  /* Quill uses inline style for color & background-color — they render automatically.
     These are fallback classes just in case. */
  .rich-content-viewer span[style*="color"] { /* inline styles from quill work automatically */ }
  .rich-content-viewer span[style*="background-color"] { padding: 1px 3px; border-radius: 2px; }
`

let stylesInjected = false

function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = STYLES
  document.head.appendChild(style)
  stylesInjected = true
}

export default function RichContentViewer({ content, className = '' }) {
  if (!content) return null

  injectStyles()

  return (
    <div
      className={`rich-content-viewer ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
