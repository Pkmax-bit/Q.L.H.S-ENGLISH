// Enrich assignment descriptions
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../src/config/database');
const CLASS_ID = '247a930d-17ed-402f-8ae1-b6f1df546f46';

async function run() {
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id,title,assignment_type')
    .eq('class_id', CLASS_ID);

  if (!assignments) { console.error('No assignments found'); return; }

  for (const a of assignments) {
    let desc = '';
    if (a.title.includes('Part 1')) {
      desc = `<h3>🖼️ Luyện tập Part 1: Photographs</h3>
<p><strong>Hướng dẫn:</strong> Đọc mỗi câu mô tả và chọn đáp án đúng nhất. Hãy tưởng tượng bạn đang nhìn một bức tranh.</p>
<table>
<tr><td>📝 Số câu</td><td><strong>5 câu trắc nghiệm</strong></td></tr>
<tr><td>⏱️ Thời gian</td><td>~3 phút</td></tr>
<tr><td>🎯 Mục tiêu</td><td>4/5 câu đúng (80%)</td></tr>
<tr><td>💡 Kỹ năng</td><td>Nhận dạng hành động, vị trí, trạng thái</td></tr>
</table>
<blockquote><p>💡 <strong>Tip:</strong> Chú ý <em>passive voice</em> và <em>giới từ vị trí</em> — đây là 2 điểm hay sai nhất!</p></blockquote>`;
    } else if (a.title.includes('Part 2')) {
      desc = `<h3>🗣️ Luyện tập Part 2: Question & Response</h3>
<p><strong>Hướng dẫn:</strong> Đọc câu hỏi và chọn câu trả lời phù hợp nhất.</p>
<table>
<tr><td>📝 Số câu</td><td><strong>5 câu trắc nghiệm</strong></td></tr>
<tr><td>⏱️ Thời gian</td><td>~3 phút</td></tr>
<tr><td>🎯 Mục tiêu</td><td>4/5 câu đúng</td></tr>
<tr><td>💡 Kỹ năng</td><td>Nhận dạng WH-question, loại trừ bẫy</td></tr>
</table>
<blockquote><p>⚠️ <strong>Lưu ý:</strong> Đáp án lặp từ trong câu hỏi thường là <span style="color: #e03e2d;">BẪY</span>!</p></blockquote>`;
    } else if (a.title.includes('Grammar')) {
      desc = `<h3>📖 Luyện tập Part 5: Grammar & Vocabulary</h3>
<p><strong>Hướng dẫn:</strong> Điền từ thích hợp vào chỗ trống. Tập trung vào từ loại, thì, giới từ.</p>
<table>
<tr><td>📝 Số câu</td><td><strong>7 câu trắc nghiệm</strong></td></tr>
<tr><td>⏱️ Thời gian</td><td>~4 phút (30s/câu)</td></tr>
<tr><td>🎯 Mục tiêu</td><td>5/7 câu đúng</td></tr>
<tr><td>💡 Kỹ năng</td><td>Word form, tenses, prepositions, conjunctions</td></tr>
</table>
<blockquote><p>💡 <strong>Chiến lược:</strong> Nhìn đuôi từ (-tion, -ful, -ly) trước để xác định từ loại cần điền!</p></blockquote>`;
    } else if (a.title.includes('Writing') || a.title.includes('Email')) {
      desc = `<h3>✍️ Luyện viết Email theo chuẩn TOEIC</h3>
<p><strong>Hướng dẫn:</strong> Viết email theo tình huống cho sẵn. Sử dụng cấu trúc email chuẩn và từ vựng TOEIC.</p>
<table>
<tr><td>📝 Số câu</td><td><strong>2 bài tự luận</strong></td></tr>
<tr><td>⏱️ Thời gian</td><td>~20 phút (10 phút/bài)</td></tr>
<tr><td>🎯 Mục tiêu</td><td>Viết email hoàn chỉnh, đúng format</td></tr>
<tr><td>💡 Kỹ năng</td><td>Business email writing, formal tone</td></tr>
</table>
<p><strong>Cấu trúc email chuẩn:</strong></p>
<ol>
<li>Greeting (Dear Mr./Ms.)</li>
<li>Purpose (I am writing to...)</li>
<li>Details (body)</li>
<li>Closing (Please do not hesitate... / I look forward to...)</li>
<li>Sign-off (Best regards,)</li>
</ol>`;
    } else if (a.title.includes('Mini Test')) {
      desc = `<h3>📝 Mini Test tổng hợp: Part 5 + 6 + 7</h3>
<p><strong>Hướng dẫn:</strong> Bài kiểm tra kết hợp trắc nghiệm và tự luận. Mô phỏng phần Reading thực tế.</p>
<table>
<tr><td>📝 Số câu</td><td><strong>3 trắc nghiệm + 2 tự luận</strong></td></tr>
<tr><td>⏱️ Thời gian</td><td>~15 phút</td></tr>
<tr><td>🎯 Mục tiêu</td><td>70+ điểm / 100</td></tr>
<tr><td>💡 Kỹ năng</td><td>Grammar + Vocabulary + Reading + Writing</td></tr>
</table>
<blockquote><p>🎯 <strong>Lưu ý:</strong> Làm phần trắc nghiệm trước (nhanh), dành thời gian cho tự luận!</p></blockquote>`;
    }

    if (desc) {
      const { error } = await supabase.from('assignments').update({
        description: desc,
        updated_at: new Date().toISOString(),
      }).eq('id', a.id);
      if (error) console.error('Error:', a.title, error.message);
      else console.log('✅', a.title);
    }
  }
  console.log('\nAssignment descriptions updated!');
}
run().catch(console.error);
