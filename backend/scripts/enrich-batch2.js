// Enrich lessons 5-8
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../src/config/database');
const CLASS_ID = '247a930d-17ed-402f-8ae1-b6f1df546f46';

const lessonContent = {
  5: {
    content: `<h1>🎤 Part 4: Talks (Bài nói)</h1>
<h2>🎯 Mục tiêu: Đạt <span style="color: #2dc26b;">22/30 câu đúng</span></h2>
<p>Part 4 gồm <strong>10 đoạn độc thoại</strong>, mỗi đoạn <strong>3 câu hỏi</strong> = 30 câu.</p>

<h2>📋 Các loại bài nói</h2>
<table>
<thead><tr><th>Loại</th><th>Từ khóa nhận dạng</th><th>Nội dung chính</th><th>Tần suất</th></tr></thead>
<tbody>
<tr><td>📢 <strong>Announcement</strong></td><td>Attention please, we'd like to inform</td><td>Thông báo nội bộ, sân bay, cửa hàng</td><td>⭐⭐⭐⭐⭐</td></tr>
<tr><td>📻 <strong>Advertisement</strong></td><td>New, special offer, limited time</td><td>Quảng cáo sản phẩm, dịch vụ</td><td>⭐⭐⭐⭐</td></tr>
<tr><td>📰 <strong>News report</strong></td><td>According to, reported</td><td>Tin kinh doanh, giao thông</td><td>⭐⭐⭐</td></tr>
<tr><td>📞 <strong>Voicemail</strong></td><td>I'm calling about, please call back</td><td>Tin nhắn thoại, lịch hẹn</td><td>⭐⭐⭐⭐</td></tr>
<tr><td>🎤 <strong>Introduction</strong></td><td>It's my pleasure, let me introduce</td><td>Giới thiệu diễn giả, sự kiện</td><td>⭐⭐⭐</td></tr>
<tr><td>🗺️ <strong>Tour guide</strong></td><td>On your left/right, founded in</td><td>Hướng dẫn tham quan</td><td>⭐⭐</td></tr>
</tbody>
</table>

<h2>🔑 Chiến lược 4 bước</h2>
<ol>
<li><span style="background-color: #fbeeb8;"><strong>Preview:</strong></span> Đọc 3 câu hỏi trước khi audio bắt đầu</li>
<li><span style="background-color: #c2e0f4;"><strong>Câu đầu:</strong></span> Xác định loại bài nói ngay từ câu mở đầu</li>
<li><span style="background-color: #d5e8d4;"><strong>4W:</strong></span> <strong>Who</strong> (ai), <strong>What</strong> (gì), <strong>Why</strong> (mục đích), <strong>Next</strong> (tiếp theo)</li>
<li><span style="background-color: #f8cecc;"><strong>Graphic:</strong></span> Kết hợp nghe + nhìn bảng/biểu đồ</li>
</ol>

<h3>📊 Graphic Questions</h3>
<ul>
<li>Nhìn bảng/biểu đồ <strong>TRƯỚC</strong> khi nghe</li>
<li>Xác định thông tin nào cần nghe (tên, số, vị trí)</li>
<li>Kết hợp thông tin nghe + thông tin trên hình</li>
</ul>

<h2>📝 Từ vựng Announcement</h2>
<table>
<thead><tr><th>Từ/Cụm từ</th><th>Nghĩa</th></tr></thead>
<tbody>
<tr><td><strong>effective immediately</strong></td><td>có hiệu lực ngay</td></tr>
<tr><td><strong>until further notice</strong></td><td>cho đến khi có thông báo mới</td></tr>
<tr><td><strong>be advised that</strong></td><td>xin lưu ý rằng</td></tr>
<tr><td><strong>proceed to</strong></td><td>đi đến / tiến hành</td></tr>
<tr><td><strong>in the meantime</strong></td><td>trong khi chờ đợi</td></tr>
</tbody>
</table>

<blockquote><p>💡 <strong>Pro tip:</strong> Câu cuối bài nói thường chứa đáp án cho <em>"What will listeners probably do next?"</em></p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=CD_toeic_part4',
    drive_url: 'https://drive.google.com/drive/folders/1part4_talks_audio',
  },

  6: {
    content: `<h1>📖 Part 5: Ngữ pháp (Incomplete Sentences)</h1>
<h2>🎯 Mục tiêu: <span style="color: #2dc26b;">25/30 đúng</span> trong <span style="color: #e03e2d;">10 phút</span></h2>

<h2>📋 6 Dạng ngữ pháp TOEIC</h2>
<h3>1️⃣ Từ loại — <span style="background-color: #fbeeb8;">30% đề thi</span></h3>
<table>
<thead><tr><th>Từ loại</th><th>Đuôi</th><th>Ví dụ</th><th>Vị trí</th></tr></thead>
<tbody>
<tr><td>🔵 <strong>Noun</strong></td><td>-tion, -ment, -ness, -ity</td><td>information, management</td><td>Sau the/a/this</td></tr>
<tr><td>🟢 <strong>Adjective</strong></td><td>-ful, -less, -ive, -ous</td><td>successful, productive</td><td>Trước noun</td></tr>
<tr><td>🟡 <strong>Adverb</strong></td><td>-ly</td><td>significantly, efficiently</td><td>Trước adj/verb</td></tr>
<tr><td>🔴 <strong>Verb</strong></td><td>-ize, -ify, -en</td><td>organize, simplify</td><td>Sau chủ ngữ</td></tr>
</tbody>
</table>

<pre><code>Quy tắc nhanh:
  Trước NOUN  → cần ADJ:   a _____ decision → decisive ✅
  Trước ADJ   → cần ADV:   _____ important → extremely ✅
  Sau THE/A   → cần NOUN:  the _____ of → development ✅
</code></pre>

<h3>2️⃣ Thì — 15%</h3>
<table>
<thead><tr><th>Thì</th><th>Dấu hiệu</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>Present Simple</strong></td><td>always, every</td><td>The store <strong>opens</strong> at 9.</td></tr>
<tr><td><strong>Present Perfect</strong></td><td><span style="color: #e03e2d;">since, for, already, yet</span></td><td>She <strong>has worked</strong> here since 2020.</td></tr>
<tr><td><strong>Past Simple</strong></td><td>yesterday, last, ago</td><td>The company <strong>launched</strong> last year.</td></tr>
</tbody>
</table>

<h3>3️⃣ Giới từ — 15%</h3>
<pre><code>AT + giờ:    at 3 PM    |  ON + ngày:  on Monday
IN + tháng:  in January |  BY + hạn:   by Friday
DURING + sự kiện: during the meeting
DESPITE + noun: despite the rain (= although it rained)
DUE TO + noun: due to bad weather (= because of)
</code></pre>

<h3>4️⃣ Liên từ — 10%</h3>
<table>
<thead><tr><th>Liên từ</th><th>Nghĩa</th><th>Theo sau</th></tr></thead>
<tbody>
<tr><td><strong>although</strong></td><td>mặc dù</td><td>+ S + V</td></tr>
<tr><td><strong>despite</strong></td><td>mặc dù</td><td>+ Noun/V-ing</td></tr>
<tr><td><strong>unless</strong></td><td>trừ khi</td><td>+ S + V</td></tr>
</tbody>
</table>

<h3>5️⃣ Đại từ quan hệ — 10%</h3>
<p><strong>who</strong> (người-chủ) | <strong>whom</strong> (người-tân) | <strong>which</strong> (vật) | <strong>whose</strong> (sở hữu)</p>

<h3>6️⃣ Bị động — 10%</h3>
<pre><code>Chủ động: The manager approved the budget.
Bị động:  The budget was approved (by the manager).
</code></pre>

<blockquote><p>⏱️ Không biết trong 15 giây → <span style="color: #e03e2d;">đoán và đi tiếp</span>. Part 5 phải xong trong 10 phút!</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=EF_toeic_part5_grammar',
    drive_url: 'https://drive.google.com/drive/folders/1part5_grammar',
    file_url: 'https://drive.google.com/file/d/part5_cheatsheet/view',
  },

  7: {
    content: `<h1>📚 Part 5: Vocabulary — Từ vựng TOEIC</h1>
<h2>🎯 Học <span style="color: #2dc26b;">200 từ</span> xuất hiện nhiều nhất</h2>

<h3>1. 💼 Business</h3>
<table>
<thead><tr><th>Từ</th><th>Phát âm</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>revenue</strong></td><td>/ˈrevənjuː/</td><td>doanh thu</td><td>Annual revenue increased 15%</td></tr>
<tr><td><strong>expenditure</strong></td><td>/ɪkˈspendɪtʃər/</td><td>chi tiêu</td><td>Reduce expenditures</td></tr>
<tr><td><strong>merger</strong></td><td>/ˈmɜːrdʒər/</td><td>sáp nhập</td><td>The merger was completed</td></tr>
<tr><td><strong>stakeholder</strong></td><td>/ˈsteɪkhoʊldər/</td><td>bên liên quan</td><td>All stakeholders must approve</td></tr>
</tbody>
</table>

<h3>2. 👥 HR</h3>
<table>
<thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>recruit</strong></td><td>tuyển dụng</td><td>Recruiting new staff</td></tr>
<tr><td><strong>probation</strong></td><td>thử việc</td><td>3-month probation period</td></tr>
<tr><td><strong>compensation</strong></td><td>lương thưởng</td><td>Competitive compensation</td></tr>
<tr><td><strong>eligible</strong></td><td>đủ điều kiện</td><td>Eligible for promotion</td></tr>
</tbody>
</table>

<h3>3. 📊 Marketing</h3>
<table>
<thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>launch</strong></td><td>ra mắt</td><td>Product launch event</td></tr>
<tr><td><strong>survey</strong></td><td>khảo sát</td><td>Customer survey</td></tr>
<tr><td><strong>endorsement</strong></td><td>chứng thực</td><td>Celebrity endorsement</td></tr>
</tbody>
</table>

<h2>⚠️ Từ dễ nhầm</h2>
<table>
<thead><tr><th>Cặp từ</th><th>Nghĩa</th><th>Mẹo nhớ</th></tr></thead>
<tbody>
<tr><td><span style="color: #e03e2d;"><strong>affect</strong></span> vs <span style="color: #2dc26b;"><strong>effect</strong></span></td><td>tác động (v) vs kết quả (n)</td><td>Affect=Action, Effect=End result</td></tr>
<tr><td><span style="color: #e03e2d;"><strong>accept</strong></span> vs <span style="color: #2dc26b;"><strong>except</strong></span></td><td>chấp nhận vs ngoại trừ</td><td>accept=yes, except=exclude</td></tr>
<tr><td><span style="color: #e03e2d;"><strong>principal</strong></span> vs <span style="color: #2dc26b;"><strong>principle</strong></span></td><td>người chính vs nguyên tắc</td><td>principAL=A person, principLE=ruLE</td></tr>
</tbody>
</table>

<h2>🔗 Collocations</h2>
<pre><code>make  → a reservation, a decision, an appointment, progress
take  → a break, effect, responsibility, measures
submit → a report, an application, a proposal
attend → a meeting, a conference, a workshop
conduct → a survey, research, an interview
reach  → an agreement, a decision, a goal
</code></pre>

<blockquote><p>📱 <strong>Học hiệu quả:</strong> Dùng Anki flashcards 20 từ/ngày, đọc trong ngữ cảnh, viết câu ví dụ riêng</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=GH_toeic_vocabulary',
    drive_url: 'https://drive.google.com/drive/folders/1vocabulary_flashcards',
    file_url: 'https://drive.google.com/file/d/600_words_toeic/view',
  },

  8: {
    content: `<h1>📝 Part 6: Text Completion</h1>
<h2>🎯 <span style="color: #2dc26b;">12/16 đúng</span> trong <span style="color: #e03e2d;">10 phút</span></h2>

<h2>📋 Đặc điểm</h2>
<table>
<thead><tr><th>Yếu tố</th><th>Chi tiết</th></tr></thead>
<tbody>
<tr><td><strong>Số đoạn</strong></td><td>4 đoạn văn</td></tr>
<tr><td><strong>Chỗ trống</strong></td><td>4/đoạn = 16 câu</td></tr>
<tr><td><strong>Dạng</strong></td><td>3 từ/ngữ pháp + 1 sentence insertion</td></tr>
<tr><td><strong>Văn bản</strong></td><td>Email, memo, letter, article, notice</td></tr>
</tbody>
</table>

<h2>🔑 Chiến lược 3 bước</h2>
<h3>1. <span style="background-color: #fbeeb8;">Đọc lướt (30 giây)</span></h3>
<ul>
<li>Xác định loại văn bản</li>
<li>Nắm chủ đề chính</li>
</ul>

<h3>2. <span style="background-color: #c2e0f4;">Điền từ</span></h3>
<ul>
<li>Giống Part 5 nhưng <strong>phải đọc câu trước + sau</strong></li>
</ul>

<h3>3. <span style="background-color: #d5e8d4;">Sentence Insertion</span></h3>
<pre><code>1. Đọc câu TRƯỚC chỗ trống → ý nối tiếp
2. Đọc câu SAU chỗ trống  → ý kết nối
3. Loại đáp án mâu thuẫn ngữ cảnh
4. Chọn logic flow mượt nhất
</code></pre>

<h2>📄 Các dạng văn bản</h2>
<h3>📧 Email</h3>
<pre><code>Dear Mr./Ms. [Name],
I am writing to inform you that / regarding...
As discussed / Please be advised that...
Please do not hesitate to contact me.
Best regards,
</code></pre>

<h3>📋 Notice</h3>
<pre><code>NOTICE
Effective [date], [nội dung thay đổi]
All employees are required to...
For more information, please contact...
</code></pre>

<blockquote><p>⏱️ 3 câu từ/ngữ pháp: 30s/câu | 1 câu sentence: 60s → ~2.5 phút/đoạn</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=IJ_toeic_part6',
    drive_url: 'https://drive.google.com/drive/folders/1part6_practice',
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
  console.log('\nBatch 2 done (lessons 5-8)');
}
run().catch(console.error);
