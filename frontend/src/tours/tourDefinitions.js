/**
 * Tour tương tác — mỗi bước chi tiết:
 * - selector / route / advanceOn / placement / optional
 * - body: thao tác ngay
 * - appear: màn hình / form sẽ hiện
 * - hints: danh sách chi tiết (từng ô, lưu ý)
 * - fill: ví dụ điền mẫu
 */

export const TOURS = {
  teacher: {
    id: 'teacher',
    title: 'Tour: Tạo giáo viên',
    roles: ['admin'],
    steps: [
      {
        selector: '[data-tour="nav-teachers"]',
        title: 'Bước 1 — Mở menu Giáo viên',
        body: 'Nhìn cột menu bên trái (mục Con người & lớp). Bấm dòng Giáo viên đang được khoanh sáng.',
        appear: 'Trang Giáo viên: tiêu đề “Giáo viên”, bảng danh sách, nút Thêm giáo viên góc trên phải.',
        hints: [
          'Máy tính: menu luôn hiện bên trái',
          'Điện thoại: bấm ≡ góc trên trái rồi chọn Giáo viên',
          'Nếu không thấy mục: kéo menu xuống / mở nhóm Con người & lớp',
        ],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="teachers-add"]',
        route: '/teachers',
        title: 'Bước 2 — Bấm Thêm giáo viên',
        body: 'Bấm nút xanh Thêm giáo viên (dấu +) ở góc trên bên phải trang.',
        appear: 'Cửa sổ giữa màn hình hiện ra, tiêu đề “Thêm giáo viên mới”, nền mờ phía sau.',
        hints: [
          'Không bấm Xuất Excel — đó là nút khác',
          'Sau khi bấm, form mở; tour sẽ khoanh từng ô cần điền',
        ],
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="teacher-field-avatar"]',
        title: 'Bước 3 — Ảnh đại diện (tuỳ chọn)',
        body: 'Có thể bấm nút máy ảnh trên avatar để tải ảnh, hoặc dán URL ảnh bên phải. Có thể bỏ qua.',
        appear: 'Vòng avatar + ô “Hoặc dán URL ảnh”.',
        fill: 'Ví dụ URL: https://… hoặc /uploads/…',
        hints: [
          'Không bắt buộc — bỏ trống vẫn tạo được giáo viên',
          'Ảnh sẽ hiện trên danh sách / hồ sơ sau khi lưu',
        ],
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="teacher-field-name"]',
        title: 'Bước 4 — Điền Họ tên',
        body: 'Bấm vào ô Họ tên (có dấu *) và gõ họ tên đầy đủ của giáo viên.',
        appear: 'Ô đang sáng — placeholder kiểu “Nguyễn Văn A”.',
        fill: 'Ví dụ: Nguyễn Văn An',
        hints: [
          'Bắt buộc — để trống sẽ báo lỗi khi lưu',
          'Nên viết đúng chính tả vì tên hiện trên lớp / lịch',
        ],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="teacher-field-email"]',
        title: 'Bước 5 — Điền Email',
        body: 'Điền Email (bắt buộc). Email này dùng để giáo viên đăng nhập hệ thống.',
        appear: 'Ô Email bên cạnh / dưới Họ tên.',
        fill: 'Ví dụ: an.nguyen@edu.com',
        hints: [
          'Phải đúng dạng email (có @)',
          'Không trùng email đã có trong hệ thống',
        ],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="teacher-field-phone"]',
        title: 'Bước 6 — Số điện thoại (tuỳ chọn)',
        body: 'Có thể điền SĐT liên hệ, hoặc bỏ qua và bấm Tiếp.',
        appear: 'Ô Số điện thoại trên form.',
        fill: 'Ví dụ: 0901234567',
        hints: ['Không bắt buộc'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="teacher-field-active"]',
        title: 'Bước 7 — Đang hoạt động',
        body: 'Giữ tick “Đang hoạt động” nếu GV đang dạy. Bỏ tick nếu tạm ngừng.',
        appear: 'Checkbox dưới các ô thông tin.',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="teacher-form-save"]',
        title: 'Bước 8 — Bấm Thêm mới để lưu',
        body: 'Kéo xuống cuối cửa sổ (nếu cần) và bấm nút Thêm mới.',
        appear: 'Form đóng; thông báo thành công; dòng giáo viên mới xuất hiện trong bảng.',
        hints: [
          'Nếu báo lỗi: kiểm tra lại Họ tên / Email',
          'Nút Hủy = đóng form không lưu',
          'Xong tour này → làm tiếp tour Môn học',
        ],
        placement: 'top',
        advanceOn: 'next',
      },
    ],
  },

  subject: {
    id: 'subject',
    title: 'Tour: Tạo môn học',
    roles: ['admin'],
    steps: [
      {
        selector: '[data-tour="nav-subjects"]',
        title: 'Bước 1 — Mở menu Môn học',
        body: 'Menu trái → nhóm Con người & lớp → bấm Môn học.',
        appear: 'Trang Môn học: bảng danh sách + nút Thêm môn học.',
        hints: ['Cần có môn trước khi tạo lớp', 'Ví dụ: Tiếng Anh giao tiếp, IELTS, TOEIC…'],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="subjects-add"]',
        route: '/subjects',
        title: 'Bước 2 — Bấm Thêm môn học',
        body: 'Bấm nút Thêm môn học góc trên phải.',
        appear: 'Cửa sổ “Thêm môn học mới” giữa màn hình.',
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="subject-field-name"]',
        title: 'Bước 3 — Tên môn học *',
        body: 'Gõ tên môn vào ô Tên môn học (bắt buộc).',
        appear: 'Ô đầu tiên trên form.',
        fill: 'Ví dụ: Tiếng Anh giao tiếp',
        hints: ['Tên này hiện khi tạo / chọn lớp'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="subject-field-code"]',
        title: 'Bước 4 — Mã môn (tuỳ chọn)',
        body: 'Điền mã ngắn nội bộ nếu trung tâm dùng mã, hoặc bỏ trống.',
        appear: 'Ô Mã môn.',
        fill: 'Ví dụ: ENG-COM',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="subject-field-desc"]',
        title: 'Bước 5 — Mô tả (tuỳ chọn)',
        body: 'Ghi vài dòng về chương trình / trình độ, hoặc bỏ qua.',
        appear: 'Ô Mô tả (textarea).',
        fill: 'Ví dụ: Khóa giao tiếp căn bản 3 tháng',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="subject-field-status"]',
        title: 'Bước 6 — Trạng thái',
        body: 'Giữ “Hoạt động” để dùng khi tạo lớp. Chọn “Ngừng” nếu tạm không mở môn này.',
        appear: 'Dropdown Trạng thái.',
        hints: ['Mặc định: Hoạt động'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="subject-form-save"]',
        title: 'Bước 7 — Lưu môn học',
        body: 'Bấm Thêm mới ở cuối cửa sổ.',
        appear: 'Form đóng; môn mới có trong bảng — chọn được khi tạo lớp.',
        placement: 'top',
        advanceOn: 'next',
      },
    ],
  },

  student: {
    id: 'student',
    title: 'Tour: Tạo học sinh',
    roles: ['admin'],
    steps: [
      {
        selector: '[data-tour="nav-students"]',
        title: 'Bước 1 — Mở menu Học sinh',
        body: 'Menu trái → bấm Học sinh.',
        appear: 'Trang danh sách học sinh + nút Thêm học sinh.',
        hints: [
          'Tạo hồ sơ HS trước (hoặc tạo nhanh khi thêm vào lớp)',
          'Sau đó thêm HS vào lớp để thu học phí',
        ],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="students-add"]',
        route: '/students',
        title: 'Bước 2 — Bấm Thêm học sinh',
        body: 'Bấm nút Thêm học sinh (dấu +) góc trên phải.',
        appear: 'Cửa sổ “Thêm học sinh mới”.',
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="student-field-avatar"]',
        title: 'Bước 3 — Ảnh đại diện (tuỳ chọn)',
        body: 'Bấm nút máy ảnh trên avatar để chọn ảnh từ máy, hoặc dán URL bên phải. Có thể bỏ qua.',
        appear: 'Vòng avatar + ô dán URL.',
        fill: 'URL: https://… hoặc /uploads/…',
        hints: ['Không bắt buộc', 'Ảnh tải từ máy sẽ upload lên hệ thống'],
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="student-field-name"]',
        title: 'Bước 4 — Họ tên *',
        body: 'Điền Họ tên học sinh (bắt buộc).',
        appear: 'Ô Họ tên trên form.',
        fill: 'Ví dụ: Trần Thị Bình',
        hints: ['Để trống sẽ báo lỗi khi lưu'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="student-field-email"]',
        title: 'Bước 5 — Email (tuỳ chọn)',
        body: 'Điền email nếu HS / phụ huynh dùng đăng nhập hoặc nhận thông báo.',
        appear: 'Ô Email.',
        fill: 'Ví dụ: binh.tran@email.com',
        hints: ['Có thể để trống nếu chưa cấp tài khoản'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="student-field-phone"]',
        title: 'Bước 6 — Số điện thoại (tuỳ chọn)',
        body: 'Điền SĐT liên hệ phụ huynh / học sinh nếu có.',
        appear: 'Ô Số điện thoại.',
        fill: 'Ví dụ: 0912345678',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="student-field-active"]',
        title: 'Bước 7 — Đang hoạt động',
        body: 'Giữ tick “Đang hoạt động” cho HS đang học. Bỏ tick nếu tạm ngừng.',
        appear: 'Checkbox dưới các ô thông tin.',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="student-form-save"]',
        title: 'Bước 8 — Lưu hồ sơ',
        body: 'Bấm Thêm mới.',
        appear: 'HS xuất hiện trong bảng. Chưa thuộc lớp cho đến khi bạn thêm vào lớp.',
        hints: ['Tiếp: vào Lớp học → thêm HS vào lớp'],
        placement: 'top',
        advanceOn: 'next',
      },
    ],
  },

  class: {
    id: 'class',
    title: 'Tour: Tạo lớp học',
    roles: ['admin'],
    steps: [
      {
        selector: '[data-tour="nav-classes"]',
        title: 'Bước 1 — Mở menu Lớp học',
        body: 'Menu trái → bấm Lớp học.',
        appear: 'Danh sách lớp + nút Thêm lớp học.',
        hints: [
          'Trước đó nên có: Giáo viên + Môn học',
          'Ngày bắt đầu / kết thúc bắt buộc — dùng cho học phí',
        ],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="classes-add"]',
        route: '/classes',
        title: 'Bước 2 — Bấm Thêm lớp học',
        body: 'Bấm nút Thêm lớp học góc trên phải.',
        appear: 'Cửa sổ tạo lớp; có khung nhắc 3 bước sau khi tạo (lịch, học phí, HS).',
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="class-field-name"]',
        title: 'Bước 3 — Tên lớp *',
        body: 'Gõ tên lớp dễ nhận biết (ca học / trình độ).',
        appear: 'Ô Tên lớp.',
        fill: 'Ví dụ: TOEIC 550+ ca tối T3-T5',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-subject"]',
        title: 'Bước 4 — Chọn môn học',
        body: 'Bấm ô Môn học → chọn môn trong danh sách xổ xuống.',
        appear: 'Dropdown Môn học.',
        hints: ['Nếu trống: chạy tour Tạo môn học trước'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-teacher"]',
        title: 'Bước 5 — Chọn giáo viên',
        body: 'Bấm ô Giáo viên → chọn GV phụ trách lớp.',
        appear: 'Dropdown Giáo viên.',
        hints: ['Nếu trống: tạo giáo viên trước'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-max"]',
        title: 'Bước 6 — Sĩ số tối đa (tuỳ chọn)',
        body: 'Điền số học viên tối đa nếu muốn giới hạn, hoặc để trống.',
        appear: 'Ô Sĩ số tối đa.',
        fill: 'Ví dụ: 15',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-status"]',
        title: 'Bước 7 — Trạng thái lớp',
        body: 'Giữ “Hoạt động” cho lớp đang mở. Có thể chọn Ngừng / Hoàn thành sau này.',
        appear: 'Dropdown Trạng thái.',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-start"]',
        title: 'Bước 8 — Ngày bắt đầu *',
        body: 'Bấm ô Ngày bắt đầu → chọn ngày khai giảng.',
        appear: 'Ô ngày (date picker).',
        hints: ['Dùng để tính kỳ học phí / số buổi'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-end"]',
        title: 'Bước 9 — Ngày kết thúc *',
        body: 'Chọn ngày kết thúc khóa — phải sau ngày bắt đầu.',
        appear: 'Ô Ngày kết thúc.',
        hints: ['Thiếu ngày này hệ thống báo lỗi khi lưu'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-field-desc"]',
        title: 'Bước 10 — Mô tả (tuỳ chọn)',
        body: 'Ghi ghi chú lớp (phòng, ghi chú nội bộ…), hoặc bỏ qua.',
        appear: 'Ô Mô tả phía dưới.',
        placement: 'top',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-form-save"]',
        title: 'Bước 11 — Lưu lớp',
        body: 'Bấm Thêm mới ở cuối cửa sổ.',
        appear: 'Lớp mới trong danh sách. Bấm tên lớp để thêm HS, lịch, học phí.',
        hints: ['Tiếp: tour Thêm HS vào lớp → Thời khóa biểu → Học phí'],
        placement: 'top',
        advanceOn: 'next',
      },
    ],
  },

  enrollmentRequest: {
    id: 'enrollmentRequest',
    title: 'Tour: Yêu cầu thêm học sinh',
    roles: ['admin', 'teacher'],
    steps: [
      {
        selector: '[data-tour="nav-enrollment-requests"]',
        title: 'Bước 1 — Mở Yêu cầu thêm HS',
        body: 'Menu trái → nhóm Con người & lớp → bấm Yêu cầu thêm HS.',
        appear: 'Trang danh sách yêu cầu + bộ lọc trạng thái.',
        hints: [
          'Admin: duyệt / từ chối đề xuất của giáo viên',
          'Giáo viên: theo dõi / hủy yêu cầu đã gửi',
        ],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="enroll-req-filters"]',
        route: '/enrollment-requests',
        title: 'Bước 2 — Bộ lọc trạng thái',
        body: 'Bấm các nút Chờ duyệt / Đã duyệt / Từ chối / Tất cả để lọc danh sách.',
        appear: 'Hàng nút lọc ngay dưới tiêu đề.',
        hints: ['Mặc định: Chờ duyệt — nơi admin xử lý'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="enroll-req-filter-pending"]',
        title: 'Bước 3 — Chọn “Chờ duyệt”',
        body: 'Bấm Chờ duyệt để chỉ xem yêu cầu chưa xử lý.',
        appear: 'Nút Chờ duyệt được tô sáng.',
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="enroll-req-card"]',
        title: 'Bước 4 — Đọc thẻ yêu cầu',
        body: 'Mỗi thẻ hiện: tên HS → lớp, email/SĐT, người đề xuất, ghi chú (nếu có).',
        appear: 'Thẻ trắng trong danh sách.',
        hints: [
          'Nếu không có thẻ: chưa có yêu cầu chờ — GV gửi từ tab Học sinh của lớp',
          'Bấm Bỏ qua nếu danh sách trống',
        ],
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="enroll-req-approve"]',
        title: 'Bước 5 — Duyệt nhanh (admin)',
        body: 'Admin: bấm Duyệt trên thẻ để thêm HS vào lớp ngay (không cần ghi chú).',
        appear: 'Nút xanh Duyệt bên phải thẻ.',
        hints: ['Chỉ hiện với tài khoản admin', 'GV không thấy nút này'],
        placement: 'left',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="enroll-req-reject"]',
        title: 'Bước 6 — Từ chối (admin)',
        body: 'Admin: bấm Từ chối để mở cửa sổ ghi lý do (tuỳ chọn) rồi xác nhận.',
        appear: 'Nút đỏ Từ chối; sau khi bấm hiện modal phản hồi.',
        hints: ['Bấm Từ chối thật nếu muốn xem form ghi chú ở bước sau'],
        placement: 'left',
        advanceOn: 'click',
        optional: true,
      },
      {
        selector: '[data-tour="enroll-req-review-info"]',
        title: 'Bước 7 — Xem thông tin yêu cầu',
        body: 'Trong modal: kiểm tra Học sinh, Lớp, người đề xuất, ghi chú của GV.',
        appear: 'Khối xám thông tin đầu modal.',
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="enroll-req-review-note"]',
        title: 'Bước 8 — Ghi chú phản hồi',
        body: 'Gõ lý do từ chối / ghi chú thêm vào ô (tuỳ chọn), rồi bấm Tiếp.',
        appear: 'Ô “Ghi chú phản hồi”.',
        fill: 'Ví dụ: Lớp đã đủ sĩ số',
        placement: 'top',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="enroll-req-review-confirm"]',
        title: 'Bước 9 — Xác nhận',
        body: 'Bấm Xác nhận từ chối (hoặc Xác nhận duyệt) để hoàn tất. Hủy = đóng không lưu.',
        appear: 'Nút xác nhận ở chân modal.',
        hints: ['GV: dùng nút Hủy yêu cầu trên thẻ nếu muốn rút đề xuất'],
        placement: 'top',
        advanceOn: 'next',
        optional: true,
      },
    ],
  },

  enroll: {
    id: 'enroll',
    title: 'Tour: Thêm học sinh vào lớp',
    roles: ['admin', 'teacher'],
    steps: [
      {
        selector: '[data-tour="nav-classes"]',
        title: 'Bước 1 — Vào danh sách lớp',
        body: 'Menu trái → bấm Lớp học.',
        appear: 'Bảng các lớp đang mở.',
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="classes-page"]',
        route: '/classes',
        title: 'Bước 2 — Mở chi tiết một lớp',
        body: 'Trong bảng, bấm tên lớp (hoặc nút xem chi tiết / mắt). Chọn lớp đã tạo.',
        appear: 'Trang chi tiết lớp: tên lớp phía trên, hàng tab: Tổng quan | Học sinh | Học phí | …',
        hints: [
          'Sau khi trang chi tiết mở xong, bấm Tiếp trên khung tour',
          'Nếu chưa có lớp: chạy tour Tạo lớp trước',
        ],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-tab-students"]',
        title: 'Bước 3 — Bấm tab Học sinh',
        body: 'Trên hàng tab, bấm Học sinh (đang được khoanh sáng).',
        appear: 'Nội dung đổi sang danh sách học viên của lớp + nút Thêm học viên.',
        hints: ['Tab đang chọn có gạch chân màu'],
        placement: 'bottom',
        advanceOn: 'click',
        optional: true,
      },
      {
        selector: '[data-tour="class-students-add"]',
        title: 'Bước 4 — Bấm Thêm học viên',
        body: 'Bấm nút Thêm học viên (admin) hoặc Thêm học sinh (giáo viên).',
        appear: 'Khung tìm kiếm / chọn học sinh mở ngay trên trang (không phải cửa sổ mới).',
        hints: [
          'Admin: thêm trực tiếp vào lớp',
          'Giáo viên: gửi yêu cầu → admin duyệt',
        ],
        placement: 'bottom',
        advanceOn: 'click',
        optional: true,
      },
      {
        selector: '[data-tour="class-students-panel"]',
        title: 'Bước 5 — Chọn học sinh và xác nhận',
        body: 'Tìm tên HS (gõ ô tìm nếu có) → tick chọn một hoặc nhiều người → bấm nút Thêm … HS (hoặc Đề xuất nếu là GV).',
        appear: 'HS vừa thêm hiện trong danh sách phía dưới.',
        hints: [
          'Có thể tạo HS mới ngay trong khung nếu admin thấy tùy chọn đó',
          'Chưa thêm HS thì không thu được học phí theo từng người',
        ],
        placement: 'top',
        advanceOn: 'next',
        optional: true,
      },
    ],
  },

  schedule: {
    id: 'schedule',
    title: 'Tour: Tạo thời khóa biểu',
    roles: ['admin', 'teacher'],
    steps: [
      {
        selector: '[data-tour="nav-schedules"]',
        title: 'Bước 1 — Mở Thời khóa biểu',
        body: 'Menu trái → nhóm Vận hành → bấm Thời khóa biểu.',
        appear: 'Trang lịch: chế độ Kanban / Tuần / Tháng / Danh sách + nút Thêm lịch học.',
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="schedules-add"]',
        route: '/schedules',
        title: 'Bước 2 — Bấm Thêm lịch học',
        body: 'Bấm nút Thêm lịch học góc trên phải.',
        appear: 'Cửa sổ form lịch lớn; phía trên có 2 chế độ: Thêm đơn | Lặp lại hàng tuần.',
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="schedule-mode-bulk"]',
        title: 'Bước 3 — Chọn kiểu lịch (khuyến nghị Lặp lại)',
        body: 'Để xếp cả tuần: bấm Lặp lại hàng tuần. Chỉ 1 buổi: giữ Thêm đơn.',
        appear: 'Nút chế độ đổi màu khi được chọn; form hiện thêm ô chọn nhiều ngày.',
        hints: [
          'Lặp lại: chọn T2, T4… + giờ + số buổi → tạo nhiều ca một lần',
          'Thêm đơn: chọn 1 ngày trong tuần + giờ',
        ],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="schedule-field-class"]',
        title: 'Bước 4 — Chọn lớp học',
        body: 'Bấm ô Lớp học → chọn lớp cần xếp lịch.',
        appear: 'Dropdown Lớp học.',
        hints: ['Nếu báo trùng GV/phòng: đổi giờ hoặc phòng'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="schedule-field-time"]',
        title: 'Bước 5 — Chọn giờ học',
        body: 'Chọn Giờ bắt đầu và Giờ kết thúc (khung giờ buổi học).',
        appear: 'Hai ô giờ nằm cạnh nhau.',
        fill: 'Ví dụ: 18:00 → 19:30',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="schedule-field-days"]',
        title: 'Bước 6 — Chọn ngày trong tuần',
        body: 'Thêm đơn: chọn 1 ngày. Lặp lại: bấm các nút T2, T3… để chọn nhiều ngày (nút xanh = đã chọn).',
        appear: 'Ô ngày hoặc hàng nút ngày trong tuần.',
        hints: ['Với Lặp lại: điền thêm Ngày bắt đầu và Số buổi học nếu form hiện khối tím'],
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="schedule-form-save"]',
        title: 'Bước 7 — Lưu lịch',
        body: 'Bấm Thêm mới hoặc Tạo lịch (… ngày/tuần) ở cuối cửa sổ.',
        appear: 'Form đóng; các ca học hiện trên bảng thời khóa biểu.',
        hints: ['Xong → có thể cấu hình học phí (tour Học phí)'],
        placement: 'top',
        advanceOn: 'next',
      },
    ],
  },

  tuition: {
    id: 'tuition',
    title: 'Tour: Thu học phí',
    roles: ['admin'],
    steps: [
      {
        selector: '[data-tour="nav-classes"]',
        title: 'Bước 1 — Vào Lớp học',
        body: 'Menu trái → bấm Lớp học. Chọn lớp đã có học sinh (và nên có lịch nếu tính theo buổi).',
        appear: 'Danh sách lớp.',
        hints: [
          'Thứ tự đúng: cấu hình phí → Sinh hóa đơn → Thu tiền',
          'Chưa sinh hóa đơn thì chưa có công nợ thật để thu',
        ],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="classes-page"]',
        route: '/classes',
        title: 'Bước 2 — Mở chi tiết lớp',
        body: 'Bấm tên lớp cần thu phí. Khi trang chi tiết mở xong, bấm Tiếp.',
        appear: 'Trang lớp với các tab — tìm tab Học phí (icon tiền).',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="class-tab-tuition"]',
        title: 'Bước 3 — Bấm tab Học phí',
        body: 'Bấm tab Học phí trên hàng tab.',
        appear: 'Checklist “Thiết lập học phí”, 3 số Dự kiến / Đã thu / Còn nợ, khối Cách tính phí.',
        placement: 'bottom',
        advanceOn: 'click',
        optional: true,
      },
      {
        selector: '[data-tour="tuition-fee-edit"]',
        title: 'Bước 4 — Bấm Sửa cách tính phí',
        body: 'Ở khối Cách tính phí, bấm nút Sửa.',
        appear: 'Hiện form: Hình thức tính phí, Giá (VNĐ), ngày hạn (nếu theo tháng).',
        placement: 'bottom',
        advanceOn: 'click',
        optional: true,
      },
      {
        selector: '[data-tour="tuition-fee-policy"]',
        title: 'Bước 5 — Chọn hình thức tính phí',
        body: 'Chọn một hình thức trong danh sách (theo tháng / theo khóa / theo buổi…).',
        appear: 'Ô Hình thức tính phí đang mở để chọn.',
        hints: [
          'Theo tháng: phổ biến — nhập giá tháng + ngày hạn đóng',
          'Theo buổi: cần có lịch học (hoặc nhập số buổi/tháng)',
        ],
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="tuition-fee-amount"]',
        title: 'Bước 6 — Nhập số tiền',
        body: 'Gõ đơn giá bằng số (VNĐ), không cần dấu chấm phần nghìn.',
        appear: 'Ô Giá (VNĐ) hoặc Giá mỗi buổi.',
        fill: 'Ví dụ: 1500000 (1.500.000đ)',
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="tuition-fee-save"]',
        title: 'Bước 7 — Lưu cấu hình phí',
        body: 'Bấm Lưu trong khối Cách tính phí.',
        appear: 'Form thu gọn; checklist đánh dấu bước phí đã xong.',
        placement: 'bottom',
        advanceOn: 'click',
        optional: true,
      },
      {
        selector: '[data-tour="tuition-generate"]',
        title: 'Bước 8 — Sinh hóa đơn',
        body: 'Khi checklist đủ bước bắt buộc, bấm Sinh hóa đơn. Chọn tháng (nếu hộp thoại hỏi) rồi xác nhận.',
        appear: 'Mỗi học sinh trong lớp có hóa đơn cho kỳ đó.',
        hints: ['Nút chỉ hiện khi đã có cấu hình phí', 'Phải sinh hóa đơn trước khi Thu tiền'],
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
      {
        selector: '[data-tour="tuition-collect"]',
        title: 'Bước 9 — Thu tiền',
        body: 'Bấm Thu tiền. Hệ thống mở trang Tài chính → Thu tiền (đã lọc theo lớp). Chọn HS, nhập số tiền đã nhận, hình thức (tiền mặt/CK…), rồi lưu.',
        appear: 'Màn thu tiền / form ghi nhận thanh toán.',
        hints: [
          'Kiểm tra công nợ: Tài chính → tab “Ai còn nợ?”',
          'Đã thu / Còn nợ trên tab Học phí chỉ đúng sau khi có hóa đơn',
        ],
        placement: 'bottom',
        advanceOn: 'next',
        optional: true,
      },
    ],
  },

  lesson: {
    id: 'lesson',
    title: 'Tour: Tạo bài học',
    roles: ['admin', 'teacher'],
    steps: [
      {
        selector: '[data-tour="nav-lessons"]',
        title: 'Bước 1 — Mở menu Bài học',
        body: 'Menu trái → nhóm Giảng dạy → bấm Bài học.',
        appear: 'Danh sách bài học + nút Thêm bài học.',
        hints: ['Cũng có thể thêm từ chi tiết lớp → tab Bài học'],
        placement: 'right',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="lessons-add"]',
        route: '/lessons',
        title: 'Bước 2 — Bấm Thêm bài học',
        body: 'Bấm nút Thêm bài học góc trên phải.',
        appear: 'Cửa sổ form: Tiêu đề, Lớp, Nội dung, tick Xuất bản; phần nâng cao thu gọn.',
        placement: 'bottom',
        advanceOn: 'click',
      },
      {
        selector: '[data-tour="lesson-field-title"]',
        title: 'Bước 3 — Tiêu đề bài học',
        body: 'Gõ tiêu đề rõ ràng (unit / chủ đề).',
        appear: 'Ô Tiêu đề bài học.',
        fill: 'Ví dụ: Unit 1 — Chào hỏi & giới thiệu',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="lesson-field-class"]',
        title: 'Bước 4 — Chọn lớp',
        body: 'Bấm ô Lớp học → chọn lớp sẽ học bài này.',
        appear: 'Dropdown Lớp học (bắt buộc).',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="lesson-field-content"]',
        title: 'Bước 5 — Viết nội dung',
        body: 'Gõ nội dung bài vào khung soạn thảo (chữ, danh sách, in đậm…).',
        appear: 'Ô Nội dung lớn phía dưới.',
        hints: [
          'YouTube / Drive / file: mở mục nâng cao bên dưới nếu cần',
          'Không bắt buộc đính kèm link',
        ],
        placement: 'top',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="lesson-field-publish"]',
        title: 'Bước 6 — Xuất bản cho học sinh?',
        body: 'Tick ô xuất bản nếu muốn HS thấy ngay. Bỏ trống = lưu nháp (chỉ GV/admin thấy).',
        appear: 'Ô checkbox xanh “Xuất bản…” trên form.',
        placement: 'bottom',
        advanceOn: 'next',
      },
      {
        selector: '[data-tour="lesson-form-save"]',
        title: 'Bước 7 — Lưu bài học',
        body: 'Bấm Thêm bài học (hoặc Lưu) ở cuối cửa sổ.',
        appear: 'Form đóng; bài có trong danh sách và trong tab Bài học của lớp.',
        hints: ['Nút Xem trước chỉ xem, chưa lưu'],
        placement: 'top',
        advanceOn: 'next',
      },
    ],
  },
}

