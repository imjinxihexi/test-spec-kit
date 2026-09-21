import {
  formatDuration,
  formatDateTime
} from '../utils';

describe('formatDuration', () => {
  test('0 秒应该返回 "0分钟"', () => {
    expect(formatDuration(0)).toBe('0分钟');
  });

  test('60 秒应该返回 "1分钟"', () => {
    expect(formatDuration(60)).toBe('1分钟');
  });

  test('3600 秒应该返回 "60分钟"', () => {
    expect(formatDuration(3600)).toBe('60分钟');
  });

  test('90 秒应该返回 "2分钟"（四舍五入）', () => {
    expect(formatDuration(90)).toBe('2分钟');
  });

  test('负数应该返回 "0分钟"', () => {
    expect(formatDuration(-100)).toBe('0分钟');
  });
});

describe('formatDateTime', () => {
  test('应该正确格式化日期时间', () => {
    const result = formatDateTime('2026-02-05T10:30:00');
    expect(result).toBe('2026-02-05 10:30:00');
  });

  test('空字符串应该返回 "-"', () => {
    expect(formatDateTime('')).toBe('-');
  });

  test('undefined 应该返回 "-"', () => {
    expect(formatDateTime(undefined as any)).toBe('-');
  });
});
