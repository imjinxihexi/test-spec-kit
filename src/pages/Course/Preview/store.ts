import type { CourseDetailResp, ChapterWithContents } from '@/api/xp-evi-learning-admin-eu-boot/course';
import type { LearnerCourseDetailResp, LearnerChapter } from '@/api/xp-evi-learning-student-eu-boot/course';
import {
  computeChapterLocks,
  type CoursewareProgress,
  type ChapterLockInfo,
  type ChapterForLock,
} from './utils/computeChapterLocks';

export type PreviewMode = 'preview' | 'study';

export type PreviewState = {
  courseCode: string;
  courseName: string;
  studyMode: number;
  totalDuration: number;
  chapters: ChapterWithContents[];
  selectedCoursewareCode: number | null;
  loading: boolean;
  // 学习模式扩展
  mode: PreviewMode;
  planId: number | null;
  courseProgress: number;
  coursewareProgressMap: Map<number, CoursewareProgress>;
  chapterLockMap: Map<number, ChapterLockInfo>;
  // 课件下载类型映射 (coursewareCode -> downloadType)
  downloadTypeMap: Map<number, number>;
  // 课件文件类型映射 (coursewareCode -> fileType string)
  coursewareFileTypeMap: Map<number, string>;
};

export const initialState: PreviewState = {
  courseCode: '',
  courseName: '',
  studyMode: 0,
  totalDuration: 0,
  chapters: [],
  selectedCoursewareCode: null,
  loading: false,
  mode: 'preview',
  planId: null,
  courseProgress: 0,
  coursewareProgressMap: new Map(),
  chapterLockMap: new Map(),
  downloadTypeMap: new Map(),
  coursewareFileTypeMap: new Map(),
};

export type ACTIONTYPE =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INIT_COURSE'; payload: CourseDetailResp }
  | { type: 'SELECT_COURSEWARE'; payload: number }
  | { type: 'INIT_STUDY_COURSE'; payload: LearnerCourseDetailResp }
  | { type: 'UPDATE_COURSEWARE_PROGRESS'; payload: { coursewareCode: number; progress: number; isCompleted: boolean } }
  | { type: 'UPDATE_DOWNLOAD_TYPE_MAP'; payload: Map<number, number> };

/** 从章节列表构建锁定计算所需的结构 */
function buildChaptersForLock(chapters: ChapterWithContents[]): ChapterForLock[] {
  return chapters.map((ch) => ({
    chapterId: ch.id,
    coursewareCodes: ch.contents.map((c) => c.coursewareCode),
  }));
}

/** 将学员端章节数据适配为现有 ChapterWithContents 结构
 *
 * ⚠️ 多语言分组去重:后端返回时,同 groupCode 的多语言课件是 N 条独立记录(每种语言一条),
 * 但业务上它们是"同一份内容的多语言版本",UI 上应该只显示 1 条,由顶部语言切换器切 code。
 * 这里按 groupCode 去重,每组保留**第一条**作为代表(切换语言时通过 langVariants 映射到目标 code)。
 * 单语言课件(无 groupCode 或 groupCode 为空)不去重,原样保留。
 */
function adaptLearnerChapters(learnerChapters: LearnerChapter[]): ChapterWithContents[] {
  return learnerChapters.map((ch, index) => {
    const seenGroups = new Set<string>();
    const dedupedCoursewares = ch.coursewares.filter(cw => {
      const gc = cw.groupCode;
      if (!gc) return true; // 单语言课件直接保留
      if (seenGroups.has(gc)) return false; // 同组重复,跳过
      seenGroups.add(gc);
      return true;
    });
    return {
      id: ch.chapterId,
      name: ch.chapterName,
      sort: index + 1,
      contents: dedupedCoursewares.map((cw, cwIndex) => ({
        id: cw.coursewareCode,
        coursewareCode: cw.coursewareCode,
        coursewareName: cw.name,
        duration: cw.duration,
        sort: cwIndex + 1,
      })),
    };
  });
}

/** 从学员端数据构建课件进度 Map */
function buildProgressMap(learnerChapters: LearnerChapter[]): Map<number, CoursewareProgress> {
  const map = new Map<number, CoursewareProgress>();
  for (const ch of learnerChapters) {
    for (const cw of ch.coursewares) {
      map.set(cw.coursewareCode, {
        progress: cw.progress,
        watchDuration: cw.watchDuration,
        isCompleted: cw.progress >= 100,
      });
    }
  }
  return map;
}

