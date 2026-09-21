import { validateChapterName, reorderChapters } from '../utils';
import { Chapter } from '../types';

describe('ChapterEditor - Utils', () => {
  describe('validateChapterName', () => {
    test('空名称应该返回错误', () => {
      const result = validateChapterName('', [], undefined);
      expect(result).toBe('章节名称不能为空');
    });

    test('超过100字符应该返回错误', () => {
      const longName = 'a'.repeat(101);
      const result = validateChapterName(longName, [], undefined);
      expect(result).toBe('章节名称长度不能超过100个字符');
    });

    test('重复名称应该返回错误', () => {
      const chapters: Chapter[] = [
        { id: 1, name: '第一章', sort: 1 },
        { id: 2, name: '第二章', sort: 2 },
      ];
      const result = validateChapterName('第一章', chapters, 2);
      expect(result).toBe('章节名称不能重复');
    });

    test('自己的名称不应该算作重复', () => {
      const chapters: Chapter[] = [
        { id: 1, name: '第一章', sort: 1 },
      ];
      const result = validateChapterName('第一章', chapters, 1);
      expect(result).toBe('');
    });

    test('有效名称应该返回空字符串', () => {
      const chapters: Chapter[] = [];
      const result = validateChapterName('第一章', chapters, undefined);
      expect(result).toBe('');
    });
  });

  describe('reorderChapters', () => {
    test('应该重新计算 sort 字段', () => {
      const chapters: Chapter[] = [
        { id: 1, name: '第一章', sort: 5 },
        { id: 2, name: '第二章', sort: 10 },
        { id: 3, name: '第三章', sort: 15 },
      ];

      const result = reorderChapters(chapters);

      expect(result[0].sort).toBe(1);
      expect(result[1].sort).toBe(2);
      expect(result[2].sort).toBe(3);
    });

    test('应该保持原数组不变', () => {
      const chapters: Chapter[] = [
        { id: 1, name: '第一章', sort: 5 },
      ];

      const result = reorderChapters(chapters);

      expect(result).not.toBe(chapters);
      expect(chapters[0].sort).toBe(5);
    });
  });
});
