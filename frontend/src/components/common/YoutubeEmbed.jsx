import { Youtube, ExternalLink } from 'lucide-react'
import { extractYoutubeId } from '../../utils/mediaUrl'

/**
 * Nhúng video YouTube trong trang; URL không parse được thì chỉ hiện liên kết ngoài.
 */
export default function YoutubeEmbed({ url, title = 'Video', className = '' }) {
  if (!url || typeof url !== 'string' || !url.trim()) return null
  const trimmed = url.trim()
  const ytId = extractYoutubeId(trimmed)

  return (
    <div className={className}>
      {ytId ? (
        <div
          className="relative w-full rounded-xl overflow-hidden bg-black border border-gray-200 shadow-sm"
          style={{ aspectRatio: '16/9' }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : null}

      <div className={`flex flex-wrap items-center gap-2 ${ytId ? 'mt-2' : ''}`}>
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 bg-red-50 px-3 py-1.5 rounded-lg"
        >
          <Youtube className="h-4 w-4 flex-shrink-0" />
          {ytId ? 'Mở trên YouTube' : 'Xem video'}
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>
    </div>
  )
}
