import { getCoursePhotos } from './tcoCoursePhotos'

const P = '/uploads/tco/photos'

const CAPTIONS = {
  [`${P}/u02-lesson-1-1.jpg`]: 'Người đàn ông đang với tay lấy sách trên kệ',
  [`${P}/u02-lesson-1-2.jpg`]: 'Hai người đang trao đổi trước máy tính',
  [`${P}/u02-lesson-1-6.jpg`]: 'Người đàn ông vừa kéo vali vừa nói điện thoại',
  [`${P}/u02-lesson-1-8.jpg`]: 'Người đàn ông đang ngồi câu cá trên cầu gỗ',
  [`${P}/u02-lesson-2-1.jpg`]: 'Người giao hàng đang xếp thùng lên xe đẩy',
  [`${P}/u02-lesson-2-2.jpg`]: 'Hai người đang xem sản phẩm trong siêu thị',
  [`${P}/u02-lesson-2-4.jpg`]: 'Người phụ nữ đang dùng laptop trên giường',
  [`${P}/u02-lesson-3-1.jpg`]: 'Tủ hồ sơ: ngăn dưới đang mở',
  [`${P}/u02-lesson-3-4.jpg`]: 'Bảng ghim với giấy ghi chú',
  [`${P}/u03-lesson-3-1.jpg`]: 'Phòng khách sạn trống: giường, sofa, bàn',
  [`${P}/u03-lesson-3-3.jpg`]: 'Nhiều xe đang đỗ trong bãi xe',
  [`${P}/u03-lesson-3-4.jpg`]: 'Tòa nhà văn phòng bên hồ',
  [`${P}/u03-lesson-3-13.jpg`]: 'Mô hình nhà, chìa khóa và bản vẽ',
  [`${P}/u22-lesson-1-1.jpg`]: 'Người đàn ông đang kiểm tra khoang máy xe',
  [`${P}/u22-lesson-1-2.jpg`]: 'Hai người đang nấu ăn trên bếp',
  [`${P}/u22-lesson-1-3.jpg`]: 'Hai người đang ngồi trên ghế nhìn ra hồ',
  [`${P}/u22-lesson-1-4.jpg`]: 'Người đàn ông đang ngồi trên thuyền',
  [`${P}/u27-lesson-3-1.jpg`]: 'Phòng khách sạn trống: giường và sofa',
}

/** Ảnh lấy đúng thư mục bài trong pack. Không dùng chéo unit/bài. */
const PICK = {
  2: {
    'lesson-1': ['u02-lesson-1-1.jpg', 'u02-lesson-1-2.jpg', 'u02-lesson-1-6.jpg', 'u02-lesson-1-8.jpg'],
    'lesson-2': ['u02-lesson-2-1.jpg', 'u02-lesson-2-2.jpg', 'u02-lesson-2-4.jpg'],
    'lesson-3': ['u02-lesson-3-1.jpg', 'u02-lesson-3-4.jpg'],
    extension: [],
    'mini-test': ['u02-lesson-1-1.jpg', 'u02-lesson-1-2.jpg', 'u02-lesson-2-1.jpg', 'u02-lesson-2-2.jpg'],
  },
  3: {
    'lesson-1': [],
    'lesson-2': [],
    'lesson-3': ['u03-lesson-3-1.jpg', 'u03-lesson-3-3.jpg', 'u03-lesson-3-4.jpg', 'u03-lesson-3-13.jpg'],
    'mini-test': ['u03-lesson-3-1.jpg', 'u03-lesson-3-3.jpg'],
  },
  22: {
    'lesson-1': ['u22-lesson-1-1.jpg', 'u22-lesson-1-2.jpg', 'u22-lesson-1-3.jpg', 'u22-lesson-1-4.jpg'],
    'lesson-2': [],
  },
  27: {
    'lesson-1': [],
    'lesson-2': [],
    'lesson-3': ['u27-lesson-3-1.jpg'],
  },
}

function kindLabel(kind) {
  if (kind === 'extension') return 'Mở rộng'
  if (kind === 'mini-test') return 'Mini Test'
  const n = String(kind || '').match(/lesson-(\d+)/)
  return n ? `Bài ${n[1]}` : 'Bài học'
}

function fromNames(names) {
  return names.map((name) => {
    const url = `${P}/${name}`
    return { url, caption: CAPTIONS[url] || '' }
  })
}

function autoFromLesson(unit, kind) {
  return getCoursePhotos(unit, kind)
    .filter((url) => /\.jpe?g(\?|$)/i.test(url))
    .slice(0, 4)
    .map((url) => ({
      url,
      caption: CAPTIONS[url] || `Ảnh học liệu Unit ${String(unit).padStart(2, '0')} · ${kindLabel(kind)}`,
    }))
}

export function getCatalogPhotos(unit, kind) {
  const unitNo = Number(unit)
  if (!unitNo || !kind) return []
  const picked = PICK[unitNo]?.[kind]
  if (Array.isArray(picked)) return fromNames(picked)
  return autoFromLesson(unitNo, kind)
}
