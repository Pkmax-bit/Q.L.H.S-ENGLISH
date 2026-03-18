// Enrich lessons 9-12
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../src/config/database');
const CLASS_ID = '247a930d-17ed-402f-8ae1-b6f1df546f46';

const lessonContent = {
  9: {
    content: `<h1>📄 Part 7: Single Passage — Đọc hiểu đơn</h1>
<h2>🎯 Mục tiêu: <span style="color: #2dc26b;">20/29 câu đúng</span></h2>
<p>Part 7 là phần <strong>nhiều câu nhất</strong> (54 câu) và chiếm nhiều thời gian nhất. Single Passage có <strong>29 câu</strong> từ 10 đoạn văn.</p>

<h2>📋 Các loại văn bản</h2>
<table>
<thead><tr><th>Loại</th><th>Đặc điểm nhận dạng</th><th>Câu hỏi thường gặp</th></tr></thead>
<tbody>
<tr><td>📧 <strong>Email / Letter</strong></td><td>Dear..., Subject:, Best regards</td><td>Purpose, detail, next action</td></tr>
<tr><td>📢 <strong>Advertisement</strong></td><td>Sale!, Limited time, Call now</td><td>What is offered, price, condition</td></tr>
<tr><td>📰 <strong>Article / Review</strong></td><td>Tiêu đề báo, by [author]</td><td>Main idea, opinion, detail</td></tr>
<tr><td>📋 <strong>Form / Table</strong></td><td>Rows, columns, fields</td><td>Specific info lookup</td></tr>
<tr><td>📌 <strong>Notice / Memo</strong></td><td>NOTICE, TO: All staff</td><td>What changed, when, who affected</td></tr>
<tr><td>💬 <strong>Text message chain</strong></td><td>Chat bubbles, timestamps</td><td>Intention, meaning, next step</td></tr>
<tr><td>🌐 <strong>Online review</strong></td><td>★★★★☆, posted by</td><td>Opinion, recommendation</td></tr>
</tbody>
</table>

<h2>🔑 Chiến lược đọc</h2>
<h3>Bước 1: <span style="background-color: #fbeeb8;">Đọc câu hỏi TRƯỚC (30 giây)</span></h3>
<ul>
<li>Xác định <strong>loại câu hỏi</strong> → biết cần tìm gì</li>
<li>Gạch chân <strong>keyword</strong> trong câu hỏi</li>
</ul>

<h3>Bước 2: <span style="background-color: #c2e0f4;">Skim đoạn văn (30 giây)</span></h3>
<ul>
<li>Đọc <strong>câu đầu + câu cuối</strong> mỗi đoạn</li>
<li>Nắm ý chính và cấu trúc bài</li>
</ul>

<h3>Bước 3: <span style="background-color: #d5e8d4;">Scan tìm đáp án</span></h3>
<ul>
<li>Dùng keyword từ câu hỏi để <strong>scan nhanh</strong></li>
<li>Đọc kỹ đoạn chứa keyword</li>
</ul>

<h2>📝 5 Dạng câu hỏi</h2>
<table>
<thead><tr><th>Dạng</th><th>Câu hỏi mẫu</th><th>Chiến lược</th></tr></thead>
<tbody>
<tr><td><span style="background-color: #fbeeb8;"><strong>Main Idea</strong></span></td><td>What is the purpose of this email?</td><td>Đọc câu đầu + chủ đề tổng thể</td></tr>
<tr><td><span style="background-color: #c2e0f4;"><strong>Detail</strong></span></td><td>What time does the event start?</td><td>Scan keyword (time, event)</td></tr>
<tr><td><span style="background-color: #f8cecc;"><strong>NOT mentioned</strong></span></td><td>What is NOT stated about...?</td><td>Check từng đáp án — loại trừ 3 cái có</td></tr>
<tr><td><span style="background-color: #d5e8d4;"><strong>Inference</strong></span></td><td>What can be inferred about...?</td><td>Đọc ngữ cảnh xung quanh, suy luận</td></tr>
<tr><td><span style="background-color: #e6ccff;"><strong>Vocab in context</strong></span></td><td>The word "issue" is closest to...</td><td>Đọc cả câu chứa từ đó</td></tr>
</tbody>
</table>

<blockquote><p>⏱️ <strong>Thời gian:</strong> ~1 phút/câu cho Single Passage. Không hiểu → đoán → đi tiếp!</p></blockquote>

<h2>📎 Tài liệu</h2>
<ul>
<li>📘 50 đoạn Single Passage practice</li>
<li>📊 Bảng tóm tắt keyword theo dạng câu hỏi</li>
</ul>`,
    youtube_url: 'https://www.youtube.com/watch?v=KL_toeic_part7_single',
    drive_url: 'https://drive.google.com/drive/folders/1part7_single_passage',
  },

  10: {
    content: `<h1>📑 Part 7: Double &amp; Triple Passage</h1>
<h2>🎯 Mục tiêu: <span style="color: #2dc26b;">17/25 câu đúng</span></h2>
<p>Phần khó nhất TOEIC: <strong>2 bài Double</strong> (2 văn bản, 5 câu/bài) + <strong>3 bài Triple</strong> (3 văn bản, 5 câu/bài) = 25 câu.</p>

<h2>📋 Các dạng kết hợp</h2>
<h3>📄📄 Double Passage</h3>
<table>
<thead><tr><th>Kết hợp</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td>Email + Reply</td><td>Yêu cầu → Phản hồi</td></tr>
<tr><td>Ad + Review</td><td>Quảng cáo → Đánh giá khách hàng</td></tr>
<tr><td>Article + Comment</td><td>Bài báo → Bình luận</td></tr>
<tr><td>Notice + Email</td><td>Thông báo → Email hỏi thêm</td></tr>
</tbody>
</table>

<h3>📄📄📄 Triple Passage</h3>
<table>
<thead><tr><th>Kết hợp</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td>Email chain + Schedule + Form</td><td>Trao đổi → Lịch trình → Đơn đăng ký</td></tr>
<tr><td>Ad + Email + Coupon</td><td>Quảng cáo → Đặt hàng → Mã giảm giá</td></tr>
<tr><td>Article + Letter + Schedule</td><td>Bài viết → Thư mời → Chương trình</td></tr>
</tbody>
</table>

<h2>🔑 Chiến lược Cross-Reference</h2>
<pre><code>📌 Cross-reference question = câu cần thông tin từ ≥2 văn bản

Ví dụ:
  Văn bản 1 (Email): "Please send the report by March 15"
  Văn bản 2 (Calendar): March 15 = Friday
  
  Q: On what day must the report be submitted?
  A: Friday  ← cần kết hợp cả 2 văn bản!
</code></pre>

<h2>📝 Chiến lược làm bài</h2>
<ol>
<li><span style="background-color: #fbeeb8;"><strong>Đọc câu hỏi trước</strong></span> — đặc biệt tìm câu cross-reference</li>
<li><span style="background-color: #c2e0f4;"><strong>Đọc văn bản 1</strong></span> — trả lời câu liên quan</li>
<li><span style="background-color: #d5e8d4;"><strong>Đọc văn bản 2 (+ 3)</strong></span> — trả lời câu còn lại</li>
<li><span style="background-color: #f8cecc;"><strong>Cross-reference</strong></span> — quay lại kết hợp thông tin</li>
</ol>

<h2>⏱️ Quản lý thời gian</h2>
<table>
<thead><tr><th>Phần</th><th>Số câu</th><th>Thời gian/câu</th><th>Tổng</th></tr></thead>
<tbody>
<tr><td>Single Passage</td><td>29</td><td>~1 phút</td><td>29 phút</td></tr>
<tr><td>Double Passage</td><td>10</td><td>~1.5 phút</td><td>15 phút</td></tr>
<tr><td>Triple Passage</td><td>15</td><td>~1.5 phút</td><td>22 phút</td></tr>
<tr><td colspan="3"><strong>Tổng Part 7</strong></td><td><strong>~55-66 phút</strong></td></tr>
</tbody>
</table>

<blockquote><p>💡 <strong>Pro tip:</strong> Nếu còn 5 phút mà chưa làm xong → <span style="color: #e03e2d;">đoán hết các câu còn lại</span>. Không bao giờ bỏ trống!</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=MN_toeic_part7_multi',
    drive_url: 'https://drive.google.com/drive/folders/1part7_multi_passage',
  },

  11: {
    content: `<h1>🎧 Mini Test: Listening Section</h1>
<h2>🎯 Bài kiểm tra thử phần Listening — 50 câu / 25 phút</h2>

<h2>📋 Cấu trúc bài test</h2>
<table>
<thead><tr><th>Part</th><th>Tên</th><th>Số câu</th><th>Mục tiêu đúng</th></tr></thead>
<tbody>
<tr><td>1</td><td>Photographs</td><td>3</td><td><span style="color: #2dc26b;">3/3</span></td></tr>
<tr><td>2</td><td>Question-Response</td><td>12</td><td><span style="color: #2dc26b;">9/12</span></td></tr>
<tr><td>3</td><td>Conversations</td><td>20</td><td><span style="color: #2dc26b;">14/20</span></td></tr>
<tr><td>4</td><td>Talks</td><td>15</td><td><span style="color: #2dc26b;">10/15</span></td></tr>
<tr><td colspan="2"><strong>TỔNG</strong></td><td><strong>50</strong></td><td><strong>36/50 (72%) → ~350 điểm</strong></td></tr>
</tbody>
</table>

<h2>📝 Hướng dẫn làm bài</h2>
<ol>
<li><span style="background-color: #fbeeb8;"><strong>Chuẩn bị:</strong></span> Tìm không gian yên tĩnh, đeo tai nghe</li>
<li><span style="background-color: #c2e0f4;"><strong>Bấm play:</strong></span> Nghe audio liên tục, KHÔNG tua lại</li>
<li><span style="background-color: #d5e8d4;"><strong>Ghi đáp án:</strong></span> Đánh dấu ngay trên phiếu trả lời</li>
<li><span style="background-color: #f8cecc;"><strong>Review:</strong></span> So đáp án + đọc giải thích chi tiết</li>
</ol>

<h2>💡 Checklist trước khi thi</h2>
<ul>
<li>☐ Đã ôn Part 1: Từ vựng mô tả tranh</li>
<li>☐ Đã ôn Part 2: 5 loại câu hỏi + 3 bẫy</li>
<li>☐ Đã ôn Part 3: Chiến lược preview + từ vựng chủ đề</li>
<li>☐ Đã ôn Part 4: 6 loại bài nói + graphic questions</li>
<li>☐ Tai nghe sẵn sàng 🎧</li>
<li>☐ Bút + phiếu trả lời sẵn sàng ✏️</li>
</ul>

<h2>📊 Bảng quy đổi điểm (ước tính)</h2>
<table>
<thead><tr><th>Số câu đúng</th><th>Điểm Listening</th><th>Đánh giá</th></tr></thead>
<tbody>
<tr><td>45-50</td><td>400-495</td><td>🏆 Xuất sắc</td></tr>
<tr><td>36-44</td><td>330-395</td><td>✅ Đạt mục tiêu 650</td></tr>
<tr><td>25-35</td><td>250-325</td><td>⚠️ Cần cải thiện</td></tr>
<tr><td>&lt;25</td><td>&lt;250</td><td>❌ Cần ôn lại cơ bản</td></tr>
</tbody>
</table>

<blockquote><p>🎯 <strong>Sau khi làm xong:</strong> Ghi lại số câu đúng mỗi Part. Phần nào yếu nhất → ôn lại bài học tương ứng!</p></blockquote>

<h2>📎 Tài liệu</h2>
<ul>
<li>🎵 Audio Mini Test Listening (25 phút)</li>
<li>📄 Phiếu trả lời (PDF)</li>
<li>📘 Đáp án + giải thích chi tiết</li>
</ul>`,
    youtube_url: 'https://www.youtube.com/watch?v=OP_minitest_listening',
    drive_url: 'https://drive.google.com/drive/folders/1minitest_listening_audio',
    file_url: 'https://drive.google.com/file/d/minitest_listening_answer_sheet/view',
  },

  12: {
    content: `<h1>📖 Mini Test: Reading Section</h1>
<h2>🎯 Bài kiểm tra thử phần Reading — 50 câu / 37 phút</h2>

<h2>📋 Cấu trúc bài test</h2>
<table>
<thead><tr><th>Part</th><th>Tên</th><th>Số câu</th><th>Thời gian</th><th>Mục tiêu</th></tr></thead>
<tbody>
<tr><td>5</td><td>Incomplete Sentences</td><td>15</td><td>5 phút</td><td><span style="color: #2dc26b;">12/15</span></td></tr>
<tr><td>6</td><td>Text Completion</td><td>8</td><td>5 phút</td><td><span style="color: #2dc26b;">6/8</span></td></tr>
<tr><td>7</td><td>Reading Comprehension</td><td>27</td><td>27 phút</td><td><span style="color: #2dc26b;">18/27</span></td></tr>
<tr><td colspan="2"><strong>TỔNG</strong></td><td><strong>50</strong></td><td><strong>37 phút</strong></td><td><strong>36/50 → ~300 điểm</strong></td></tr>
</tbody>
</table>

<h2>⏱️ Chiến lược phân bổ thời gian</h2>
<pre><code>Part 5:  15 câu × 20s = 5 phút    ← Làm NHANH
Part 6:   8 câu × 37s = 5 phút    ← Làm vừa
Part 7:  27 câu × 60s = 27 phút   ← Dành nhiều thời gian nhất
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tổng:                   37 phút

⚠️ NẾU Part 5 + 6 quá 12 phút → BẠN ĐANG CHẬM!
</code></pre>

<h2>📝 Hướng dẫn làm bài</h2>
<ol>
<li><span style="background-color: #fbeeb8;"><strong>Part 5 trước:</strong></span> Đọc nhanh, xem đuôi từ/dấu hiệu thì → chọn → đi tiếp</li>
<li><span style="background-color: #c2e0f4;"><strong>Part 6 tiếp:</strong></span> Skim bài → điền từ → sentence insertion cuối</li>
<li><span style="background-color: #d5e8d4;"><strong>Part 7 cuối:</strong></span> Đọc câu hỏi trước → scan bài → trả lời</li>
</ol>

<h2>💡 Checklist trước khi thi</h2>
<ul>
<li>☐ Đã ôn Part 5: 6 dạng ngữ pháp + từ vựng</li>
<li>☐ Đã ôn Part 6: Sentence insertion strategy</li>
<li>☐ Đã ôn Part 7: Skim/Scan + 5 dạng câu hỏi</li>
<li>☐ Bấm giờ 37 phút ⏰</li>
<li>☐ Không dùng từ điển!</li>
</ul>

<h2>📊 Bảng quy đổi điểm Reading</h2>
<table>
<thead><tr><th>Số câu đúng</th><th>Điểm Reading</th><th>Đánh giá</th></tr></thead>
<tbody>
<tr><td>45-50</td><td>400-495</td><td>🏆 Xuất sắc</td></tr>
<tr><td>36-44</td><td>300-395</td><td>✅ Đạt mục tiêu 650</td></tr>
<tr><td>25-35</td><td>220-295</td><td>⚠️ Cần cải thiện</td></tr>
<tr><td>&lt;25</td><td>&lt;220</td><td>❌ Cần ôn lại cơ bản</td></tr>
</tbody>
</table>

<h2>🏆 Kết hợp Listening + Reading</h2>
<table>
<thead><tr><th>Listening</th><th>Reading</th><th>Tổng</th><th>Đánh giá</th></tr></thead>
<tbody>
<tr><td>350+</td><td>300+</td><td><span style="color: #2dc26b;"><strong>650+</strong></span></td><td>🎯 ĐẠT MỤC TIÊU!</td></tr>
<tr><td>300</td><td>250</td><td>550</td><td>⚠️ Cần thêm 100 điểm</td></tr>
<tr><td>250</td><td>200</td><td>450</td><td>❌ Cần ôn thêm nhiều</td></tr>
</tbody>
</table>

<blockquote><p>🎯 <strong>Sau khi làm:</strong><br>
1. Chấm điểm từng Part<br>
2. Part nào yếu nhất → quay lại bài học tương ứng<br>
3. Ghi lại tiến trình vào sổ theo dõi<br>
4. <span style="color: #e03e2d;"><strong>Lặp lại mini test mỗi 2 tuần</strong></span> để theo dõi tiến bộ</p></blockquote>

<h2>📎 Tài liệu</h2>
<ul>
<li>📄 Đề Mini Test Reading (PDF)</li>
<li>📘 Đáp án + giải thích chi tiết</li>
<li>📊 Bảng theo dõi tiến trình cá nhân</li>
</ul>`,
    youtube_url: 'https://www.youtube.com/watch?v=QR_minitest_reading',
    drive_url: 'https://drive.google.com/drive/folders/1minitest_reading',
    file_url: 'https://drive.google.com/file/d/minitest_reading_paper/view',
  },
};

async function run() {
  const { data: lessons } = await supabase.from('lessons').select('id,order_index').eq('class_id', CLASS_ID).order('order_index');
  const idMap = {};
  lessons.forEach(l => idMap[l.order_index] = l.id);
  for (const [idx, update] of Object.entries(lessonContent)) {
    const id = idMap[parseInt(idx)];
    if (!id) { console.error('No lesson for index', idx); continue; }
    update.updated_at = new Date().toISOString();
    const { error } = await supabase.from('lessons').update(update).eq('id', id);
    if (error) console.error('Error lesson', idx, ':', error.message);
    else console.log('✅ Lesson', idx, 'updated');
  }
  console.log('\nBatch 3 done (lessons 9-12)');
}
run().catch(console.error);
