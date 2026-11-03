import { getUnitAssets } from './tcoLessonAssets'
import { coursePhotoKindFromTitle } from './tcoCoursePhotos'
import { getCatalogPhotos } from './tcoPhotoCatalog'

export const UNIT_MEDIA = {
  1: { image: '/lesson-media/unit-01.svg', caption: 'Cấu trúc đề TOEIC 200 câu', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  2: { image: '/lesson-media/unit-02.svg', caption: 'Part 1 — Photographs (người)', youtube: 'https://www.youtube.com/watch?v=tvLb0iGnwQo' },
  3: { image: '/lesson-media/unit-03.svg', caption: 'Part 1 — Photographs (vật & cảnh)', youtube: 'https://www.youtube.com/watch?v=tvLb0iGnwQo' },
  4: { image: '/lesson-media/unit-04.svg', caption: 'Part 2 — Câu hỏi Wh-', youtube: 'https://www.youtube.com/watch?v=i2U0jCw8mCE' },
  5: { image: '/lesson-media/unit-05.svg', caption: 'Part 2 — Yes/No', youtube: 'https://www.youtube.com/watch?v=i2U0jCw8mCE' },
  6: { image: '/lesson-media/unit-06.svg', caption: 'Part 2 — Statement', youtube: 'https://www.youtube.com/watch?v=i2U0jCw8mCE' },
  7: { image: '/lesson-media/unit-07.svg', caption: 'Part 3 — Gist', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  8: { image: '/lesson-media/unit-08.svg', caption: 'Part 3 — Detail', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  9: { image: '/lesson-media/unit-09.svg', caption: 'Part 3 — Inference', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  10: { image: '/lesson-media/unit-10.svg', caption: 'Part 4 — Announcements', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  11: { image: '/lesson-media/unit-11.svg', caption: 'Part 4 — Talks', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  12: { image: '/lesson-media/unit-12.svg', caption: 'Part 4 — Messages', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  13: { image: '/lesson-media/unit-13.svg', caption: 'Part 5 — Word form', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  14: { image: '/lesson-media/unit-14.svg', caption: 'Part 5 — Tenses', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  15: { image: '/lesson-media/unit-15.svg', caption: 'Part 5 — Passive / to-V', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  16: { image: '/lesson-media/unit-16.svg', caption: 'Part 5 — Giới từ & liên từ', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  17: { image: '/lesson-media/unit-17.svg', caption: 'Part 6 — Text completion', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  18: { image: '/lesson-media/unit-18.svg', caption: 'Part 7 — Email / thư', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  19: { image: '/lesson-media/unit-19.svg', caption: 'Part 7 — Quảng cáo', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  20: { image: '/lesson-media/unit-20.svg', caption: 'Part 7 — Double passage', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  21: { image: '/lesson-media/unit-21.svg', caption: 'Part 7 — Triple passage', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  22: { image: '/lesson-media/unit-22.svg', caption: 'Ôn Listening Part 1–2', youtube: 'https://www.youtube.com/watch?v=tvLb0iGnwQo' },
  23: { image: '/lesson-media/unit-23.svg', caption: 'Ôn Listening Part 3–4', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  24: { image: '/lesson-media/unit-24.svg', caption: 'Ôn Reading Part 5–6', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  25: { image: '/lesson-media/unit-25.svg', caption: 'Ôn Reading Part 7', youtube: 'https://www.youtube.com/watch?v=JNf86bPBvq4' },
  26: { image: '/lesson-media/unit-26.svg', caption: 'Chiến lược thời gian', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  27: { image: '/lesson-media/unit-27.svg', caption: 'Mini full practice (1)', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  28: { image: '/lesson-media/unit-28.svg', caption: 'Mini full practice (2)', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
  29: { image: '/lesson-media/unit-29.svg', caption: 'Tổng kết 4 kỹ năng', youtube: 'https://www.youtube.com/watch?v=y4m0tdO-3GY' },
}

export function extractYoutubeId(url) {
  if (!url) return null
  const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

export function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(String(url || ''))
}

export function isVideoFileUrl(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(String(url || ''))
}

export function isAudioFileUrl(url) {
  return /\.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/i.test(String(url || ''))
}

function extraVideosFromContent(content) {
  const html = String(content || '')
  const urls = []
  const comment = html.match(/<!--tco-extra-videos:([^>]+)-->/i)
  if (comment) {
    comment[1].split('|').forEach((part) => {
      const url = part.trim()
      if (url) urls.push(url)
    })
  }
  const tagRe = /<video[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = tagRe.exec(html))) {
    if (!urls.includes(match[1])) urls.push(match[1])
  }
  return urls
}

export function getLessonMedia(lesson) {
  const title = String(lesson?.title || '')
  const unitMatch = title.match(/Unit\s*0?(\d+)\s*[·•|]/i)
  const unit = unitMatch ? Number(unitMatch[1]) : null
  const preset = unit ? UNIT_MEDIA[unit] : null
  const videoFile = isVideoFileUrl(lesson?.file_url) ? lesson.file_url : ''
  const extraVideos = extraVideosFromContent(lesson?.content).filter((url) => url !== videoFile)
  const youtube = videoFile ? '' : (lesson?.youtube_url || preset?.youtube || '')
  const images = []
  const seen = new Set()
  const addImage = (url, caption) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    images.push({ url, caption: caption || '' })
  }
  const assets = unit ? getUnitAssets(unit) : null
  const kind = coursePhotoKindFromTitle(title)
  getCatalogPhotos(unit, kind).forEach((item) => addImage(item.url, item.caption))
  if (isImageUrl(lesson?.file_url) && !String(lesson.file_url).includes('/lesson-media/')) {
    addImage(lesson.file_url, 'Ảnh đính kèm')
  }
  return {
    youtube,
    youtubeId: extractYoutubeId(youtube),
    images,
    sampleAudio: assets?.sample || '',
    fileUrl: lesson?.file_url || '',
    driveUrl: lesson?.drive_url || '',
    videoFile,
    extraVideos,
    audioFile: isAudioFileUrl(lesson?.file_url) ? lesson.file_url : '',
    caption: preset?.caption || '',
  }
}