export function reducer(state: PreviewState, action: ACTIONTYPE): PreviewState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'INIT_COURSE': {
      const { name, studyMode, chapters = [], coursewareContents = [] } = action.payload;

      const rawChapters: ChapterWithContents[] =
        chapters.length > 0
          ? chapters
          : coursewareContents.length > 0
            ? [{ id: 0, name: '', sort: 0, contents: coursewareContents }]
            : [];

      // ⚠️ 多语言分组去重(与 study 模式的 adaptLearnerChapters 逻辑一致):
      // 后端可能一个多语言组 N 条独立课件都在 chapter.contents 里,业务上应显示 1 条。
      // 按 groupCode 去重,保留每组第一条作为代表(切语言时通过 langVariants 换 coursewareCode)。
      const normalizedChapters: ChapterWithContents[] = rawChapters.map(ch => {
        const seen = new Set<string>();
        const deduped = ch.contents.filter(c => {
          const gc = c.groupCode;
          if (!gc) return true;
          if (seen.has(gc)) return false;
          seen.add(gc);
          return true;
        });
        return { ...ch, contents: deduped };
      });

      const totalDuration = normalizedChapters.reduce(
        (sum, ch) => sum + ch.contents.reduce((s, c) => s + (c.duration || 0), 0),
        0
      );

      const firstCourseware = normalizedChapters[0]?.contents[0];
      const defaultSelected = firstCourseware ? firstCourseware.coursewareCode : null;

      // 管理员端接口不返回 downloadType，preview 模式按文件类型判断可下载性
      // 提取课件文件类型
      const ftMap = new Map<number, string>();
      for (const ch of normalizedChapters) {
        for (const c of ch.contents) {
          if (c.fileType) {
            ftMap.set(c.coursewareCode, c.fileType.toLowerCase());
          }
        }
      }

      return {
        ...state,
        courseName: name,
        studyMode,
        totalDuration,
        chapters: normalizedChapters,
        selectedCoursewareCode: defaultSelected,
        downloadTypeMap: new Map(),
        coursewareFileTypeMap: ftMap,
        loading: false,
      };
    }

    case 'INIT_STUDY_COURSE': {
      const { name, duration, progress, studyMode, learningCoursewareChapters } = action.payload;

      const chapters = adaptLearnerChapters(learningCoursewareChapters);
      const progressMap = buildProgressMap(learningCoursewareChapters);
      const chaptersForLock = buildChaptersForLock(chapters);
      const lockMap = computeChapterLocks(chaptersForLock, progressMap, studyMode);

      const firstCourseware = chapters[0]?.contents[0];
      const defaultSelected = firstCourseware ? firstCourseware.coursewareCode : null;

      // 学员端接口直接返回 downloadType，从中提取
      const dtMap = new Map<number, number>();
      for (const ch of learningCoursewareChapters) {
        for (const cw of ch.coursewares) {
          if (cw.downloadType != null) {
            dtMap.set(cw.coursewareCode, cw.downloadType);
          }
        }
      }

      return {
        ...state,
        courseName: name,
        studyMode,
        totalDuration: duration,
        courseProgress: progress,
        chapters,
        selectedCoursewareCode: defaultSelected,
        coursewareProgressMap: progressMap,
        chapterLockMap: lockMap,
        downloadTypeMap: dtMap,
        coursewareFileTypeMap: new Map(),
        loading: false,
      };
    }

    case 'SELECT_COURSEWARE':
      return { ...state, selectedCoursewareCode: action.payload };

    case 'UPDATE_COURSEWARE_PROGRESS': {
      const { coursewareCode, progress, isCompleted } = action.payload;
      const newProgressMap = new Map(state.coursewareProgressMap);
      const existing = newProgressMap.get(coursewareCode);
      newProgressMap.set(coursewareCode, {
        progress,
        watchDuration: existing?.watchDuration ?? 0,
        isCompleted,
      });

      const chaptersForLock = buildChaptersForLock(state.chapters);
      const newLockMap = computeChapterLocks(chaptersForLock, newProgressMap, state.studyMode);

      return {
        ...state,
        coursewareProgressMap: newProgressMap,
        chapterLockMap: newLockMap,
      };
    }

    case 'UPDATE_DOWNLOAD_TYPE_MAP': {
      return { ...state, downloadTypeMap: action.payload };
    }

    default:
      return state;
  }
}
