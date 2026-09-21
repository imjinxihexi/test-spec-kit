import { CourseDetailResp } from '@/api/xp-evi-learning-admin-eu-boot/course';
import type { CoursePageState, Chapter, CoursewareItem } from './store';
import {
  VisibilityEnum,
  deriveVisibilityFromHidden,
} from '@/typings/visibility';

// ==================== 类型定义 ====================
type ChapterWithContents = {
  id?: number;
  name: string;
  sort: number;
  contents: ContentItem[];
};

type ContentItem = {
  id?: number;
  coursewareCode: number;  // 课件编码 (coursewareCode)
  sort: number;
};

// ==================== 后端嵌套结构 → 前端平铺结构 ====================
export function convertDetailToState(detail: CourseDetailResp): Partial<CoursePageState> {
  const chapters: Chapter[] = [];
  const coursewares: CoursewareItem[] = [];

  if (detail.hasChapter && detail.chapters) {
    // 区分章节：提取章节和课件
    detail.chapters.forEach((chapter) => {
      chapters.push({
        id: chapter.id,
        name: chapter.name,
        sort: chapter.sort,
      });

      if (chapter.contents) {
        chapter.contents.forEach((content) => {
          coursewares.push({
            id: content.id,
            coursewareCode: content.coursewareCode,
            coursewareName: content.coursewareName || '',
            duration: content.duration || 0,
            chapterId: chapter.id,
            sort: content.sort,
            fileType: content.fileType
          });
        });
      }
    });
  } else if (detail.coursewareContents) {
    // 不区分章节：只提取课件
    detail.coursewareContents.forEach((content) => {
      coursewares.push({
        id: content.id,
        coursewareCode: content.coursewareCode,
        coursewareName: content.coursewareName || '',
        duration: content.duration || 0,
        sort: content.sort,
        gmtModified: content.gmtModified,
        fileType: content.fileType
      });
    });
  }

  return {
    basicInfo: {
      name: detail.name || '',
      categoryId: detail.categoryId,
      isHidden: detail.isHidden || false,
      visibility: (detail.visibility as VisibilityEnum) || deriveVisibilityFromHidden(detail.isHidden),
      visibilityRules: detail.visibilityRules || [],
      hasChapter: detail.hasChapter || false,
      studyMode: detail.studyMode || 2,
      labels: (detail.tags || []).map(t => t.id),
      lang: detail.lang || 'zh-CN',
      introduction: detail.introduction || '',
      coverUrl: detail.coverUrl || '',
    },
    chapters,
    coursewares,
  };
}

// ==================== 前端平铺结构 → 后端嵌套结构 ====================
export function convertStateToSubmitData(state: CoursePageState): any {
  const { basicInfo, chapters, coursewares } = state;

  // 过滤临时 ID（> 1000000000000）
  const filterTempId = (id?: number) => (id && id > 1000000000000 ? undefined : id);

  if (basicInfo.hasChapter) {
    // 区分章节：构建嵌套结构
    const chaptersWithContents: ChapterWithContents[] = chapters.map((chapter) => ({
      id: filterTempId(chapter.id),
      name: chapter.name,
      sort: chapter.sort,
      contents: coursewares
        .filter((cw) => cw.chapterId === chapter.id)
        .map((cw) => ({
          id: filterTempId(cw.id),
          coursewareCode: cw.coursewareCode,
          sort: cw.sort,
        })),
    }));

    return {
      courseCode: state.courseCode,
      name: basicInfo.name,
      categoryId: basicInfo.categoryId,
      visibility: basicInfo.visibility,
      visibilityRules:
        basicInfo.visibility === VisibilityEnum.SPECIFIED ? basicInfo.visibilityRules : undefined,
      hasChapter: true,
      studyMode: basicInfo.studyMode,
      labelIds: basicInfo.labels,
      lang: basicInfo.lang,
      introduction: basicInfo.introduction,
      coverUrl: basicInfo.coverUrl,
      chapters: chaptersWithContents,
    };
  } else {
    // 不区分章节：平铺结构
    const contents: ContentItem[] = coursewares.map((cw) => ({
      id: filterTempId(cw.id),
      coursewareCode: cw.coursewareCode,
      sort: cw.sort,
    }));

    return {
      courseCode: state.courseCode,
      name: basicInfo.name,
      categoryId: basicInfo.categoryId,
      visibility: basicInfo.visibility,
      visibilityRules:
        basicInfo.visibility === VisibilityEnum.SPECIFIED ? basicInfo.visibilityRules : undefined,
      hasChapter: false,
      studyMode: 2, // 不区分章节强制自由学习
      labelIds: basicInfo.labels,
      lang: basicInfo.lang,
      introduction: basicInfo.introduction,
      coverUrl: basicInfo.coverUrl,
      coursewareContents: contents,
    };
  }
}
