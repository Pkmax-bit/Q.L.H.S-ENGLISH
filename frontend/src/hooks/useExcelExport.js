import { useCallback } from 'react'
import * as XLSX from 'xlsx'

export function useExcelExport() {
  const exportToExcel = useCallback((data, columns, fileName = 'export') => {
    const headers = columns.map((col) => col.header || col.label || col.key)
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = col.accessor ? col.accessor(item) : item[col.key]
        return value ?? ''
      })
    )

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')

    // Auto-width columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[i]).length)
      )
      return { wch: Math.min(maxLen + 2, 50) }
    })
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }, [])

  return { exportToExcel }
}
