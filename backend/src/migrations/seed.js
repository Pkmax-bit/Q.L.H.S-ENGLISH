require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

async function seed() {
  const accounts = [
    { email: 'admin@edu.com', password: 'admin123', role: 'admin', full_name: 'Administrator', phone: '0900000000' },
    { email: 'teacher@edu.com', password: 'teacher123', role: 'teacher', full_name: 'Giáo Viên Demo', phone: '0900000001' },
    { email: 'student@edu.com', password: 'student123', role: 'student', full_name: 'Học Sinh Demo', phone: '0900000002' },
  ];

  for (const account of accounts) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', account.email)
      .single();

    if (existing) {
      console.log(`${account.role} (${account.email}) already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(account.password, 12);

    const { error } = await supabase.from('profiles').insert({
      email: account.email,
      password_hash: passwordHash,
      role: account.role,
      full_name: account.full_name,
      phone: account.phone,
    });

    if (error) {
      console.error(`Failed to create ${account.role}:`, error.message);
    } else {
      console.log(`✅ ${account.role}: ${account.email} / ${account.password}`);
    }
  }

  console.log('🌱 Seed completed!');
}

seed().catch(console.error);
