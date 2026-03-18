const fs = require('fs');
const path = require('path');

console.log('=== Education Center Migrations ===');
console.log('');
console.log('Supabase does not support running raw SQL via the JS client.');
console.log('Please run these migrations in Supabase SQL Editor:');
console.log('https://supabase.com/dashboard → Your Project → SQL Editor');
console.log('');

const migrationsDir = __dirname;
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

// Combine all SQL into one file
let allSql = '';
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  allSql += `-- ========== ${file} ==========\n${sql}\n\n`;
  console.log(`  ${file}`);
}

// Write combined file
const outPath = path.join(migrationsDir, '_all_migrations.sql');
fs.writeFileSync(outPath, allSql);
console.log('');
console.log(`Combined SQL written to: ${outPath}`);
console.log('Copy and paste the contents into Supabase SQL Editor and run.');
