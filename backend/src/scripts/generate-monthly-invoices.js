#!/usr/bin/env node
// Sinh hóa đơn học phí cho tất cả các lớp có fee_policy = 'monthly'.
// Cách dùng:
//   node src/scripts/generate-monthly-invoices.js              # kỳ là tháng hiện tại
//   node src/scripts/generate-monthly-invoices.js 2026-05      # kỳ tùy chọn
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const tuitionService = require('../services/tuition.service');

(async () => {
  const arg = process.argv[2];
  const yearMonth = arg || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    console.error('Sai định dạng. Dùng YYYY-MM, ví dụ: 2026-05');
    process.exit(1);
  }
  console.log(`>>> Sinh hóa đơn cho kỳ ${yearMonth}...`);
  try {
    const r = await tuitionService.generateMonthlyInvoices(yearMonth, null);
    console.log(`Đã tạo: ${r.totalCreated} hóa đơn (bỏ qua ${r.totalSkipped})`);
    for (const c of r.byClass) {
      console.log(`  - Class ${c.class_id}: tạo ${c.created_count}, bỏ qua ${c.skipped_count}`);
    }
    process.exit(0);
  } catch (e) {
    console.error('Lỗi:', e.message);
    process.exit(1);
  }
})();
