import { useCallback, useEffect, useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import socialService from '../services/social.service'
import SocialFeedHero from '../components/social/SocialFeedHero'
import SocialFeedSidebar from '../components/social/SocialFeedSidebar'
import SocialMemberSearch from '../components/social/SocialMemberSearch'
import SocialPostComposer, { SocialPostComposerModal } from '../components/social/SocialPostComposer'
import SocialPostCard from '../components/social/SocialPostCard'

export default function SocialFeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [list, feedStats] = await Promise.all([
        socialService.listFeed({ limit: 30 }),
        socialService.getStats().catch(() => null),
      ])
      setPosts(list || [])
      if (feedStats) setStats(feedStats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handlePosted = (post) => {
    setPosts((prev) => [post, ...prev])
    setStats((s) => s ? { ...s, posts_today: (s.posts_today || 0) + 1 } : s)
  }

  const handleUpdate = (updated) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
  }

  const handleDelete = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="max-w-[1280px] mx-auto px-1 sm:px-0">
      <SocialFeedHero
        user={user}
        stats={stats}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        onCreatePost={() => setComposerOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4 min-w-0">
          <SocialMemberSearch />
          <SocialPostComposer variant="collapsed" onPosted={handlePosted} />

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm bg-white/70 backdrop-blur-xl rounded-2xl border border-dashed border-slate-200/80 shadow-sm animate-rise-in">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-600" />
              </div>
              <p className="font-display font-semibold text-slate-700">Chưa có bài viết</p>
              <p className="mt-1 text-xs">Hãy là người đầu tiên đăng lên bảng tin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        <SocialFeedSidebar posts={posts} />
      </div>

      <SocialPostComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPosted={(post) => {
          handlePosted(post)
          setComposerOpen(false)
        }}
      />
    </div>
  )
}
