import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'scenes')
mkdirSync(dir, { recursive: true })

function wrap(label, body, bg = '#e8f1f8') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="${label}">
  <rect width="800" height="500" fill="${bg}"/>
  ${body}
  <text x="400" y="486" text-anchor="middle" fill="#64748b" font-family="Segoe UI, Arial, sans-serif" font-size="13">${label} · Q.L.H.S English</text>
</svg>
`
}

function person(x, y, skin, hair, shirt, { hold = '', sit = false } = {}) {
  const bodyY = sit ? y + 18 : y
  return `
  <circle cx="${x}" cy="${y - 52}" r="18" fill="${skin}"/>
  <ellipse cx="${x}" cy="${y - 64}" rx="18" ry="10" fill="${hair}"/>
  <rect x="${x - 18}" y="${bodyY - 32}" width="36" height="44" rx="10" fill="${shirt}"/>
  <rect x="${x - 16}" y="${bodyY + 10}" width="12" height="28" rx="4" fill="#1e3a5f"/>
  <rect x="${x + 4}" y="${bodyY + 10}" width="12" height="28" rx="4" fill="#1e3a5f"/>
  ${hold === 'cup' ? `<rect x="${x + 20}" y="${y - 18}" width="12" height="16" rx="3" fill="#f8fafc" stroke="#94a3b8"/><ellipse cx="${x + 26}" cy="${y - 18}" rx="5" ry="2" fill="#fb923c"/>` : ''}
  ${hold === 'paper' ? `<rect x="${x + 16}" y="${y - 20}" width="22" height="28" rx="2" fill="#fff" stroke="#cbd5e1"/>` : ''}
