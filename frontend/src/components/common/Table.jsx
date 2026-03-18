import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Eye } from 'lucide-react'
import clsx from 'clsx'
import Pagination from './Pagination'
import SearchBar from './SearchBar'
import EmptyState from './EmptyState'
import LoadingSpinner from './LoadingSpinner'

export default function Table({
  columns,
  data = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Tìm kiếm...',
  onEdit,
  onDelete,
  onView,
  actions,
  pageSize = 10,
  emptyMessage = 'Không có dữ liệu',
  emptyIcon,
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  const filteredData = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((item) =>
      columns.some((col) => {
        const val = col.accessor ? col.accessor(item) : item[col.key]
        return val != null && String(val).toLowerCase().includes(q)
      })
    )
  }, [data, search, columns])

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    const col = columns.find((c) => c.key === sortKey)
    return [...filteredData].sort((a, b) => {
      const aVal = col?.accessor ? col.accessor(a) : a[sortKey]
      const bVal = col?.accessor ? col.accessor(b) : b[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal), 'vi')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredData, sortKey, sortDir, columns])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const hasActions = onEdit || onDelete || onView || actions

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      {searchable && (
        <div className="mb-4">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val)
              setCurrentPage(1)
            }}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left font-medium text-gray-600',
                    col.sortable !== false && 'cursor-pointer select-none hover:text-gray-900 transition-colors'
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="text-gray-400">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-3 text-right font-medium text-gray-600 w-32">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="py-12">
                  <EmptyState message={emptyMessage} icon={emptyIcon} />
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={item._id || item.id || idx}
                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render
                        ? col.render(item)
                        : col.accessor
                          ? col.accessor(item)
                          : item[col.key] ?? '—'}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <button
                            onClick={() => onView(item)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {actions && actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={sortedData.length}
            pageSize={pageSize}
          />
        </div>
      )}
    </div>
  )
}
