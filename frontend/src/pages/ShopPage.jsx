import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gamepad2, Star, ShoppingBag, Play, Loader2, History, Lock } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import RankBadgeCard from '../components/dashboard/RankBadgeCard'
import { useFetch } from '../hooks/useFetch'
import shopService from '../services/shop.service'
import { buildRankProfileFromEarned } from '../lib/rankUtils'
import { formatDate } from '../utils/formatDate'

export default function ShopPage() {
  const navigate = useNavigate()
  const [buyingId, setBuyingId] = useState(null)
  const [error, setError] = useState('')

  const fetchWallet = useCallback(() => shopService.getWallet(), [])
  const fetchItems = useCallback(() => shopService.listItems(), [])
  const fetchLedger = useCallback(() => shopService.listLedger(12), [])

  const { data: wallet, loading: walletLoading, execute: refetchWallet } = useFetch(fetchWallet)
  const { data: items, loading: itemsLoading, execute: refetchItems } = useFetch(fetchItems)
  const { data: ledger, loading: ledgerLoading, execute: refetchLedger } = useFetch(fetchLedger)

  const balance = wallet?.balance ?? 0
  const earned = wallet?.earned ?? 0
  const rank = buildRankProfileFromEarned(earned)
  const catalog = Array.isArray(items) ? items : []

  const handleBuy = async (item) => {
    if (!item?.id || buyingId) return
    if (balance < item.cost) {
      setError(`Cần ${item.cost} điểm sao (đang có ${balance}). Làm bài tập để tích thêm!`)
      return
    }
    setError('')
    setBuyingId(item.id)
    try {
      await shopService.purchase(item.id)
      await Promise.all([refetchWallet(), refetchItems(), refetchLedger()])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Mua không thành công')
    } finally {
      setBuyingId(null)
    }
  }

  if (walletLoading || itemsLoading) {
    return <LoadingSpinner message="Đang tải cửa hàng..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary-600" />
            Cửa hàng game
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Làm bài tập để kiếm điểm sao — mua game và lên level
          </p>
        </div>
        <Link
          to="/my-assignments"
          className="text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          Làm bài tập →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-[#0c1f33] to-[#15556e] p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/20 ring-1 ring-amber-300/40">
                <Star className="h-5 w-5 text-amber-300 fill-amber-300" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Số dư</p>
                <p className="text-2xl font-semibold tabular-nums">{balance} <span className="text-sm font-medium text-white/70">điểm sao</span></p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/15 hidden sm:block" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Đã kiếm (XP)</p>
              <p className="text-lg font-semibold tabular-nums">{earned}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Level</p>
              <p className="text-lg font-semibold">
                {rank.tier.name} · Lv.{rank.level}
              </p>
            </div>
          </div>
          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-[10px] font-semibold text-white/70 mb-1">
              <span>Tiến độ lên level {rank.level + 1}</span>
              <span className="tabular-nums">{rank.progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-white transition-all"
                style={{ width: `${rank.progressPct}%` }}
              />
            </div>
          </div>
        </div>
        <RankBadgeCard profile={rank} />
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-primary-600" />
          Game có sẵn
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-sm flex flex-col"
            >
              <div className="relative h-36 bg-gradient-to-br from-emerald-800 via-stone-800 to-[#0c1f33] flex items-center justify-center">
                <Gamepad2 className="h-14 w-14 text-emerald-200/80" />
                {item.owned ? (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-emerald-500 text-white">
                    Đã mở
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-black/40 text-white backdrop-blur">
                    <Lock className="h-3 w-3" /> {item.cost} sao
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1 gap-3">
                <div>
                  <h3 className="font-semibold text-stone-900">{item.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-3">{item.description}</p>
                </div>
                <div className="mt-auto flex gap-2">
                  {item.owned ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/shop/play/${item.slug}`)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 text-white text-sm font-semibold py-2.5 hover:bg-primary-700 transition"
                    >
                      <Play className="h-4 w-4" /> Chơi ngay
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!!buyingId}
                      onClick={() => handleBuy(item)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-semibold py-2.5 hover:bg-amber-100 transition disabled:opacity-60"
                    >
                      {buyingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      )}
                      Mua · {item.cost}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!catalog.length && (
            <p className="text-sm text-stone-500 col-span-full text-center py-8">Chưa có game nào</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
          <History className="h-5 w-5 text-primary-600" />
          Lịch sử điểm gần đây
        </h2>
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          {ledgerLoading ? (
            <p className="text-sm text-stone-400 p-4">Đang tải…</p>
          ) : Array.isArray(ledger) && ledger.length ? (
            <ul className="divide-y divide-stone-100">
              {ledger.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 truncate">{row.note || row.reason}</p>
                    <p className="text-xs text-stone-400">{formatDate(row.created_at)}</p>
                  </div>
                  <span
                    className={`tabular-nums font-semibold shrink-0 ${
                      row.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {row.delta >= 0 ? '+' : ''}{row.delta}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-400 p-4 text-center">
              Chưa có giao dịch — nộp bài tập để nhận điểm sao
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