export const TOUR_LIST = Object.values(TOURS)

/**
 * Nút hướng dẫn theo trang hiện tại.
 * startAt: bỏ qua bước “mở menu” vì user đã ở đúng trang.
 */
export const PAGE_TOUR_RULES = [
  {
    id: 'teachers',
    test: (path) => path === '/teachers' || path.startsWith('/teachers/'),
    items: [{ tourId: 'teacher', label: 'Hướng dẫn tạo giáo viên', short: 'Tạo GV', startAt: 1 }],
  },
  {
    id: 'subjects',
    test: (path) => path === '/subjects' || path.startsWith('/subjects/'),
    items: [{ tourId: 'subject', label: 'Hướng dẫn tạo môn học', short: 'Tạo môn', startAt: 1 }],
  },
  {
    id: 'students',
    test: (path) => path === '/students' || path.startsWith('/students/'),
    items: [{ tourId: 'student', label: 'Hướng dẫn tạo học sinh', short: 'Tạo HS', startAt: 1 }],
  },
  {
    id: 'classes-list',
    test: (path) => path === '/classes',
    items: [
      { tourId: 'class', label: 'Hướng dẫn tạo lớp', short: 'Tạo lớp', startAt: 1 },
      { tourId: 'enroll', label: 'Hướng dẫn thêm HS vào lớp', short: 'Thêm HS', startAt: 0 },
    ],
  },
  {
    id: 'enrollment-requests',
    test: (path) => path === '/enrollment-requests' || path.startsWith('/enrollment-requests/'),
    items: [
      {
        tourId: 'enrollmentRequest',
        label: 'Hướng dẫn duyệt yêu cầu thêm HS',
        short: 'Duyệt yêu cầu',
        startAt: 1,
      },
    ],
  },
  {
    id: 'class-detail-tuition',
    test: (path, search) => /^\/classes\/[^/]+/.test(path) && search.get('tab') === 'tuition',
    items: [{ tourId: 'tuition', label: 'Hướng dẫn thu học phí', short: 'Thu học phí', startAt: 3 }],
  },
  {
    id: 'class-detail-students',
    test: (path, search) =>
      /^\/classes\/[^/]+/.test(path) && (!search.get('tab') || search.get('tab') === 'students' || search.get('tab') === 'overview'),
    items: [
      { tourId: 'enroll', label: 'Hướng dẫn thêm học sinh', short: 'Thêm HS', startAt: 2 },
      { tourId: 'tuition', label: 'Hướng dẫn học phí', short: 'Học phí', startAt: 2 },
    ],
  },
  {
    id: 'class-detail-other',
    test: (path) => /^\/classes\/[^/]+/.test(path),
    items: [
      { tourId: 'enroll', label: 'Hướng dẫn thêm HS', short: 'Thêm HS', startAt: 2 },
      { tourId: 'tuition', label: 'Hướng dẫn học phí', short: 'Học phí', startAt: 2 },
      { tourId: 'lesson', label: 'Hướng dẫn bài học', short: 'Bài học', startAt: 1 },
    ],
  },
  {
    id: 'schedules',
    test: (path) => path === '/schedules' || path.startsWith('/schedules/'),
    items: [{ tourId: 'schedule', label: 'Hướng dẫn tạo lịch học', short: 'Tạo lịch', startAt: 1 }],
  },
  {
    id: 'lessons',
    test: (path) => path === '/lessons' || path.startsWith('/lessons/'),
    items: [{ tourId: 'lesson', label: 'Hướng dẫn tạo bài học', short: 'Tạo bài', startAt: 1 }],
  },
  {
    id: 'finances',
    test: (path) => path === '/finances' || path.startsWith('/finances/'),
    items: [{ tourId: 'tuition', label: 'Hướng dẫn thu học phí', short: 'Thu học phí', startAt: 0 }],
  },
  {
    id: 'facilities',
    test: (path) => path === '/facilities' || path.startsWith('/facilities/'),
    items: [],
    fallbackGuide: true,
    label: 'Xem hướng dẫn',
  },
  {
    id: 'admin-hub',
    test: (path) => path === '/admin-hub',
    items: [
      { tourId: 'teacher', label: 'Tour tạo giáo viên', short: 'GV', startAt: 0 },
      { tourId: 'class', label: 'Tour tạo lớp', short: 'Lớp', startAt: 0 },
      { tourId: 'tuition', label: 'Tour học phí', short: 'Học phí', startAt: 0 },
    ],
  },
]

/** Lấy các nút hướng dẫn phù hợp pathname hiện tại */
export function getPageTourActions(pathname, searchParams, role) {
  const search =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams || '')

  if (pathname === '/guide') {
    return { items: [], fallbackGuide: false }
  }

  const rule = PAGE_TOUR_RULES.find((r) => r.test(pathname, search))
  if (!rule) {
    return { items: [], fallbackGuide: true, label: 'Hướng dẫn' }
  }

  const filtered = (rule.items || []).filter((item) => {
    const t = TOURS[item.tourId]
    if (!t) return false
    if (!t.roles?.length) return true
    if (!role) return true
    const r = String(role).toLowerCase()
    return t.roles.some((x) => String(x).toLowerCase() === r)
  })

  return {
    items: filtered,
    fallbackGuide: !!rule.fallbackGuide || filtered.length === 0,
    label: rule.label || 'Huong dan',
  }
}
