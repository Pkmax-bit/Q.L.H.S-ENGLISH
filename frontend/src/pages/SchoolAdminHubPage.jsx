import { useState, useCallback, useMemo, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  Building2,
  FileText,
  ClipboardList,
  CalendarDays,
  Wallet,
  LayoutGrid,
  ArrowRight,
  ExternalLink,
  Plus,
  Settings2,
  DoorOpen,
  CalendarPlus,
  Sparkles,
  Pencil,
  Info,
  Flag,
} from 'lucide-react'
import clsx from 'clsx'

import ClassOverviewTab from '../components/classes/detail/ClassOverviewTab'
import ClassStudentsTab from '../components/classes/detail/ClassStudentsTab'
import ClassLessonsTab from '../components/classes/detail/ClassLessonsTab'
import ClassAssignmentsTab from '../components/classes/detail/ClassAssignmentsTab'
import LoadingSpinner from '../components/common/LoadingSpinner'

import TeacherList from '../components/teachers/TeacherList'
import StudentList from '../components/students/StudentList'
import SubjectList from '../components/subjects/SubjectList'
import ClassList from '../components/classes/ClassList'
import FacilityList from '../components/facilities/FacilityList'
import LessonList from '../components/lessons/LessonList'
import AssignmentList from '../components/assignments/AssignmentList'
import ScheduleView from '../components/schedules/ScheduleView'

import TeacherForm from '../components/teachers/TeacherForm'
import StudentForm from '../components/students/StudentForm'
import SubjectForm from '../components/subjects/SubjectForm'
import ClassForm from '../components/classes/ClassForm'
import FacilityForm from '../components/facilities/FacilityForm'
import LessonForm from '../components/lessons/LessonForm'
import AssignmentForm from '../components/assignments/AssignmentForm'
import ScheduleForm from '../components/schedules/ScheduleForm'

import ClassFeeSummary from '../components/tuition/ClassFeeSummary'
import TuitionPaymentDesk from '../components/tuition/TuitionPaymentDesk'
import TuitionInvoiceList from '../components/tuition/TuitionInvoiceList'
import ReceivablesReport from '../components/tuition/ReceivablesReport'
import FinanceList from '../components/finances/FinanceList'
import FinanceSummary from '../components/finances/FinanceSummary'
import CategoryManager from '../components/finances/CategoryManager'

import Button from '../components/common/Button'
import Select from '../components/common/Select'
import { useFetch } from '../hooks/useFetch'
import { AuthContext } from '../context/AuthContext'
import { ToastContext } from '../context/ToastContext'
import classesService from '../services/classes.service'
import facilitiesService from '../services/facilities.service'

const SECTIONS = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutGrid },
  { key: 'teachers', label: 'Giáo viên', icon: Users },
  { key: 'students', label: 'Học sinh', icon: GraduationCap },
  { key: 'subjects', label: 'Môn học', icon: BookOpen },
  { key: 'classes', label: 'Lớp học', icon: School },
  { key: 'facilities', label: 'Cơ sở & phòng', icon: Building2 },
  { key: 'lessons', label: 'Bài học', icon: FileText },
  { key: 'assignments', label: 'Bài tập', icon: ClipboardList },
  { key: 'schedules', label: 'Thời khóa biểu', icon: CalendarDays },
  { key: 'finances', label: 'Tài chính', icon: Wallet },
]

const FINANCE_TABS = [
  { key: 'class_fee', label: 'Học phí theo lớp' },
  { key: 'tuition_payment', label: 'Thu học phí' },
  { key: 'tuition_invoices', label: 'Hóa đơn' },
  { key: 'receivables', label: 'Công nợ' },
  { key: 'list', label: 'Sổ thu chi' },
  { key: 'summary', label: 'Tổng quan tài chính' },
  { key: 'categories', label: 'Danh mục' },
]

// Quick-create dock: keys ↔ section to refresh after creation
const QUICK_CREATE = [
  { key: 'teacher', label: 'Giáo viên', icon: Users, sectionKey: 'teachers' },
  { key: 'student', label: 'Học sinh', icon: GraduationCap, sectionKey: 'students' },
  { key: 'subject', label: 'Môn học', icon: BookOpen, sectionKey: 'subjects' },
  { key: 'class', label: 'Lớp học', icon: School, sectionKey: 'classes' },
  { key: 'facility', label: 'Cơ sở (tòa)', icon: Building2, sectionKey: 'facilities' },
  { key: 'room', label: 'Phòng học', icon: DoorOpen, sectionKey: 'facilities' },
  { key: 'lesson', label: 'Bài học', icon: FileText, sectionKey: 'lessons' },
  { key: 'assignment', label: 'Bài tập', icon: ClipboardList, sectionKey: 'assignments' },
  { key: 'schedule', label: 'Lịch học', icon: CalendarPlus, sectionKey: 'schedules' },
]

