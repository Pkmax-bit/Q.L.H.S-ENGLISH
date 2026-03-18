require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

async function seed() {
  // Check if admin exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@edu.com')
    .single();

  if (existing) {
    console.log('Admin already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 12);

  const { error: userError } = await supabase.from('users').insert({
    email: 'admin@edu.com',
    password_hash: passwordHash,
    role: 'admin',
    full_name: 'Administrator',
    phone: '0900000000',
  });
  if (userError) {
    console.error('Failed to create admin:', userError.message);
    return;
  }

  // Seed finance categories
  const categories = [
    { name: 'Học phí', type: 'income' },
    { name: 'Phí tài liệu', type: 'income' },
    { name: 'Phí khác', type: 'income' },
    { name: 'Lương giáo viên', type: 'expense' },
    { name: 'Thuê mặt bằng', type: 'expense' },
    { name: 'Điện nước', type: 'expense' },
    { name: 'Vật tư văn phòng', type: 'expense' },
    { name: 'Chi phí khác', type: 'expense' },
  ];

  const { error: catError } = await supabase.from('finance_categories').insert(categories);
  if (catError) console.error('Category seed error:', catError.message);

  console.log('🌱 Seed completed!');
  console.log('Admin: admin@edu.com / admin123');
}

seed().catch(console.error);
