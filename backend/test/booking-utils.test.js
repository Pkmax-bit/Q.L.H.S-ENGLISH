const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-at-least-32-chars!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars!';

const { normalizePhone, isValidPhone, maskName, maskPhone } = require('../src/utils/phone');
const jwtConfig = require('../src/config/jwt');

describe('normalizePhone', () => {
  it('quy mọi cách gõ của cùng một số về một dạng', () => {
    const expected = '0912345678';
    for (const raw of [
      '0912345678',
      '0912 345 678',
      '0912.345.678',
      '0912-345-678',
      '(091) 2345678',
      '+84912345678',
      '+84 912 345 678',
      '0084912345678',
      '84912345678',
      '912345678',
      '  0912345678  ',
    ]) {
      assert.equal(normalizePhone(raw), expected, `thất bại với "${raw}"`);
    }
  });

  it('trả null khi rỗng hoặc có ký tự lạ', () => {
    assert.equal(normalizePhone(''), null);
    assert.equal(normalizePhone(null), null);
    assert.equal(normalizePhone(undefined), null);
    assert.equal(normalizePhone('không phải số'), null);
    assert.equal(normalizePhone('0912abc678'), null);
  });

  it('giữ nguyên số cố định 11 chữ số', () => {
    assert.equal(normalizePhone('028 3822 1234'), '02838221234');
  });
});

describe('isValidPhone', () => {
  it('nhận di động 10 số và cố định 11 số', () => {
    assert.equal(isValidPhone('0912345678'), true);
    assert.equal(isValidPhone('02838221234'), true);
  });

  it('từ chối số quá ngắn, quá dài, hoặc không bắt đầu bằng 0', () => {
    assert.equal(isValidPhone('091234567'), false);
    assert.equal(isValidPhone('091234567890'), false);
    assert.equal(isValidPhone('912345678'), false);
    assert.equal(isValidPhone(''), false);
    assert.equal(isValidPhone(null), false);
  });
});

describe('maskName', () => {
  it('viết tắt tên gọi, giữ họ và tên đệm', () => {
    assert.equal(maskName('Nguyễn Văn An'), 'Nguyễn Văn A.');
    assert.equal(maskName('Trần Thị Bích Ngọc'), 'Trần Thị Bích N.');
    assert.equal(maskName('  Lê   Minh  '), 'Lê M.');
  });

  it('để nguyên tên một chữ và xử lý được tên rỗng', () => {
    assert.equal(maskName('An'), 'An');
    assert.equal(maskName(''), 'Ẩn danh');
    assert.equal(maskName(null), 'Ẩn danh');
  });
});

describe('maskPhone', () => {
  it('chỉ để lộ 4 số đầu và 3 số cuối', () => {
    assert.equal(maskPhone('0912345678'), '0912***678');
    assert.equal(maskPhone('123'), '***');
  });
});

describe('booking token tách biệt với access token', () => {
  it('token đăng ký không verify được bằng access secret', () => {
    const bookingToken = jwt.sign({ rid: 'r1', kind: 'booking' }, jwtConfig.booking.secret, { expiresIn: '1h' });
    assert.throws(() => jwt.verify(bookingToken, jwtConfig.access.secret), /invalid signature/);
  });

  it('access token không verify được bằng booking secret', () => {
    const accessToken = jwt.sign({ id: 'u1', role: 'admin' }, jwtConfig.access.secret, { expiresIn: '1h' });
    assert.throws(() => jwt.verify(accessToken, jwtConfig.booking.secret), /invalid signature/);
  });
});
