import { computeChapterLocks } from '../computeChapterLocks';
import type { CoursewareProgress, ChapterForLock } from '../computeChapterLocks';

describe('computeChapterLocks', () => {
  test('studyMode !== 1 时所有章节解锁', () => {
    const chapters: ChapterForLock[] = [
      { chapterId: 1, coursewareCodes: [100, 101] },
      { chapterId: 2, coursewareCodes: [102] },
    ];
    const progressMap = new Map<number, CoursewareProgress>();
    const result = computeChapterLocks(chapters, progressMap, 0);

    expect(result.get(1)?.locked).toBe(false);
    expect(result.get(2)?.locked).toBe(false);
  });

  test('studyMode=1 时第一个章节始终解锁', () => {
    const chapters: ChapterForLock[] = [
      { chapterId: 1, coursewareCodes: [100] },
      { chapterId: 2, coursewareCodes: [101] },
    ];
    const progressMap = new Map<number, CoursewareProgress>();
    const result = computeChapterLocks(chapters, progressMap, 1);

    expect(result.get(1)?.locked).toBe(false);
    expect(result.get(2)?.locked).toBe(true);
  });

  test('studyMode=1 上一章节全部完成后解锁下一章节', () => {
    const chapters: ChapterForLock[] = [
      { chapterId: 1, coursewareCodes: [100, 101] },
      { chapterId: 2, coursewareCodes: [102] },
      { chapterId: 3, coursewareCodes: [103] },
    ];
    const progressMap = new Map<number, CoursewareProgress>([
      [100, { progress: 100, watchDuration: 300, isCompleted: true }],
      [101, { progress: 100, watchDuration: 200, isCompleted: true }],
      [102, { progress: 50, watchDuration: 60, isCompleted: false }],
    ]);
    const result = computeChapterLocks(chapters, progressMap, 1);

    expect(result.get(1)?.locked).toBe(false);
    expect(result.get(2)?.locked).toBe(false);
    expect(result.get(3)?.locked).toBe(true);
  });

  test('空章节列表返回空 Map', () => {
    const result = computeChapterLocks([], new Map(), 1);
    expect(result.size).toBe(0);
  });

  test('虚拟章节(id=0)始终解锁', () => {
    const chapters: ChapterForLock[] = [
      { chapterId: 0, coursewareCodes: [100, 101] },
    ];
    const result = computeChapterLocks(chapters, new Map(), 1);
    expect(result.get(0)?.locked).toBe(false);
  });
});
