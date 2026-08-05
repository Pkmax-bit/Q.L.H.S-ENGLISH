const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('path');

const validateScript = `
  process.env.SUPABASE_URL = process.env.T_SUPABASE_URL || '';
  process.env.SUPABASE_KEY = process.env.T_SUPABASE_KEY || '';
  process.env.JWT_ACCESS_SECRET = process.env.T_JWT_ACCESS || '';
  process.env.JWT_REFRESH_SECRET = process.env.T_JWT_REFRESH || '';
  process.env.CORS_ORIGIN = process.env.T_CORS || '';
  process.env.NODE_ENV = process.env.T_NODE_ENV || 'development';
  const { validateEnv } = require(${JSON.stringify(path.join(__dirname, '../src/config/validateEnv.js'))});
  validateEnv();
  console.log('OK');
`;

function runValidate(env) {
  return spawnSync(process.execPath, ['-e', validateScript], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

describe('validateEnv', () => {
  it('passes with valid secrets', () => {
    const r = runValidate({
      T_SUPABASE_URL: 'https://example.supabase.co',
      T_SUPABASE_KEY: 'key',
      T_JWT_ACCESS: 'a'.repeat(32),
      T_JWT_REFRESH: 'b'.repeat(32),
      T_NODE_ENV: 'development',
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /OK/);
  });

  it('fails when JWT secret too short', () => {
    const r = runValidate({
      T_SUPABASE_URL: 'https://example.supabase.co',
      T_SUPABASE_KEY: 'key',
      T_JWT_ACCESS: 'short',
      T_JWT_REFRESH: 'b'.repeat(32),
    });
    assert.notEqual(r.status, 0);
  });

  it('fails production with CORS_ORIGIN=*', () => {
    const r = runValidate({
      T_SUPABASE_URL: 'https://example.supabase.co',
      T_SUPABASE_KEY: 'key',
      T_JWT_ACCESS: 'a'.repeat(32),
      T_JWT_REFRESH: 'b'.repeat(32),
      T_CORS: '*',
      T_NODE_ENV: 'production',
    });
    assert.notEqual(r.status, 0);
  });
});
