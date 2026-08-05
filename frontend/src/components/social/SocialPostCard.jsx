import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../hooks/useAuth'
import { bubbleGradient } from '../../lib/messengerUtils'
import { mediaUrl, timeAgo, profileRoleLabel, initials } from '../../lib/socialUtils'
import socialService from '../../services/social.service'
import SocialAvatar from './SocialAvatar'

export default function SocialPostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(!!post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)

  useEffect(() => {
    setLiked(!!post.liked_by_me)
    setLikeCount(post.like_count || 0)
    setCommentCount(post.comment_count || 0)
  }, [post])

  const author = post.author || {}
  const canDelete = user?.role === 'admin' || String(post.author_id) === String(user?.id)
  const image = mediaUrl(post.image_url)

  const toggleLike = async () => {
    const prevLiked = liked
    const prevCount = likeCount
    setLiked(!prevLiked)
    setLikeCount((c) => Math.max(0, c + (prevLiked ? -1 : 1)))
    try {
      const res = await socialService.toggleLike(post.id)
      setLiked(!!res.liked)
      onUpdate?.({ ...post, liked_by_me: res.liked, like_count: prevCount + (res.liked ? 1 : -1) })
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    }
  }

  const openComments = async () => {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0) {
      setLoadingComments(true)
      try {
        const list = await socialService.listComments(post.id)
        setComments(list || [])
      } finally {
        setLoadingComments(false)
      }
    }
  }

  const submitComment = async () => {
    const text = commentText.trim()
    if (!text) return
    setCommentBusy(true)
    try {
      const c = await socialService.addComment(post.id, text)
      setComments((prev) => [...prev, c])
      setCommentCount((n) => n + 1)
      setCommentText('')
      onUpdate?.({ ...post, comment_count: commentCount + 1 })
    } finally {
      setCommentBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Xóa bài viết này?')) return
    await socialService.deletePost(post.id)
    onDelete?.(post.id)
  }

  return (
    <article className="rounded-2xl bg-white/75 backdrop-blur-md border border-white/60 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Link to={`/social/u/${author.id || post.author_id}`} className="shrink-0">
          <SocialAvatar user={author} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/social/u/${author.id || post.author_id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700">
                {author.full_name || 'Thành viên'}
              </Link>
              <p className="text-xs text-stone-500">{profileRoleLabel(author.role)} · {timeAgo(post.created_at)}</p>
            </div>
            {canDelete && (
              <button type="button" onClick={handleDelete} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          {post.body && (
            <p className="text-sm text-stone-800 whitespace-pre-wrap mt-2">{post.body}</p>
          )}
          {image && (
            <img src={image} alt="" className="mt-3 rounded-xl max-h-96 w-full object-cover border border-slate-100" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={toggleLike}
          className={clsx(
            'inline-flex items-center gap-1.5 text-sm font-medium transition',
            liked ? 'text-rose-600' : 'text-stone-500 hover:text-rose-600',
          )}
        >
          <Heart className={clsx('h-4 w-4', liked && 'fill-current')} />
          {likeCount > 0 ? likeCount : 'Thích'}
        </button>
        <button
          type="button"
          onClick={openComments}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 ? commentCount : 'Bình luận'}
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 pt-2 border-t border-slate-50">
          {loadingComments ? (
            <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: bubbleGradient(c.author?.full_name) }}
                  >
                    {initials(c.author?.full_name, 1)}
                  </div>
                  <div className="bg-slate-50 rounded-2xl px-3 py-2 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-800">{c.author?.full_name || 'Thành viên'}</p>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{c.body}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-2">Chưa có bình luận</p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
              placeholder="Viết bình luận…"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={commentBusy || !commentText.trim()}
              className="p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
            >
              {commentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
