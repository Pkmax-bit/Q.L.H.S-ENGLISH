/**
 * Copy unique TCO 550+ lecture videos into backend/uploads/tco
 * and attach each file to the matching lesson.
 *
 * Usage (from backend/):
 *   node src/scripts/attach-tco-media.js
 *   TCO_MEDIA_DIR="C:\\path\\to\\TOEIC-Compact-550+" node src/scripts/attach-tco-media.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_SRC = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Downloads',
  'TOEIC-Compact-550+',
  'TOEIC-Compact-550+'
)
const SRC = process.env.TCO_MEDIA_DIR || DEFAULT_SRC
const DEST = path.join(__dirname, '../../uploads/tco')
const EXTRA_MARK = 'data-tco-extra-videos'

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function uniqueVideosIn(dir) {
  if (!fs.existsSync(dir)) return []
  const files = walk(dir).filter((file) => {
    const name = path.basename(file)
    const rel = file.slice(dir.length).replace(/\\/g, '/')
    if (rel.includes('/screenshots/')) return false
    if (rel.includes('/mini-test/')) return false
    return /_video_\d+\.mp4$/i.test(name)
  })
  files.sort((a, b) => a.localeCompare(b, 'en'))
  const seen = new Set()
  const unique = []
  for (const file of files) {
    const size = fs.statSync(file).size
    if (seen.has(size)) continue
    seen.add(size)
    unique.push(file)
  }
  return unique
}

function classifyLesson(title) {
  const unitMatch = String(title || '').match(/Unit\s*0?(\d+)/i)
  const unit = unitMatch ? Number(unitMatch[1]) : null
  const rest = String(title || '').replace(/^.*?Unit\s*0?\d+\s*[·•|]\s*/i, '').trim()

  if (/^Extension\b/i.test(rest)) return { unit, kind: 'extension' }
  if (/^Mini\s*Test\b/i.test(rest)) return { unit, kind: 'mini-test' }
  const lessonMatch = rest.match(/^Lesson\s+(\d+)/i)
  if (lessonMatch) return { unit, kind: `lesson-${lessonMatch[1]}` }

  if (unit === 1) {
    if (/TOEIC có thật sự khó/i.test(rest)) return { unit, kind: 'lesson-1' }
    if (/Tìm hiểu TOEIC/i.test(rest)) return { unit, kind: 'lesson-2' }
    if (/Hướng dẫn học tập/i.test(rest)) return { unit, kind: 'lesson-3' }
  }
  return { unit, kind: 'other' }
}

function sourceVideosFor(unit, kind) {
  const unitDir = path.join(SRC, `unit-${unit}`)
  if (!fs.existsSync(unitDir)) return []
  if (kind === 'extension') return uniqueVideosIn(path.join(unitDir, 'extension'))
  if (/^lesson-\d+$/.test(kind)) return uniqueVideosIn(path.join(unitDir, kind))
  return []
}

function stripExtraBlock(html) {
  const text = String(html || '')
  return text
    .replace(new RegExp(`<div[^>]*${EXTRA_MARK}[^>]*>[\\s\\S]*?<\\/div>`, 'gi'), '')
    .replace(/<!--tco-extra-videos:[^>]*-->/gi, '')
    .trim()
}

function extraBlock(urls) {
  if (!urls.length) return ''
  return `<!--tco-extra-videos:${urls.join('|')}-->`
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) {
    return { copied: false }
  }
  fs.copyFileSync(src, dest)
  return { copied: true }
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Không thấy thư mục media: ${SRC}`)
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
  if (!url || !key) {
    console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title, content, file_url, youtube_url, is_template')
    .or('title.ilike.%TCO 550+%,title.ilike.%TCO 550 +%')
    .order('order_index')

  if (error) throw error

  fs.mkdirSync(DEST, { recursive: true })

  let copied = 0
  let updated = 0
  let skipped = 0
  const report = []

  for (const lesson of lessons || []) {
    const { unit, kind } = classifyLesson(lesson.title)
    if (!unit || kind === 'mini-test' || kind === 'other') {
      skipped += 1
      report.push({ title: lesson.title, action: 'skip', reason: kind || 'unmapped' })
      continue
    }

    const videos = sourceVideosFor(unit, kind)
    if (!videos.length) {
      skipped += 1
      report.push({ title: lesson.title, action: 'skip', reason: 'no-video' })
      continue
    }

    const urls = []
    videos.forEach((src, idx) => {
      const destName = `u${String(unit).padStart(2, '0')}-${kind}-${idx + 1}.mp4`
      const dest = path.join(DEST, destName)
      const result = copyFile(src, dest)
      if (result.copied) copied += 1
      urls.push(`/uploads/tco/${destName}`)
    })

    const [fileUrl, ...extraUrls] = urls
    const nextContent = [stripExtraBlock(lesson.content), extraBlock(extraUrls)]
      .filter(Boolean)
      .join('\n')

    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        file_url: fileUrl,
        youtube_url: null,
        content: nextContent,
        content_type: 'video',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id)

    if (updateError) {
      console.error(`Lỗi cập nhật ${lesson.title}:`, updateError.message)
      continue
    }

    updated += 1
    report.push({
      title: lesson.title,
      action: 'attached',
      file: fileUrl,
      extra: extraUrls.length,
    })
    console.log(`OK  ${lesson.title}`)
    console.log(`    ${fileUrl}${extraUrls.length ? ` +${extraUrls.length} video phụ` : ''}`)
  }

  console.log('\n===== TÓM TẮT =====')
  console.log(`Bài đã gắn video: ${updated}`)
  console.log(`Bài bỏ qua: ${skipped}`)
  console.log(`File copy mới: ${copied}`)
  console.log(`Thư mục: ${DEST}`)

  const skipReasons = report.filter((row) => row.action === 'skip')
  if (skipReasons.length) {
    console.log('\nBỏ qua:')
    skipReasons.forEach((row) => console.log(`  - ${row.title} (${row.reason})`))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
