import { useState, useContext, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, Filter, MessageSquare } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import Modal from '../common/Modal'
import EmptyState from '../common/EmptyState'
import { useFetch } from '../../hooks/useFetch'
import { useAuth } from '../../hooks/useAuth'
import { ToastContext } from '../../context/ToastContext'
import enrollmentRequestsService from '../../services/enrollmentRequests.service'

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function EnrollmentRequestList() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'

  const [statusFilter, setStatusFilter] = useState('pending')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState(null) // 'approve' | 'reject'
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchRequests = useCallback(
    () => enrollmentRequestsService.getAll({ status: statusFilter || undefined, limit: 100 }),
    [statusFilter]
  )
  const { data: requestsData, loading, execute: reload } = useFetch(fetchRequests, [statusFilter])
  const requests = Array.isArray(requestsData) ? requestsData : requestsData?.requests || []

  const openReview = (request, action) => {
    setSelectedRequest(request)
    setReviewAction(action)
    setReviewNote('')
    setShowReviewModal(true)
  }

  const handleReview = async () => {
    if (!selectedRequest || !reviewAction) return
    setProcessing(true)
    try {
      if (reviewAction === 'approve') {
        await enrollmentRequestsService.approve(selectedRequest.id, { review_note: reviewNote || undefined })
        success(`Đã duyệt yêu cầu thêm "${selectedRequest.student_name}" vào lớp "${selectedRequest.class_name}"`)
      } else {
        await enrollmentRequestsService.reject(selectedRequest.id, { review_note: reviewNote || undefined })
        success(`Đã từ chối yêu cầu thêm "${selectedRequest.student_name}"`)
      }
      setShowReviewModal(false)
      setSelectedRequest(null)
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setProcessing(false)
    }
  }

  const handleQuickApprove = async (request) => {
    try {
      await enrollmentRequestsService.approve(request.id, {})
      success(`Đã duyệt: "${request.student_name}" → "${request.class_name}"`)
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Duyệt thất bại')
    }
  }

  const handleCancelRequest = async (request) => {
    try {
      await enrollmentRequestsService.cancel(request.id)
      success(`Đã hủy yêu cầu thêm "${request.student_name}"`)
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Hủy thất bại')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yêu cầu thêm học sinh</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Duyệt yêu cầu từ giáo viên' : 'Theo dõi yêu cầu bạn đã gửi'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        {[
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'approved', label: 'Đã duyệt' },
          { key: 'rejected', label: 'Từ chối' },
          { key: '', label: 'Tất cả' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              statusFilter === key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải..." />
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <EmptyState
            message={
              statusFilter === 'pending'
                ? isAdmin
                  ? 'Không có yêu cầu nào đang chờ duyệt'
                  : 'Bạn không có yêu cầu nào đang chờ duyệt'
                : 'Không có yêu cầu nào'
            }
            icon={statusFilter === 'pending' ? CheckCircle : Filter}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
            const StatusIcon = statusCfg.icon

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    {/* Student & Class info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-gray-900">
                        {req.student_name}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {req.class_name}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>📧 {req.student_email || '—'}</span>
                      {req.student_phone && <span>📱 {req.student_phone}</span>}
                      {isAdmin && <span>👤 Đề xuất: {req.requester_name || '—'}</span>}
                      <span>🕐 {formatDate(req.created_at)}</span>
                    </div>

                    {/* Notes */}
                    {req.note && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-1">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>Ghi chú: {req.note}</span>
                      </div>
                    )}

                    {/* Review info for processed requests */}
                    {req.status !== 'pending' && (
                      <div className="text-xs text-gray-400 mt-1">
                        {req.status === 'approved' ? '✅' : '❌'} Xử lý bởi: {req.reviewer_name || '—'}
                        {req.review_note && <span> • "{req.review_note}"</span>}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Admin: approve / reject */}
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            icon={CheckCircle}
                            onClick={() => handleQuickApprove(req)}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            icon={XCircle}
                            onClick={() => openReview(req, 'reject')}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                      {/* Teacher: can cancel own pending request */}
                      {isTeacher && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={XCircle}
                          onClick={() => handleCancelRequest(req)}
                        >
                          Hủy yêu cầu
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review modal with note (admin only) */}
      {isAdmin && (
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title={reviewAction === 'approve' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowReviewModal(false)} disabled={processing}>
                Hủy
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'success' : 'danger'}
                onClick={handleReview}
                loading={processing}
                icon={reviewAction === 'approve' ? CheckCircle : XCircle}
              >
                {reviewAction === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </Button>
            </>
          }
        >
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm">
                  <span className="text-gray-500">Học sinh:</span>{' '}
                  <span className="font-semibold text-gray-900">{selectedRequest.student_name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Lớp:</span>{' '}
                  <span className="font-semibold text-blue-600">{selectedRequest.class_name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Đề xuất bởi:</span>{' '}
                  <span className="font-medium text-gray-700">{selectedRequest.requester_name}</span>
                </p>
                {selectedRequest.note && (
                  <p className="text-sm">
                    <span className="text-gray-500">Ghi chú:</span>{' '}
                    <span className="text-amber-700">{selectedRequest.note}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú phản hồi (tùy chọn)
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={reviewAction === 'reject' ? 'Lý do từ chối...' : 'Ghi chú thêm...'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