`

}

const scenes = {
  'typing.svg': wrap('Nhân viên đang gõ máy tính', `
    <rect width="800" height="220" fill="#dbeafe"/>
    <rect y="220" width="800" height="280" fill="#f1f5f9"/>
    <rect x="180" y="250" width="440" height="160" rx="8" fill="#cbd5e1"/>
    <rect x="200" y="200" width="200" height="120" rx="6" fill="#334155"/>
    <rect x="214" y="212" width="172" height="96" fill="#7dd3fc"/>
    <rect x="430" y="268" width="160" height="10" rx="3" fill="#94a3b8"/>
    <circle cx="300" cy="188" r="20" fill="#f4c7a1"/>
    <ellipse cx="300" cy="176" rx="20" ry="11" fill="#3f2a1d"/>
    <rect x="278" y="208" width="44" height="48" rx="10" fill="#0ea5e9"/>
    <rect x="248" y="248" width="18" height="22" rx="4" fill="#f4c7a1"/>
    <rect x="334" y="248" width="18" height="22" rx="4" fill="#f4c7a1"/>
    <rect x="270" y="292" width="16" height="36" rx="4" fill="#1e3a5f"/>
    <rect x="314" y="292" width="16" height="36" rx="4" fill="#1e3a5f"/>
  `, '#e0f2fe'),

  'document.svg': wrap('Hai người đang xem tài liệu', `
    <rect width="800" height="200" fill="#e2e8f0"/>
    <rect y="200" width="800" height="300" fill="#f8fafc"/>
    <rect x="250" y="240" width="300" height="170" rx="8" fill="#94a3b8"/>
    <circle cx="320" cy="200" r="20" fill="#f4c7a1"/>
    <ellipse cx="320" cy="188" rx="20" ry="10" fill="#1c1917"/>
    <rect x="300" y="220" width="40" height="50" rx="10" fill="#0369a1"/>
    <circle cx="470" cy="198" r="20" fill="#f2c2a0"/>
    <ellipse cx="470" cy="186" rx="20" ry="10" fill="#7c2d12"/>
    <rect x="450" y="218" width="40" height="50" rx="10" fill="#db2777"/>
    <rect x="360" y="250" width="70" height="50" rx="3" fill="#fff" stroke="#94a3b8"/>
    <rect x="372" y="262" width="46" height="4" fill="#cbd5e1"/>
    <rect x="372" y="272" width="36" height="4" fill="#cbd5e1"/>
    <rect x="372" y="282" width="42" height="4" fill="#cbd5e1"/>
  `, '#f1f5f9'),

  'holding-cup.svg': wrap('Người đàn ông đang cầm cốc', `
    <rect width="800" height="240" fill="#fef3c7"/>
    <rect y="240" width="800" height="260" fill="#fff7ed"/>
    <rect x="120" y="280" width="240" height="120" rx="8" fill="#fdba74"/>
    <circle cx="400" cy="210" r="24" fill="#f4c7a1"/>
    <ellipse cx="400" cy="196" rx="24" ry="12" fill="#292524"/>
    <rect x="374" y="234" width="52" height="70" rx="12" fill="#ea580c"/>
    <rect x="368" y="300" width="18" height="50" rx="5" fill="#1e3a5f"/>
    <rect x="414" y="300" width="18" height="50" rx="5" fill="#1e3a5f"/>
    <rect x="430" y="248" width="22" height="28" rx="5" fill="#fff7ed" stroke="#78716c"/>
    <ellipse cx="441" cy="248" rx="8" ry="3" fill="#fb923c"/>
    <path d="M452 258 h10 a8 8 0 0 1 0 16 h-10" fill="none" stroke="#78716c" stroke-width="3"/>
  `, '#ffedd5'),

  'pointing-screen.svg': wrap('Người phụ nữ đang chỉ màn hình', `
    <rect width="800" height="210" fill="#d1fae5"/>
    <rect y="210" width="800" height="290" fill="#ecfdf5"/>
    <rect x="430" y="150" width="220" height="150" rx="8" fill="#115e59"/>
    <rect x="446" y="166" width="188" height="118" fill="#5eead4"/>
    <circle cx="280" cy="220" r="22" fill="#f4c7a1"/>
    <ellipse cx="280" cy="206" rx="22" ry="12" fill="#431407"/>
    <rect x="256" y="242" width="50" height="64" rx="12" fill="#059669"/>
    <rect x="250" y="304" width="18" height="46" rx="5" fill="#1e3a5f"/>
    <rect x="292" y="304" width="18" height="46" rx="5" fill="#1e3a5f"/>
    <rect x="306" y="250" width="90" height="10" rx="4" fill="#f4c7a1" transform="rotate(-18 351 255)"/>
  `, '#ecfdf5'),

  'walking.svg': wrap('Người đang đi trong hành lang', `
    <rect width="800" height="500" fill="#e2e8f0"/>
    <rect x="80" y="0" width="160" height="500" fill="#cbd5e1"/>
    <rect x="560" y="0" width="160" height="500" fill="#cbd5e1"/>
    <rect x="240" y="360" width="320" height="20" fill="#94a3b8"/>
    <circle cx="400" cy="220" r="20" fill="#f4c7a1"/>
    <ellipse cx="400" cy="208" rx="20" ry="10" fill="#1e293b"/>
    <rect x="380" y="242" width="40" height="56" rx="10" fill="#2563eb"/>
    <rect x="372" y="296" width="16" height="48" rx="5" fill="#1e3a5f" transform="rotate(-12 380 320)"/>
    <rect x="412" y="296" width="16" height="48" rx="5" fill="#1e3a5f" transform="rotate(14 420 320)"/>
    <rect x="356" y="250" width="14" height="40" rx="5" fill="#f4c7a1" transform="rotate(20 363 270)"/>
    <rect x="430" y="250" width="14" height="40" rx="5" fill="#f4c7a1" transform="rotate(-16 437 270)"/>
  `, '#f1f5f9'),

  'parked.svg': wrap('Xe đỗ thành hàng trước tòa nhà', `
    <rect width="800" height="220" fill="#bae6fd"/>
    <rect y="220" width="800" height="280" fill="#86efac"/>
    <rect x="80" y="90" width="280" height="160" fill="#64748b"/>
    <rect x="110" y="120" width="50" height="70" fill="#e0f2fe"/>
    <rect x="180" y="120" width="50" height="70" fill="#e0f2fe"/>
    <rect x="250" y="120" width="50" height="70" fill="#e0f2fe"/>
    <rect x="200" y="300" width="110" height="46" rx="10" fill="#1d4ed8"/>
    <circle cx="220" cy="348" r="10" fill="#1e293b"/>
    <circle cx="290" cy="348" r="10" fill="#1e293b"/>
    <rect x="340" y="300" width="110" height="46" rx="10" fill="#dc2626"/>
    <circle cx="360" cy="348" r="10" fill="#1e293b"/>
    <circle cx="430" cy="348" r="10" fill="#1e293b"/>
    <rect x="480" y="300" width="110" height="46" rx="10" fill="#ca8a04"/>
    <circle cx="500" cy="348" r="10" fill="#1e293b"/>
    <circle cx="570" cy="348" r="10" fill="#1e293b"/>
  `, '#e0f2fe'),

  'stacked.svg': wrap('Thùng giấy xếp chồng trên sàn', `
    <rect width="800" height="500" fill="#f5f5f4"/>
    <rect y="360" width="800" height="140" fill="#d6d3d1"/>
    <rect x="250" y="250" width="120" height="80" fill="#d97706"/>
    <rect x="258" y="258" width="104" height="12" fill="#fde68a"/>
    <rect x="280" y="180" width="120" height="80" fill="#b45309"/>
    <rect x="288" y="188" width="104" height="12" fill="#fde68a"/>
    <rect x="400" y="250" width="120" height="80" fill="#ca8a04"/>
    <rect x="408" y="258" width="104" height="12" fill="#fde68a"/>
  `, '#fafaf9'),

  'displayed.svg': wrap('Hàng hóa trưng bày trên kệ', `
    <rect width="800" height="500" fill="#fff7ed"/>
    <rect x="120" y="80" width="560" height="340" fill="#9a3412"/>
    <rect x="140" y="110" width="520" height="18" fill="#fed7aa"/>
    <rect x="140" y="210" width="520" height="18" fill="#fed7aa"/>
    <rect x="140" y="310" width="520" height="18" fill="#fed7aa"/>
    <rect x="160" y="140" width="70" height="60" fill="#22c55e"/>
    <rect x="250" y="140" width="70" height="60" fill="#3b82f6"/>
    <rect x="340" y="140" width="70" height="60" fill="#eab308"/>
    <rect x="430" y="140" width="70" height="60" fill="#ef4444"/>
    <rect x="520" y="140" width="70" height="60" fill="#a855f7"/>
    <rect x="160" y="240" width="70" height="60" fill="#06b6d4"/>
    <rect x="250" y="240" width="70" height="60" fill="#f97316"/>
    <rect x="340" y="240" width="70" height="60" fill="#84cc16"/>
    <rect x="430" y="240" width="70" height="60" fill="#ec4899"/>
    <rect x="520" y="240" width="70" height="60" fill="#14b8a6"/>
  `, '#ffedd5'),

  'empty-chairs.svg': wrap('Phòng họp ghế trống', `
    <rect width="800" height="180" fill="#e2e8f0"/>
    <rect y="180" width="800" height="320" fill="#f8fafc"/>
    <rect x="180" y="210" width="440" height="150" rx="8" fill="#cbd5e1"/>
    <rect x="220" y="360" width="70" height="50" rx="8" fill="#64748b"/>
    <rect x="320" y="360" width="70" height="50" rx="8" fill="#64748b"/>
    <rect x="420" y="360" width="70" height="50" rx="8" fill="#64748b"/>
    <rect x="520" y="360" width="70" height="50" rx="8" fill="#64748b"/>
    <rect x="250" y="160" width="140" height="80" fill="#1e293b"/>
    <rect x="262" y="172" width="116" height="56" fill="#93c5fd"/>
  `, '#f1f5f9'),

  'pointing-board.svg': wrap('Nhân viên đang chỉ vào bảng', `
    <rect width="800" height="500" fill="#f8fafc"/>
    <rect x="360" y="70" width="340" height="220" fill="#334155"/>
    <rect x="376" y="86" width="308" height="188" fill="#e2e8f0"/>
    <rect x="400" y="120" width="180" height="10" fill="#38bdf8"/>
    <rect x="400" y="150" width="140" height="10" fill="#38bdf8"/>
    <rect x="400" y="180" width="200" height="10" fill="#38bdf8"/>
    <circle cx="240" cy="230" r="22" fill="#f4c7a1"/>
    <ellipse cx="240" cy="216" rx="22" ry="12" fill="#44403c"/>
    <rect x="216" y="252" width="50" height="64" rx="12" fill="#7c3aed"/>
    <rect x="212" y="314" width="18" height="50" rx="5" fill="#1e3a5f"/>
    <rect x="252" y="314" width="18" height="50" rx="5" fill="#1e3a5f"/>
    <rect x="266" y="262" width="100" height="10" rx="4" fill="#f4c7a1" transform="rotate(-12 316 267)"/>
  `, '#eef2ff'),

  'entrance.svg': wrap('Mọi người chờ ở lối vào', `
    <rect width="800" height="240" fill="#e0f2fe"/>
    <rect y="240" width="800" height="260" fill="#f1f5f9"/>
    <rect x="220" y="60" width="360" height="200" fill="#475569"/>
    <rect x="300" y="110" width="200" height="150" fill="#7dd3fc"/>
    <circle cx="300" cy="300" r="18" fill="#f4c7a1"/>
    <rect x="282" y="318" width="36" height="44" rx="8" fill="#0284c7"/>
    <circle cx="400" cy="296" r="18" fill="#f2c2a0"/>
    <rect x="382" y="314" width="36" height="44" rx="8" fill="#db2777"/>
    <circle cx="500" cy="302" r="18" fill="#f4c7a1"/>
    <rect x="482" y="320" width="36" height="44" rx="8" fill="#059669"/>
  `, '#f0f9ff'),

  'warehouse.svg': wrap('Kho hàng và lối vào', `
    <rect width="800" height="500" fill="#fefce8"/>
    <rect y="300" width="800" height="200" fill="#e7e5e4"/>
    <rect x="80" y="80" width="640" height="240" fill="#a8a29e"/>
    <rect x="120" y="120" width="80" height="160" fill="#facc15"/>
    <rect x="220" y="120" width="80" height="160" fill="#f59e0b"/>
    <rect x="500" y="120" width="80" height="160" fill="#eab308"/>
    <rect x="600" y="120" width="80" height="160" fill="#ca8a04"/>
    <rect x="340" y="180" width="120" height="140" fill="#44403c"/>
  `, '#fefce8'),

  'email.svg': wrap('Email công việc', `
    <rect width="800" height="500" fill="#f8fafc"/>
    <rect x="80" y="40" width="640" height="420" rx="12" fill="#ffffff" stroke="#cbd5e1"/>
    <rect x="80" y="40" width="640" height="54" rx="12" fill="#0f766e"/>
    <text x="110" y="75" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700">Inbox · Contract</text>
    <text x="110" y="130" fill="#334155" font-family="Segoe UI, Arial, sans-serif" font-size="16">From: billing@office.com</text>
    <text x="110" y="162" fill="#334155" font-family="Segoe UI, Arial, sans-serif" font-size="16">Subject: Please send the signed contract</text>
    <rect x="110" y="190" width="560" height="8" fill="#e2e8f0"/>
    <rect x="110" y="220" width="500" height="10" fill="#cbd5e1"/>
    <rect x="110" y="250" width="460" height="10" fill="#cbd5e1"/>
    <rect x="110" y="280" width="520" height="10" fill="#cbd5e1"/>
    <rect x="110" y="330" width="180" height="40" rx="8" fill="#0d9488"/>
    <text x="200" y="356" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="16">Attached</text>
  `, '#f0fdfa'),

  'advert.svg': wrap('Tờ quảng cáo giảm giá', `
    <rect width="800" height="500" fill="#fff7ed"/>
    <rect x="90" y="50" width="620" height="380" rx="16" fill="#9a3412"/>
    <text x="400" y="140" text-anchor="middle" fill="#fef3c7" font-family="Segoe UI, Arial, sans-serif" font-size="48" font-weight="700">20% OFF</text>
    <text x="400" y="200" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="28">All jackets until Sunday</text>
    <text x="400" y="270" text-anchor="middle" fill="#fed7aa" font-family="Segoe UI, Arial, sans-serif" font-size="20">While supplies last</text>
    <rect x="260" y="310" width="280" height="56" rx="10" fill="#facc15"/>
    <text x="400" y="348" text-anchor="middle" fill="#7c2d12" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700">Shop now</text>
  `, '#ffedd5'),

  'airport.svg': wrap('Thông báo sân bay', `
    <rect width="800" height="500" fill="#0f172a"/>
    <rect x="80" y="70" width="640" height="320" rx="12" fill="#1e293b"/>
    <text x="400" y="130" text-anchor="middle" fill="#38bdf8" font-family="Segoe UI, Arial, sans-serif" font-size="22">FLIGHT 208  ·  OSAKA</text>
    <text x="400" y="200" text-anchor="middle" fill="#f8fafc" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700">GATE B4</text>
    <text x="400" y="260" text-anchor="middle" fill="#facc15" font-family="Segoe UI, Arial, sans-serif" font-size="24">Boarding in 20 minutes</text>
    <text x="400" y="320" text-anchor="middle" fill="#94a3b8" font-family="Segoe UI, Arial, sans-serif" font-size="18">Please proceed to the gate</text>
  `, '#020617'),
}

for (const [name, xml] of Object.entries(scenes)) {
  writeFileSync(join(dir, name), xml)
}

console.log('wrote', Object.keys(scenes).length, 'scenes')
