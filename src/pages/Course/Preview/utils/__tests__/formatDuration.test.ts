import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  test('应该正确格式化分钟（单数）', () => {
    expect(formatDuration(60)).toBe('1 minute');
  });

  test('应该正确格式化分钟（复数）', () => {
    expect(formatDuration(180)).toBe('3 minutes');
  });

  test('应该正确格式化小时+分钟', () => {
    expect(formatDuration(5400)).toBe('1 hour 30 minutes');
  });

  test('应该正确格式化多小时', () => {
    expect(formatDuration(7200)).toBe('2 hours 0 minutes');
  });

  test('应该处理 0 分钟', () => {
    expect(formatDuration(0)).toBe('0 minutes');
  });
});
