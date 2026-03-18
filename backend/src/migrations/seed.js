const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

async function seed() {
  const client = await pool.connect();
  try {
    // Check if admin exists
    const { rows } = await client.query("SELECT id FROM users WHERE email = 'admin@edu.com'");
    if (rows.length > 0) {
      console.log('Admin user already exists, skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('admin123', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, $4, $5)`,
      ['admin@edu.com', passwordHash, 'admin', 'Administrator', '0900000000']
    );

    // Seed some finance categories
    const categories = [
      ['Học phí', 'income'],
      ['Phí tài liệu', 'income'],
      ['Phí khác', 'income'],
      ['Lương giáo viên', 'expense'],
      ['Thuê mặt bằng', 'expense'],
      ['Điện nước', 'expense'],
      ['Vật tư văn phòng', 'expense'],
      ['Chi phí khác', 'expense'],
    ];

    for (const [name, type] of categories) {
      await client.query(
        `INSERT INTO finance_categories (name, type) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [name, type]
      );
    }

    console.log('🌱 Seed completed!');
    console.log('Admin account: admin@edu.com / admin123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
