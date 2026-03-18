// Enrich lessons 1-4 with rich HTML content
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../src/config/database');

const CLASS_ID = '247a930d-17ed-402f-8ae1-b6f1df546f46';

const lessonContent = {
  1: {
    content: `<h1>📚 Giới thiệu TOEIC &amp; Chiến lược làm bài</h1>
<h2>🎯 Mục tiêu bài học</h2>
<p>Sau bài này, bạn sẽ:</p>
<ul>
<li>Hiểu <strong>cấu trúc đề thi TOEIC 2024</strong></li>
<li>Nắm chiến lược <strong>phân bổ thời gian</strong></li>
<li>Biết cách đạt mục tiêu <span style="color: #e03e2d;"><strong>650+</strong></span></li>
</ul>

<h2>📋 Cấu trúc đề thi TOEIC</h2>
<h3>🎧 LISTENING (45 phút - 100 câu)</h3>
<table>
<thead><tr><th>Part</th><th>Tên</th><th>Số câu</th><th>Thời gian/câu</th><th>Độ khó</th></tr></thead>
<tbody>
<tr><td><strong>1</strong></td><td>Photographs</td><td>6</td><td>~5 giây</td><td>⭐⭐</td></tr>
<tr><td><strong>2</strong></td><td>Question-Response</td><td>25</td><td>~5 giây</td><td>⭐⭐⭐</td></tr>
<tr><td><strong>3</strong></td><td>Conversations</td><td>39</td><td>~8 giây</td><td>⭐⭐⭐⭐</td></tr>
<tr><td><strong>4</strong></td><td>Talks</td><td>30</td><td>~8 giây</td><td>⭐⭐⭐⭐</td></tr>
</tbody>
</table>

<h3>📖 READING (75 phút - 100 câu)</h3>
<table>
<thead><tr><th>Part</th><th>Tên</th><th>Số câu</th><th>Thời gian khuyến nghị</th><th>Độ khó</th></tr></thead>
<tbody>
<tr><td><strong>5</strong></td><td>Incomplete Sentences</td><td>30</td><td>10 phút (20s/câu)</td><td>⭐⭐⭐</td></tr>
<tr><td><strong>6</strong></td><td>Text Completion</td><td>16</td><td>10 phút (37s/câu)</td><td>⭐⭐⭐</td></tr>
<tr><td><strong>7</strong></td><td>Reading Comprehension</td><td>54</td><td>55 phút (60s/câu)</td><td>⭐⭐⭐⭐⭐</td></tr>
</tbody>
</table>

<h2>🏆 Chiến lược đạt <span style="color: #e03e2d;">650+</span></h2>
<h3>Phân bổ mục tiêu</h3>
<pre><code>Listening:  350 điểm  →  70% đúng (70/100 câu)
Reading:    300 điểm  →  60% đúng (60/100 câu)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TỔNG:       650 điểm  ✅
</code></pre>

<h3>💡 <span style="background-color: #fbeeb8;">10 Tips Vàng</span></h3>
<ol>
<li>✅ <strong>Đọc câu hỏi trước</strong> khi nghe audio (Part 3, 4)</li>
<li>✅ <strong>Không dừng lại</strong> ở câu khó — đánh dấu và quay lại</li>
<li>✅ <strong>Loại trừ đáp án sai</strong> trước (elimination method)</li>
<li>✅ Part 5: tập trung vào <em>đuôi từ</em> (suffix) để nhận dạng từ loại</li>
<li>✅ Part 7: <strong>scan keyword</strong> thay vì đọc toàn bộ</li>
<li>❌ <span style="color: #e03e2d;">KHÔNG BAO GIỜ bỏ trống</span> — đoán nếu không biết</li>
<li>✅ Quản lý thời gian nghiêm ngặt bằng đồng hồ</li>
<li>✅ Làm Part 5 nhanh để dành thời gian cho Part 7</li>
<li>✅ Nghe giọng đầu tiên trong Part 2 để nhận dạng Wh-question</li>
<li>✅ Luyện tập <em>mỗi ngày ít nhất 30 phút</em></li>
</ol>

<blockquote><p>💬 <em>"The TOEIC test doesn't test how smart you are. It tests how well you take the test."</em><br>— Chiến lược quan trọng hơn kiến thức thuần!</p></blockquote>

<h2>📎 Tài liệu tham khảo</h2>
<ul>
<li>📘 <a href="https://www.ets.org/toeic" target="_blank">ETS Official TOEIC Practice</a></li>
<li>📊 Bảng phân bổ thời gian chi tiết (xem file đính kèm)</li>
<li>🎯 Bảng theo dõi tiến trình học tập cá nhân</li>
</ul>`,
    youtube_url: 'https://www.youtube.com/watch?v=hKGMWoGh8Gs',
    drive_url: 'https://drive.google.com/drive/folders/1toeic_overview_materials',
  },

  2: {
    content: `<h1>🖼️ Part 1: Photographs - Mô tả tranh</h1>
<h2>🎯 Mục tiêu: Đạt <span style="color: #2dc26b;">5/6 câu đúng</span></h2>
<p>Part 1 là phần <strong>dễ nhất</strong> trong Listening — chỉ 6 câu nhưng là điểm chắc chắn nếu biết chiến lược!</p>

<h2>📸 Chiến lược 3 bước</h2>
<h3>Bước 1: <span style="background-color: #fbeeb8;">Quan sát tranh (5 giây trước khi nghe)</span></h3>
<pre><code>Hỏi 3 câu:
  👤 AI?     → người / nhóm người / không có người
  🎬 LÀM GÌ? → hành động chính (đang V-ing)
  📍 Ở ĐÂU?  → bối cảnh, địa điểm, đồ vật xung quanh
</code></pre>

<h3>Bước 2: Nghe 4 đáp án</h3>
<ul>
<li>Chú ý <strong>động từ</strong>: <em>is sitting, are walking, has been placed</em></li>
<li>Chú ý <strong>giới từ vị trí</strong>: <em>on, in, next to, behind, in front of</em></li>
<li>Nhận diện <span style="color: #e03e2d;"><strong>bẫy âm thanh</strong></span>: close ≠ clothes, right ≠ write</li>
</ul>

<h3>Bước 3: Loại trừ ngay</h3>
<ul>
<li>❌ Mô tả hành động <strong>không có</strong> trong tranh</li>
<li>❌ Mô tả đối tượng <strong>không xuất hiện</strong></li>
<li>❌ Dùng từ giống nhưng <strong>nghĩa khác</strong></li>
</ul>

<h2>📝 Từ vựng theo chủ đề</h2>
<h3>🏢 Office Scene</h3>
<table>
<thead><tr><th>Tiếng Anh</th><th>Phiên âm</th><th>Nghĩa</th><th>Ví dụ trong đề</th></tr></thead>
<tbody>
<tr><td><strong>cubicle</strong></td><td>/ˈkjuːbɪkl/</td><td>ô làm việc</td><td>She is working in her cubicle</td></tr>
<tr><td><strong>filing cabinet</strong></td><td>/ˈfaɪlɪŋ ˈkæbɪnət/</td><td>tủ hồ sơ</td><td>Documents are in the filing cabinet</td></tr>
<tr><td><strong>monitor</strong></td><td>/ˈmɒnɪtər/</td><td>màn hình</td><td>He is looking at the monitor</td></tr>
<tr><td><strong>bulletin board</strong></td><td>/ˈbʊlətɪn bɔːrd/</td><td>bảng thông báo</td><td>Notices are posted on the board</td></tr>
<tr><td><strong>stapler</strong></td><td>/ˈsteɪplər/</td><td>dập ghim</td><td>The stapler is on the desk</td></tr>
</tbody>
</table>

<h3>🏗️ Outdoor / Street Scene</h3>
<table>
<thead><tr><th>Tiếng Anh</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>pedestrian</strong></td><td>người đi bộ</td><td>Pedestrians are crossing the street</td></tr>
<tr><td><strong>intersection</strong></td><td>ngã tư</td><td>Cars are stopped at the intersection</td></tr>
<tr><td><strong>scaffolding</strong></td><td>giàn giáo</td><td>Workers are on the scaffolding</td></tr>
<tr><td><strong>paved</strong></td><td>lát đá/nhựa</td><td>The road has been recently paved</td></tr>
<tr><td><strong>curb</strong></td><td>lề đường</td><td>A car is parked along the curb</td></tr>
</tbody>
</table>

<h3>🍽️ Restaurant / Kitchen Scene</h3>
<table>
<thead><tr><th>Tiếng Anh</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>set the table</strong></td><td>dọn bàn ăn</td><td>The table has been set for dinner</td></tr>
<tr><td><strong>pour</strong></td><td>rót</td><td>She is pouring water into a glass</td></tr>
<tr><td><strong>stack</strong></td><td>xếp chồng</td><td>Plates are stacked on the counter</td></tr>
</tbody>
</table>

<blockquote><p>⚡ <strong>Mẹo quan trọng:</strong> <span style="background-color: #c2e0f4;">Passive voice</span> rất phổ biến trong Part 1!<br>
✅ <em>The table <strong>has been set</strong></em> (mô tả trạng thái)<br>
❌ <em>Someone <strong>set</strong> the table</em> (ít dùng vì tranh mô tả kết quả, không phải quá trình)</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=XD_toeic_part1',
    drive_url: 'https://drive.google.com/drive/folders/1part1_practice_photos',
    file_url: 'https://drive.google.com/file/d/part1_20_photos_practice/view',
  },

  3: {
    content: `<h1>🗣️ Part 2: Question &amp; Response</h1>
<h2>🎯 Mục tiêu: Đạt <span style="color: #2dc26b;">20/25 câu đúng</span></h2>
<p>Part 2 chiếm <strong>25 câu</strong> — là phần mang lại nhiều điểm nhất trong Listening nếu nắm vững kỹ thuật.</p>

<h2>📋 5 Loại câu hỏi</h2>
<h3>1️⃣ WH-Questions <span style="background-color: #fbeeb8;">(Chiếm ~60%)</span></h3>
<table>
<thead><tr><th>Từ hỏi</th><th>Hỏi gì?</th><th>Dạng trả lời</th><th>Ví dụ</th></tr></thead>
<tbody>
<tr><td><strong>WHO</strong></td><td>Ai?</td><td>Tên / Chức vụ</td><td>Q: Who organized the event? → Ms. Park did.</td></tr>
<tr><td><strong>WHAT</strong></td><td>Cái gì?</td><td>Sự vật / việc</td><td>Q: What's on the agenda? → The budget review.</td></tr>
<tr><td><strong>WHERE</strong></td><td>Ở đâu?</td><td>Địa điểm</td><td>Q: Where's the meeting? → In Room 301.</td></tr>
<tr><td><strong>WHEN</strong></td><td>Khi nào?</td><td>Thời gian</td><td>Q: When is the deadline? → Next Friday.</td></tr>
<tr><td><strong>WHY</strong></td><td>Tại sao?</td><td>Lý do (Because...)</td><td>Q: Why was it canceled? → Due to low attendance.</td></tr>
<tr><td><strong>HOW</strong></td><td>Như thế nào?</td><td>Cách thức / số lượng</td><td>Q: How many copies? → About fifty.</td></tr>
</tbody>
</table>
<p>💡 <strong>KEY:</strong> Nghe rõ <span style="color: #e03e2d;">từ ĐẦU TIÊN</span> → xác định ngay loại câu hỏi!</p>

<h3>2️⃣ Yes/No Questions (~15%)</h3>
<pre><code>Q: "Is Mr. Kim available this afternoon?"
❌ "Yes, he is."         → quá đơn giản, THƯỜNG KHÔNG ĐÚNG!
✅ "He has a meeting until 3." → trả lời GIÁN TIẾP mới là đáp án
</code></pre>
<p>⚠️ <strong>Bẫy:</strong> Đáp án đúng trong TOEIC thường <span style="background-color: #fbeeb8;">KHÔNG bắt đầu bằng Yes/No</span>!</p>

<h3>3️⃣ Choice Questions (~10%)</h3>
<p><em>"Would you prefer coffee <strong>or</strong> tea?"</em> → Chọn 1 trong 2, hoặc đề xuất khác</p>

<h3>4️⃣ Tag Questions (~10%)</h3>
<p><em>"The meeting is at 3, <strong>isn't it</strong>?"</em> → Thường confirm thông tin</p>

<h3>5️⃣ Statements (~5%)</h3>
<pre><code>"I can't find the printer paper."
✅ "Check the supply closet."  → phản hồi phù hợp ngữ cảnh
❌ "Yes, I can."              → không hợp ngữ cảnh
</code></pre>

<h2>⚠️ 3 Bẫy thường gặp</h2>
<table>
<thead><tr><th>Loại bẫy</th><th>Ví dụ</th><th>Cách phòng tránh</th></tr></thead>
<tbody>
<tr><td><span style="color: #e03e2d;"><strong>Lặp từ</strong></span></td><td>Q: "Where is the <u>meeting</u>?" → ❌ "The <u>meeting</u> starts at 3."</td><td>Đáp án lặp từ câu hỏi → thường SAI</td></tr>
<tr><td><span style="color: #e03e2d;"><strong>Âm giống</strong></span></td><td>Q: "Did you <u>close</u> the door?" → ❌ "I bought new <u>clothes</u>."</td><td>Nghe kỹ ngữ cảnh, không chỉ âm</td></tr>
<tr><td><span style="color: #e03e2d;"><strong>Sai loại</strong></span></td><td>Q: "<u>When</u> is the deadline?" → ❌ "In the conference room." (Where)</td><td>Xác định đúng Wh-word</td></tr>
</tbody>
</table>

<blockquote><p>🎯 <strong>Chiến lược thi thật:</strong><br>
1. Tập trung nghe <strong>3 giây đầu</strong> của câu hỏi<br>
2. Loại bỏ ngay đáp án có <strong>từ lặp</strong><br>
3. Chọn đáp án <strong>trả lời gián tiếp</strong> — thường là đáp án đúng!</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=YZ_toeic_part2',
    drive_url: 'https://drive.google.com/drive/folders/1part2_audio_100questions',
  },

  4: {
    content: `<h1>🎙️ Part 3: Conversations</h1>
<h2>🎯 Mục tiêu: Đạt <span style="color: #2dc26b;">28/39 câu đúng</span> (~72%)</h2>

<h2>📋 Đặc điểm Part 3</h2>
<ul>
<li><strong>13 đoạn hội thoại</strong>, mỗi đoạn <strong>3 câu hỏi</strong> = 39 câu</li>
<li>2-3 người nói (có thể mix giọng nam/nữ, giọng Mỹ/Anh/Úc)</li>
<li>Mỗi đoạn dài <strong>30-45 giây</strong></li>
</ul>

<h2>🔑 Chiến lược 4 bước</h2>
<table>
<thead><tr><th>Bước</th><th>Thời điểm</th><th>Hành động</th></tr></thead>
<tbody>
<tr><td><span style="background-color: #fbeeb8;"><strong>1. Preview</strong></span></td><td>Trước khi nghe</td><td>Đọc trước 3 câu hỏi + 4 đáp án mỗi câu</td></tr>
<tr><td><span style="background-color: #c2e0f4;"><strong>2. Listen</strong></span></td><td>Trong khi nghe</td><td>Tập trung nghe ý chính, đánh dấu đáp án ngay</td></tr>
<tr><td><span style="background-color: #d5e8d4;"><strong>3. Answer</strong></span></td><td>Trong khi nghe</td><td>Trả lời ngay khi nghe được, KHÔNG chờ hết audio</td></tr>
<tr><td><span style="background-color: #f8cecc;"><strong>4. Move on</strong></span></td><td>Audio kết thúc</td><td>Chuyển ngay sang preview 3 câu tiếp theo</td></tr>
</tbody>
</table>

<h2>📝 Các chủ đề thường gặp</h2>
<h3>🏢 Công việc văn phòng</h3>
<ul>
<li><strong>schedule a meeting</strong> — đặt lịch họp</li>
<li><strong>submit a report</strong> — nộp báo cáo</li>
<li><strong>meet the deadline</strong> — kịp hạn chót</li>
<li><strong>postpone / reschedule</strong> — hoãn / dời lịch</li>
<li><strong>quarterly report</strong> — báo cáo quý</li>
</ul>

<h3>🛒 Mua sắm / Dịch vụ</h3>
<ul>
<li><strong>place an order</strong> — đặt hàng</li>
<li><strong>out of stock</strong> — hết hàng</li>
<li><strong>get a refund</strong> — hoàn tiền</li>
<li><strong>exchange / return</strong> — đổi / trả hàng</li>
</ul>

<h3>✈️ Du lịch / Vận chuyển</h3>
<ul>
<li><strong>book a flight</strong> — đặt vé máy bay</li>
<li><strong>check in / check out</strong> — nhận / trả phòng</li>
<li><strong>delayed / canceled</strong> — bị hoãn / hủy</li>
<li><strong>itinerary</strong> — lịch trình</li>
</ul>

<h2>🎯 Dạng câu hỏi thường gặp</h2>
<table>
<thead><tr><th>Dạng</th><th>Câu hỏi mẫu</th><th>Cách trả lời</th></tr></thead>
<tbody>
<tr><td><strong>Main topic</strong></td><td>What are the speakers discussing?</td><td>Nghe ý chính đoạn đầu</td></tr>
<tr><td><strong>Detail</strong></td><td>What does the man suggest?</td><td>Nghe từ khóa suggest/recommend</td></tr>
<tr><td><strong>Next action</strong></td><td>What will the woman probably do next?</td><td>Nghe phần cuối hội thoại</td></tr>
<tr><td><strong>Inference</strong></td><td>What does the man imply when he says "..."?</td><td>Hiểu ngữ cảnh, không dịch word-by-word</td></tr>
<tr><td><strong>Graphic</strong></td><td>Look at the graphic. Which...?</td><td>Kết hợp nghe + nhìn bảng/biểu đồ</td></tr>
</tbody>
</table>

<blockquote><p>💡 <strong>Pro tip:</strong> Nếu lỡ bỏ sót 1 câu, <span style="color: #e03e2d;"><strong>ĐỪNG cố quay lại</strong></span>. Đánh dấu bừa và chuyển sang câu tiếp. Mất 1 câu tốt hơn mất 3 câu!</p></blockquote>`,
    youtube_url: 'https://www.youtube.com/watch?v=AB_toeic_part3',
    drive_url: 'https://drive.google.com/drive/folders/1part3_conversations',
  },
};

async function run() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id,order_index')
    .eq('class_id', CLASS_ID)
    .order('order_index');

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
  console.log('\nBatch 1 done (lessons 1-4)');
}
run().catch(console.error);
