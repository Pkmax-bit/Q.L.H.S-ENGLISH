/**
 * Chạy migration SQL lên Postgres (Supabase) kèm tracking schema_migrations.
 *
 * backend/.env:
 *   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@....pooler.supabase.com:6543/postgres
 *
 * Hoặc Management API (PAT sbp_... của tài khoản sở hữu project):
 *   SUPABASE_ACCESS_TOKEN=sbp_...
 *   SUPABASE_PROJECT_REF=hfzcndypdcazmbqagbtk
 *
 * Usage:
 *   node src/migrations/apply-one.js 022_attendance_payroll.sql
 *   node src/migrations/apply-one.js --all
 *   node src/migrations/apply-one.js --fresh
 *   node src/migrations/apply-one.js --status
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const TRACKING_DDL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function migrationFiles() {
  const dir = __dirname;
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();
}

function versionOf(file) {
  return file.replace(/\.sql$/, '');
}

function runViaApi(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF || process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
  if (!token || !ref) return null;

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${ref}/database/query`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`));
          else resolve(data);
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function withPg(fn) {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) return null;
  const { Client } = require('pg');
  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function execSql(sql) {
  const pgResult = await withPg(async (client) => {
    await client.query(sql);
    return true;
  });
  if (pgResult) return 'pg';

  const apiResult = await runViaApi(sql);
  if (apiResult !== null) return 'api';

  throw new Error('Thiếu DATABASE_URL hoặc SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF');
}

async function ensureTracking() {
  await execSql(TRACKING_DDL);
}

async function getAppliedVersions() {
  const viaPg = await withPg(async (client) => {
    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version');
    return rows.map((r) => r.version);
  });
  if (viaPg) return viaPg;

  const raw = await runViaApi('SELECT version FROM schema_migrations ORDER BY version');
  if (raw === null) throw new Error('Cannot read schema_migrations');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((r) => r.version);
  } catch {
    /* ignore */
  }
  return [];
}

async function markApplied(version) {
  const safe = version.replace(/'/g, "''");
  await execSql(
    `INSERT INTO schema_migrations (version) VALUES ('${safe}') ON CONFLICT (version) DO NOTHING;`
  );
}

async function applyFile(file, { skipIfApplied = true, appliedSet } = {}) {
  const version = versionOf(file);
  if (skipIfApplied && appliedSet?.has(version)) {
    console.log(`  ${file} ... SKIP (already applied)`);
    return;
  }

  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const sql = fs.readFileSync(filePath, 'utf8');
  process.stdout.write(`  ${file} ... `);
  try {
    const via = await execSql(sql);
    await markApplied(version);
    console.log(`OK (${via})`);
  } catch (err) {
    console.log('FAILED');
    throw err;
  }
}

async function showStatus() {
  await ensureTracking();
  const applied = new Set(await getAppliedVersions());
  const files = migrationFiles();
  console.log('Migration status:');
  for (const file of files) {
    const v = versionOf(file);
    console.log(`  ${applied.has(v) ? '[x]' : '[ ]'} ${file}`);
  }
  const pending = files.filter((f) => !applied.has(versionOf(f)));
  console.log(`Applied: ${applied.size} / ${files.length}. Pending: ${pending.length}`);
}

async function main() {
  const arg = process.argv[2];

  if (arg === '--status') {
    await showStatus();
    return;
  }

  await ensureTracking();
  const appliedList = await getAppliedVersions();
  const appliedSet = new Set(appliedList);

  let files;
  let skipIfApplied = true;

  if (arg === '--all') {
    files = migrationFiles();
  } else if (arg === '--fresh') {
    files = ['000_base_schema.sql'];
    skipIfApplied = false;
  } else if (arg) {
    files = [arg];
    skipIfApplied = false;
  } else {
    files = migrationFiles().filter((f) => !appliedSet.has(versionOf(f)));
    if (files.length === 0) {
      console.log('Nothing pending. Use --status to list versions.');
      return;
    }
  }

  console.log(`Applying ${files.length} file(s)...`);
  for (const file of files) {
    await applyFile(file, { skipIfApplied, appliedSet });
    appliedSet.add(versionOf(file));
  }
  console.log('Done. Reload API / PostgREST schema (vài giây) rồi thử lại.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
