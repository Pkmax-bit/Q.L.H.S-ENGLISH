const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { countInclusiveCalendarMonths } = require('../src/utils/tuitionMonths');
const { countScheduledSessions } = require('../src/utils/scheduleSessions');

describe('tuitionMonths', () => {
  it('counts inclusive calendar months', () => {
    assert.equal(countInclusiveCalendarMonths('2024-01-15', '2024-03-01'), 3);
    assert.equal(countInclusiveCalendarMonths('2024-01-01', '2024-01-31'), 1);
    assert.equal(countInclusiveCalendarMonths('2024-06-01', '2024-05-01'), 0);
    assert.equal(countInclusiveCalendarMonths(null, '2024-01-01'), null);
  });
});

describe('scheduleSessions', () => {
  it('counts sessions for weekly slot within range', () => {
    const classInfo = { start_date: '2024-01-01', end_date: '2024-01-31' };
    // Monday = 1 in JS getDay()? Sunday=0, Monday=1
    const schedules = [{ id: 's1', day_of_week: 1, is_active: true }];
    // 2024-01-01 is Monday
    const count = countScheduledSessions(classInfo, schedules, '2024-01-01', '2024-01-14');
    // Mondays: Jan 1, 8 → 2 (Jan 15 is outside if end is 14)
    assert.equal(count, 2);
  });

  it('returns 0 when no schedules', () => {
    assert.equal(
      countScheduledSessions({ start_date: '2024-01-01' }, [], '2024-01-01', '2024-01-31'),
      0
    );
  });
});
