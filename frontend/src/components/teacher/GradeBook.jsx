import { useState, useCallback } from 'react'
import { Download, Users, BookOpen } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import Select from '../common/Select'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import submissionsService from '../../services/submissions.service'
import classesService from '../../services/classes.service'

export default function GradeBook() {
  const [selectedClassId, setSelectedClassId] = useState('')
  const { exportToExcel } = useExcelExport()

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map(c => ({ value: c.id, label: c.name }))

  const fetchGradeBook = useCallback(
    () => selectedClassId ? submissionsService.getGradeBook(selectedClassId) : Promise.resolve({ data: null }),
    [selectedClassId]
  )
  const { data: gbData, loading } = useFetch(fetchGradeBook, [selectedClassId])
  const gradeBook = gbData?.data || gbData

  const assignments = gradeBook?.assignments || []
  const students = gradeBook?.students || []
  const submissionMap = gradeBook?.submissionMap || {}

  const getScore = (assignmentId, studentId) => {
    const sub = submissionMap[assignmentId]?.[studentId]
    if (!sub) return null
    return sub
  }

  const getStudentTotal = (studentId) => {
    let total = 0, maxTotal = 0, count = 0
    assignments.forEach(a => {
      const sub = getScore(a.id, studentId)
      maxTotal += (a.total_points || 0)
      if (sub && sub.status === 'graded' && sub.score !== null) {
        total += sub.score
        count++
      }
    })
    return { total, maxTotal, count }
  }

  const handleExport = () => {
    const rows = students.map(s => {
      const row = { 'Họ tên': s.full_name, 'Email': s.email || '' }
      assignments.forEach(a => {
        const sub = getScore(a.id, s.id)
        row[a.title] = sub?.status === 'graded' ? sub.score : sub ? 'Chờ chấm' : '—'
      })
      const { total, maxTotal } = getStudentTotal(s.id)
      row['Tổng điểm'] = `${total}/${maxTotal}`
      return row
    })
    const cols = [
      { key: 'Họ tên', header: 'Họ tên' },
      { key: 'Email', header: 'Email' },
      ...assignments.map(a => ({ key: a.title, header: a.title })),
      { key: 'Tổng điểm', header: 'Tổng điểm' },
    ]
    exportToExcel(rows, cols, `bang-diem-${selectedClassId}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điểm</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng hợp điểm theo lớp</p>
        </div>
        {selectedClassId && students.length > 0 && (
          <Button variant="outline" icon={Download} onClick={handleExport}>Xuất Excel</Button>
        )}
      </div>

      <div className="mb-6 max-w-sm">
        <Select
          label="Chọn lớp"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          options={classOptions}
          placeholder="Chọn lớp học..."
        />
      </div>

      {!selectedClassId ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chọn lớp để xem bảng điểm</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Lớp chưa có học sinh</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-r border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                  Học sinh
                </th>
                {assignments.map(a => (
                  <th key={a.id} className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 min-w-[100px]">
                    <div className="truncate max-w-[120px]" title={a.title}>{a.title}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{a.total_points} điểm</div>
                  </th>
                ))}
                <th className="border-b border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-blue-600 min-w-[100px] bg-blue-50">
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, sIdx) => {
                const { total, maxTotal, count } = getStudentTotal(student.id)
                const percent = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0

                return (
                  <tr key={student.id} className={sIdx % 2 === 0 ? '' : 'bg-gray-50/50'}>
                    <td className="border-b border-r border-gray-200 px-3 py-2 sticky left-0 bg-white z-10">
                      <p className="text-sm font-medium text-gray-800">{student.full_name}</p>
                      <p className="text-[10px] text-gray-400">{student.email}</p>
                    </td>
                    {assignments.map(a => {
                      const sub = getScore(a.id, student.id)
                      return (
                        <td key={a.id} className="border-b border-r border-gray-200 px-3 py-2 text-center">
                          {!sub ? (
                            <span className="text-gray-300">—</span>
                          ) : sub.status === 'graded' ? (
                            <span className={`font-semibold ${
                              (sub.score / (a.total_points || 1)) >= 0.75 ? 'text-green-600' :
                              (sub.score / (a.total_points || 1)) >= 0.5 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {sub.score}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500 font-medium">⏳</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="border-b border-gray-200 px-3 py-2 text-center bg-blue-50/50">
                      <span className="text-sm font-bold text-blue-700">{total}</span>
                      <span className="text-xs text-gray-400">/{maxTotal}</span>
                      <div className="text-[10px] text-gray-400">{percent}%</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
