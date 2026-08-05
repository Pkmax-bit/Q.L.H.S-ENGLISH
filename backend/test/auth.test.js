const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-at-least-32-chars!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars!';

const jwtConfig = require('../src/config/jwt');

describe('auth tokens & password hashing', () => {
  it('hashes and verifies password with bcrypt', async () => {
    const hash = await bcrypt.hash('TestPassword123!', 10);
    assert.equal(await bcrypt.compare('TestPassword123!', hash), true);
    assert.equal(await bcrypt.compare('wrong', hash), false);
  });

  it('signs and verifies access JWT', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'admin' },
      jwtConfig.access.secret,
      { expiresIn: '1h' }
    );
    const decoded = jwt.verify(token, jwtConfig.access.secret);
    assert.equal(decoded.id, 'u1');
    assert.equal(decoded.role, 'admin');
  });

  it('rejects JWT signed with wrong secret', () => {
    const token = jwt.sign({ id: 'u1' }, jwtConfig.access.secret, { expiresIn: '1h' });
    assert.throws(() => jwt.verify(token, 'completely-different-secret-key-xxxx'));
  });
});
