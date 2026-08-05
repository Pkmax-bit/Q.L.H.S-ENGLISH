/**
 * Seed a single admin account for production.
 * Usage:
 *   ADMIN_EMAIL=admin@school.com ADMIN_PASSWORD='strong-password-here' npm run seed:admin
 *
 * If the email already exists, updates password_hash and ensures role=admin.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const fullName = process.env.ADMIN_FULL_NAME || 'Administrator';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({
        password_hash: passwordHash,
        role: 'admin',
        full_name: fullName,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update admin:', error.message);
      process.exit(1);
    }
    console.log(`Updated admin password for ${email}`);
    return;
  }

  const { error } = await supabase.from('profiles').insert({
    email,
    password_hash: passwordHash,
    role: 'admin',
    full_name: fullName,
  });

  if (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }
  console.log(`Created admin: ${email}`);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
