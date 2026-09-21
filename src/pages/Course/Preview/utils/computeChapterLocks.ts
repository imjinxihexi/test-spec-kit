export interface CoursewareProgress {
  progress: number;
  watchDuration: number;
  isCompleted: boolean;
}

export interface ChapterLockInfo {
  locked: boolean;
}

export interface ChapterForLock {
  chapterId: number;
  coursewareCodes: number[];
}

/**
 * 计算章节锁定状态
 * - studyMode !== 1: 所有章节解锁
 * - studyMode === 1: 按章节顺序，上一章节所有课件 progress===100 后解锁下一章节
 * - 第一个章节和虚拟章节(id=0)始终解锁
 */
export function computeChapterLocks(
  chapters: ChapterForLock[],
  progressMap: Map<number, CoursewareProgress>,
  studyMode: number
): Map<number, ChapterLockInfo> {
  const lockMap = new Map<number, ChapterLockInfo>();

  if (chapters.length === 0) return lockMap;

  if (studyMode !== 1) {
    chapters.forEach((ch) => lockMap.set(ch.chapterId, { locked: false }));
    return lockMap;
  }

  let prevChapterCompleted = true;

  for (const chapter of chapters) {
    const isFirst = chapter === chapters[0];
    const isVirtual = chapter.chapterId === 0;

    if (isFirst || isVirtual) {
      lockMap.set(chapter.chapterId, { locked: false });
    } else {
      lockMap.set(chapter.chapterId, { locked: !prevChapterCompleted });
    }

    const allCompleted = chapter.coursewareCodes.every((code) => {
      const p = progressMap.get(code);
      return p != null && p.progress >= 100;
    });
    prevChapterCompleted = allCompleted;
  }

  return lockMap;
}