export default function SchoolAdminHubPage() {
  const { user } = useContext(AuthContext) || {}
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [financeTab, setFinanceTab] = useState('class_fee')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [creating, setCreating] = useState(null) // 'teacher' | 'student' | ...
  const [refreshKeys, setRefreshKeys] = useState({})
  const [roomParentId, setRoomParentId] = useState('')

  const fetchClasses = useCallback(() => classesService.getAll({ limit: 200 }), [])
  const { data: classesData, execute: reloadClasses } = useFetch(fetchClasses)
  const classList = useMemo(() => {
    if (Array.isArray(classesData)) return classesData
    return classesData?.classes || classesData?.data || []
  }, [classesData])

  const classOptions = useMemo(
    () => classList.map((c) => ({ value: c.id, label: c.name })),
    [classList],
  )
  const selectedClass = useMemo(
    () => classList.find((c) => c.id === selectedClassId) || null,
    [classList, selectedClassId],
  )

  const fetchFacilities = useCallback(
    () => facilitiesService.getAll({ limit: 200 }),
    [],
  )
  const { data: facilitiesData } = useFetch(fetchFacilities)
  const buildingOptions = useMemo(() => {
    const list = Array.isArray(facilitiesData)
      ? facilitiesData
      : facilitiesData?.facilities || facilitiesData?.data || []
    return list
      .filter((f) => f.type === 'building' || !f.parent_id)
      .map((b) => ({ value: b.id, label: b.name }))
  }, [facilitiesData])

  const isAdmin = user?.role === 'admin'

  const bumpRefresh = (sectionKey) => {
    setRefreshKeys((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || 0) + 1,
    }))
    if (sectionKey === 'classes') reloadClasses()
  }

  const handleCreated = (sectionKey) => {
    setCreating(null)
    setRoomParentId('')
    bumpRefresh(sectionKey)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-blue-600" />
            Trung tâm quản trị
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo và quản lý mọi thứ trên cùng một trang: giáo viên, học sinh, môn, lớp, bài học,
            bài tập, cơ sở vật chất, thời khóa biểu, tài chính.
          </p>
        </div>
        {!isAdmin && (
          <span className="px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
            Một số khu vực chỉ admin được thao tác đầy đủ
          </span>
        )}
      </div>

      {/* QUICK CREATE DOCK — luôn ở trên cùng */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-900">Tạo nhanh</h3>
          <span className="text-[11px] text-emerald-700">
            Bấm để mở form ngay tại đây — không phải chuyển trang
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_CREATE.map((q) => {
            const Icon = q.icon
            return (
              <button
                key={q.key}
                onClick={() => setCreating(q.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-sm text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                <Icon className="h-4 w-4" />
                {q.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Section nav */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 p-2 min-w-max">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const active = section === s.key
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Body — list components remount sau khi tạo mới để tự refetch */}
      <div>
        {section === 'overview' && (
          <OverviewPanel
            classCount={classList.length}
            onJump={(key) => setSection(key)}
            onQuickCreate={(key) => setCreating(key)}
            navigate={navigate}
          />
        )}
        {section === 'teachers' && <TeacherList key={refreshKeys.teachers || 0} />}
        {section === 'students' && <StudentList key={refreshKeys.students || 0} />}
        {section === 'subjects' && <SubjectList key={refreshKeys.subjects || 0} />}
        {section === 'classes' && <ClassList key={refreshKeys.classes || 0} />}
        {section === 'facilities' && <FacilityList key={refreshKeys.facilities || 0} />}
        {section === 'lessons' && <LessonList key={refreshKeys.lessons || 0} />}
        {section === 'assignments' && <AssignmentList key={refreshKeys.assignments || 0} />}
        {section === 'schedules' && <ScheduleView key={refreshKeys.schedules || 0} />}
        {section === 'finances' && (
          <FinanceSection activeTab={financeTab} setActiveTab={setFinanceTab} />
        )}
      </div>

      {/* CLASS OPERATIONS PANEL — chọn lớp và thao tác đầy đủ tại đây */}
      <ClassOperationsPanel
        classOptions={classOptions}
        classList={classList}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        navigate={navigate}
        onJumpToFinance={() => {
          setSection('finances')
          setFinanceTab('class_fee')
        }}
        onClassesChanged={() => {
          reloadClasses()
          bumpRefresh('classes')
        }}
      />

      {/* QUICK CREATE MODALS */}
      {creating === 'teacher' && (
        <TeacherForm
          isOpen
          onClose={() => setCreating(null)}
          teacher={null}
          onSuccess={() => handleCreated('teachers')}
        />
      )}
      {creating === 'student' && (
        <StudentForm
          isOpen
          onClose={() => setCreating(null)}
          student={null}
          onSuccess={() => handleCreated('students')}
        />
      )}
      {creating === 'subject' && (
        <SubjectForm
          isOpen
          onClose={() => setCreating(null)}
          subject={null}
          onSuccess={() => handleCreated('subjects')}
        />
      )}
      {creating === 'class' && (
        <ClassForm
          isOpen
          onClose={() => setCreating(null)}
          classData={null}
          onSuccess={() => handleCreated('classes')}
        />
      )}
      {creating === 'facility' && (
        <FacilityForm
          isOpen
          onClose={() => setCreating(null)}
          facility={null}
          onSuccess={() => handleCreated('facilities')}
        />
      )}
      {creating === 'room' && (
        <RoomQuickCreate
          buildingOptions={buildingOptions}
          parentId={roomParentId}
          setParentId={setRoomParentId}
          onClose={() => {
            setCreating(null)
            setRoomParentId('')
          }}
          onSuccess={() => handleCreated('facilities')}
        />
      )}
      {creating === 'lesson' && (
        <LessonForm
          isOpen
          onClose={() => setCreating(null)}
          lesson={null}
          defaultClassId={selectedClassId || undefined}
          onSuccess={() => handleCreated('lessons')}
        />
      )}
      {creating === 'assignment' && (
        <AssignmentForm
          isOpen
          onClose={() => setCreating(null)}
          assignment={null}
          defaultClassId={selectedClassId || undefined}
          onSuccess={() => handleCreated('assignments')}
        />
      )}
      {creating === 'schedule' && (
        <ScheduleForm
          isOpen
          onClose={() => setCreating(null)}
          schedule={null}
          existingSlots={[]}
          onSuccess={() => handleCreated('schedules')}
        />
      )}
    </div>
  )
}

function RoomQuickCreate({ buildingOptions, parentId, setParentId, onClose, onSuccess }) {
  // Bước 1: chọn cơ sở. Bước 2: render FacilityForm với parentId
  if (!parentId) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tạo phòng học mới</h3>
            <p className="text-xs text-gray-500 mt-1">Chọn cơ sở (tòa nhà) chứa phòng này.</p>
          </div>
          {buildingOptions.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Chưa có cơ sở nào — tạo cơ sở (tòa nhà) trước, rồi tạo phòng.
            </p>
          ) : (
            <Select
              label="Cơ sở (tòa nhà)"
              options={buildingOptions}
              value=""
              onChange={(e) => setParentId(e.target.value)}
              placeholder="— Chọn cơ sở —"
              required
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FacilityForm
      isOpen
      onClose={onClose}
      facility={null}
      parentId={parentId}
      onSuccess={onSuccess}
    />
  )
}

const CLASS_OP_TABS = [
  { key: 'overview', label: 'Thông tin lớp', icon: Info },
  { key: 'students', label: 'Học sinh', icon: Users },
  { key: 'lessons', label: 'Bài học', icon: BookOpen },
  { key: 'assignments', label: 'Bài tập', icon: ClipboardList },
]

function ClassOperationsPanel({
  classOptions,
  classList,
  selectedClassId,
  setSelectedClassId,
  navigate,
  onJumpToFinance,
  onClassesChanged,
}) {
  const { success, error: showError } = useContext(ToastContext) || {}
  const [opTab, setOpTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [endingClass, setEndingClass] = useState(false)

  const fetchOverview = useCallback(
    () => classesService.getOverview(selectedClassId),
    [selectedClassId],
  )
  const {
    data: overview,
    loading: loadingOverview,
    execute: reloadOverview,
    setData: setOverview,
  } = useFetch(fetchOverview, [selectedClassId], false)

  useEffect(() => {
    if (selectedClassId) {
      reloadOverview().catch(() => {})
    } else {
      setOverview(null)
    }
  }, [selectedClassId, reloadOverview, setOverview])

  const has = !!selectedClassId
  const selectedClassRow = classList.find((c) => c.id === selectedClassId) || null
  const classInfo = overview?.classInfo || null

  const handleEndClass = async () => {
    if (!selectedClassId) return
    if (!window.confirm('Gán ngày kết thúc lớp là hôm nay và đánh dấu lớp đã hoàn thành?'))
      return
    setEndingClass(true)
    try {
      await classesService.endClass(selectedClassId)
      success?.('Đã kết thúc lớp')
      reloadOverview()
      onClassesChanged?.()
    } catch (err) {
      showError?.(err.response?.data?.message || 'Không thể kết thúc lớp')
    } finally {
      setEndingClass(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <School className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-semibold text-blue-900">
          Trung tâm thao tác lớp học
        </h2>
        <span className="text-[11px] text-blue-700 bg-white/70 px-2 py-0.5 rounded-full">
          Sửa thông tin · ngày · môn · GV · học sinh · bài học · bài tập
        </span>
      </div>

      {/* Class picker */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <Select
            label="Chọn lớp để thao tác"
            options={classOptions}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            placeholder="— Chọn lớp —"
          />
          {has && selectedClassRow && (
            <p className="text-xs text-gray-600 mt-1.5">
              Đang chọn:{' '}
              <span className="font-semibold text-gray-800">{selectedClassRow.name}</span>
              {selectedClassRow.teacher_name && ` • GV: ${selectedClassRow.teacher_name}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            size="sm"
            variant="primary"
            icon={Pencil}
            disabled={!has}
            onClick={() => setEditing(true)}
          >
            Sửa thông tin lớp
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={Flag}
            disabled={!has || classInfo?.status === 'completed'}
            loading={endingClass}
            onClick={handleEndClass}
            className="border-amber-300 text-amber-800 hover:bg-amber-50"
          >
            Kết thúc lớp
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={Settings2}
            disabled={!has}
            onClick={onJumpToFinance}
          >
            Học phí
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={ExternalLink}
            disabled={!has}
            onClick={() => navigate(`/classes/${selectedClassId}`)}
          >
            Mở trang chi tiết
          </Button>
        </div>
      </div>

      {!has && (
        <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-3 border border-blue-100">
          Mẹo: chọn một lớp ở trên — toàn bộ thao tác (sửa ngày bắt đầu/kết thúc, gán môn,
          gán GV, quản lý học sinh, bài học, bài tập) sẽ hiện ngay tại đây mà không cần
          chuyển trang.
        </p>
      )}

      {has && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <nav className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
            {CLASS_OP_TABS.map((t) => {
              const Icon = t.icon
              const active = opTab === t.key
              let count = null
              if (overview?.stats) {
                if (t.key === 'students') count = overview.stats.student_count
                if (t.key === 'lessons') count = overview.stats.lesson_count
                if (t.key === 'assignments') count = overview.stats.assignment_count
              }
              return (
                <button
                  key={t.key}
                  onClick={() => setOpTab(t.key)}
                  className={clsx(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {count !== null && (
                    <span
                      className={clsx(
                        'px-1.5 py-0.5 rounded-full text-xs',
                        active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="p-3 sm:p-4">
            {loadingOverview && !overview ? (
              <LoadingSpinner message="Đang tải thông tin lớp..." />
            ) : !overview ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                Không tải được thông tin lớp.
              </p>
            ) : (
              <>
                {opTab === 'overview' && (
                  <ClassOverviewTab
                    classInfo={overview.classInfo}
                    stats={overview.stats}
                    onReload={reloadOverview}
                  />
                )}
                {opTab === 'students' && (
                  <ClassStudentsTab
                    classId={selectedClassId}
                    students={overview.students}
                    onReload={reloadOverview}
                  />
                )}
                {opTab === 'lessons' && (
                  <ClassLessonsTab
                    lessons={overview.lessons}
                    classId={selectedClassId}
                    onReload={reloadOverview}
                  />
                )}
                {opTab === 'assignments' && (
                  <ClassAssignmentsTab
                    assignments={overview.assignments}
                    classId={selectedClassId}
                    onReload={reloadOverview}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {editing && classInfo && (
        <ClassForm
          isOpen
          onClose={() => setEditing(false)}
          classData={classInfo}
          onSuccess={() => {
            setEditing(false)
            reloadOverview()
            onClassesChanged?.()
          }}
        />
      )}
    </div>
  )
}

function OverviewPanel({ classCount, onJump, onQuickCreate, navigate }) {
  const tiles = [
    {
      key: 'teachers',
      label: 'Giáo viên',
      icon: Users,
      desc: 'Thêm / sửa / xoá tài khoản giáo viên',
      color: 'blue',
      createKey: 'teacher',
    },
    {
      key: 'students',
      label: 'Học sinh',
      icon: GraduationCap,
      desc: 'Quản lý học sinh và tài khoản',
      color: 'emerald',
      createKey: 'student',
    },
    {
      key: 'subjects',
      label: 'Môn học',
      icon: BookOpen,
      desc: 'Danh mục môn dùng để phân lớp',
      color: 'indigo',
      createKey: 'subject',
    },
    {
      key: 'classes',
      label: 'Lớp học',
      icon: School,
      desc: `${classCount} lớp — tạo lớp, ghi danh, học phí`,
      color: 'sky',
      createKey: 'class',
    },
    {
      key: 'facilities',
      label: 'Cơ sở & phòng',
      icon: Building2,
      desc: 'Tòa, phòng học, phòng thực hành',
      color: 'amber',
      createKey: 'facility',
    },
    {
      key: 'lessons',
      label: 'Bài học',
      icon: FileText,
      desc: 'Tạo bộ bài học cho lớp',
      color: 'purple',
      createKey: 'lesson',
    },
    {
      key: 'assignments',
      label: 'Bài tập',
      icon: ClipboardList,
      desc: 'Giao bài tập, ngân hàng câu hỏi',
      color: 'fuchsia',
      createKey: 'assignment',
    },
    {
      key: 'schedules',
      label: 'Thời khóa biểu',
      icon: CalendarDays,
      desc: 'Lịch dạy theo lớp / phòng',
      color: 'rose',
      createKey: 'schedule',
    },
    {
      key: 'finances',
      label: 'Tài chính',
      icon: Wallet,
      desc: 'Học phí, hóa đơn, sổ thu chi',
      color: 'emerald',
    },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300',
    sky: 'bg-sky-50 text-sky-700 border-sky-100 hover:border-sky-300',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300',
    purple: 'bg-purple-50 text-purple-700 border-purple-100 hover:border-purple-300',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 hover:border-fuchsia-300',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 hover:border-rose-300',
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon
          return (
            <div
              key={t.key}
              className={clsx(
                'p-4 rounded-xl border-2 transition-all bg-white',
                colorMap[t.color] || colorMap.blue,
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <button
                  onClick={() => onJump(t.key)}
                  className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 hover:bg-white"
                >
                  Mở <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="font-semibold text-gray-900">{t.label}</div>
              <div className="text-xs text-gray-600 mt-0.5 mb-2">{t.desc}</div>
              {t.createKey && (
                <button
                  onClick={() => onQuickCreate(t.createKey)}
                  className="text-xs inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-900"
                >
                  <Plus className="h-3 w-3" /> Tạo mới ngay
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-blue-600" />
          Lối tắt khác
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/templates')}>
            Mẫu bài giảng
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/lesson-bundles')}>
            Bộ bài học
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/question-bank')}>
            Ngân hàng câu hỏi
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/enrollment-requests')}
          >
            Yêu cầu thêm học sinh
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/gradebook')}>
            Bảng điểm
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/submissions')}>
            Chấm bài
          </Button>
        </div>
      </div>
    </div>
  )
}

function FinanceSection({ activeTab, setActiveTab }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 p-2 min-w-max">
          {FINANCE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === t.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'class_fee' && <ClassFeeSummary />}
      {activeTab === 'tuition_payment' && <TuitionPaymentDesk />}
      {activeTab === 'tuition_invoices' && <TuitionInvoiceList />}
      {activeTab === 'receivables' && <ReceivablesReport />}
      {activeTab === 'list' && <FinanceList />}
      {activeTab === 'summary' && <FinanceSummary />}
      {activeTab === 'categories' && <CategoryManager />}
    </div>
  )
}
