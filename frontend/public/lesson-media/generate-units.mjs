import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
mkdirSync(dir, { recursive: true })

const units = [
  ['01', 'TOEIC 550+', '200 câu · Nghe + Đọc', '#f59e0b'],
  ['02', 'Part 1', 'Photographs — người', '#0ea5e9'],
  ['03', 'Part 1', 'Photographs — cảnh', '#0284c7'],
  ['04', 'Part 2', 'Câu hỏi Wh-', '#6366f1'],
  ['05', 'Part 2', 'Yes / No', '#4f46e5'],
  ['06', 'Part 2', 'Statement', '#4338ca'],
  ['07', 'Part 3', 'Gist — ý chính', '#10b981'],
  ['08', 'Part 3', 'Detail — chi tiết', '#059669'],
  ['09', 'Part 3', 'Inference', '#047857'],
  ['10', 'Part 4', 'Announcements', '#f97316'],
  ['11', 'Part 4', 'Talks', '#ea580c'],
  ['12', 'Part 4', 'Messages', '#c2410c'],
  ['13', 'Part 5', 'Word form', '#8b5cf6'],
  ['14', 'Part 5', 'Tenses', '#7c3aed'],
  ['15', 'Part 5', 'Passive / to-V', '#6d28d9'],
  ['16', 'Part 5', 'Prep & conj', '#5b21b6'],
  ['17', 'Part 6', 'Text completion', '#db2777'],
  ['18', 'Part 7', 'Email / thư', '#0d9488'],
  ['19', 'Part 7', 'Quảng cáo', '#14b8a6'],
  ['20', 'Part 7', 'Double passage', '#0f766e'],
  ['21', 'Part 7', 'Triple passage', '#115e59'],
  ['22', 'Ôn tập', 'Listening 1–2', '#eab308'],
  ['23', 'Ôn tập', 'Listening 3–4', '#ca8a04'],
  ['24', 'Ôn tập', 'Reading 5–6', '#65a30d'],
  ['25', 'Ôn tập', 'Reading 7', '#4d7c0f'],
  ['26', 'Chiến lược', 'Pacing 120 phút', '#64748b'],
  ['27', 'Practice', 'Mini full 1', '#f43f5e'],
  ['28', 'Practice', 'Mini full 2', '#e11d48'],
  ['29', '4 kỹ năng', 'Nghe · Nói · Đọc · Viết', '#1d4ed8'],
]

function svg(code, title, subtitle, color) {
  const n = Number(code)
  const people = n <= 6 || n === 22
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="${title} ${subtitle}">
  <rect width="800" height="450" rx="28" fill="#fff7ed"/>
  <rect x="24" y="24" width="752" height="402" rx="22" fill="#ffffff" stroke="${color}" stroke-width="3"/>
  <rect x="24" y="24" width="752" height="86" rx="22" fill="${color}"/>
  <rect x="24" y="70" width="752" height="40" fill="${color}"/>
  <text x="56" y="78" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">Unit ${code} · ${title}</text>
  <text x="400" y="210" text-anchor="middle" fill="${color}" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="700">${subtitle}</text>
  ${people ? `
  <circle cx="250" cy="300" r="28" fill="${color}" opacity="0.9"/>
  <rect x="228" y="332" width="44" height="52" rx="14" fill="${color}" opacity="0.75"/>
  <circle cx="400" cy="292" r="32" fill="${color}"/>
  <rect x="374" y="328" width="52" height="58" rx="16" fill="${color}" opacity="0.85"/>
  <circle cx="550" cy="304" r="26" fill="${color}" opacity="0.8"/>
  <rect x="530" y="334" width="40" height="50" rx="12" fill="${color}" opacity="0.7"/>
  ` : `
  <rect x="180" y="260" width="180" height="110" rx="16" fill="${color}" opacity="0.18"/>
  <rect x="390" y="250" width="230" height="120" rx="16" fill="${color}" opacity="0.28"/>
  <rect x="220" y="280" width="120" height="14" rx="7" fill="${color}" opacity="0.55"/>
  <rect x="220" y="306" width="90" height="14" rx="7" fill="${color}" opacity="0.4"/>
  <rect x="420" y="278" width="170" height="14" rx="7" fill="${color}" opacity="0.6"/>
  <rect x="420" y="304" width="140" height="14" rx="7" fill="${color}" opacity="0.4"/>
  <rect x="420" y="330" width="110" height="14" rx="7" fill="${color}" opacity="0.3"/>
  `}
  <text x="400" y="400" text-anchor="middle" fill="#78716c" font-family="Segoe UI, Arial, sans-serif" font-size="14">Học liệu minh họa · Q.L.H.S English</text>
</svg>
`
}

for (const [code, title, subtitle, color] of units) {
  writeFileSync(join(dir, `unit-${code}.svg`), svg(code, title, subtitle, color))
}

console.log('wrote', units.length, 'unit illustrations')
