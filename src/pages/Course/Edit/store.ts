import { $t } from "@/i18n";
import { VisibilityEnum, type VisibilityRule } from '@/typings/visibility';
// ==================== 基础类型定义 ====================
export type Chapter = {
  id?: number;
  name: string;
  sort: number;
};
export type CoursewareItem = {
  id?: number; // 内容关联ID
  coursewareCode: number; // 课件ID (课件编码 coursewareCode)
  coursewareName: string;
  duration: number; // 秒
  chapterId?: number; // 所属章节ID
  sort: number;
  gmtModified?: string;
  fileType?: string; // 文件类型
};
export type BasicInfo = {
  name: string;
  categoryId?: number;
  isHidden: boolean;
  visibility: VisibilityEnum;
  visibilityRules: VisibilityRule[];
  hasChapter: boolean;
  studyMode: 1 | 2; // 1:顺序 2:自由
  labels: number[];
  lang: string;
  introduction: string;
  coverUrl: string;
};

// ==================== State 定义 ====================
export type CoursePageState = {
  // 模式控制
  mode: 'create' | 'edit' | 'detail';
  courseCode?: number;

  // 基础信息
  basicInfo: BasicInfo;

  // 章节列表（平铺结构）
  chapters: Chapter[];

  // 课件列表（平铺结构）
  coursewares: CoursewareItem[];

  // UI 状态
  ui: {
    chapterEditorVisible: boolean;
    coursewareSelectorVisible: boolean;
    selectedChapterId?: number;
    systemCovers: string[];
    loading: boolean;
  };
};

// ==================== 初始状态 ====================
export const initialState: CoursePageState = {
  mode: 'create',
  courseCode: undefined,
  basicInfo: {
    name: '',
    categoryId: undefined,
    isHidden: false,
    visibility: VisibilityEnum.PUBLIC,
    visibilityRules: [],
    hasChapter: false,
    studyMode: 1,
    labels: [],
    lang: '',
    introduction: '',
    coverUrl: ''
  },
  chapters: [],
  coursewares: [],
  ui: {
    chapterEditorVisible: false,
    coursewareSelectorVisible: false,
    selectedChapterId: undefined,
    systemCovers: [],
    loading: false
  }
};

// ==================== Action 类型定义 ====================
export type ACTIONTYPE =
// 页面初始化
{
  type: 'INIT_PAGE';
  payload: {
    mode: 'create' | 'edit' | 'detail';
    courseCode?: number;
    categoryId?: number;
  };
} | {
  type: 'LOAD_COURSE_DETAIL';
  payload: Partial<CoursePageState>;
}

// 基础信息
| {
  type: 'SET_BASIC_INFO';
  payload: Partial<BasicInfo>;
} | {
  type: 'TOGGLE_HAS_CHAPTER';
  payload: boolean;
}

// 章节管理
| {
  type: 'UPDATE_CHAPTERS';
  payload: Chapter[];
}

// 课件管理
| {
  type: 'ADD_COURSEWARES';
  payload: CoursewareItem[];
} | {
  type: 'DELETE_COURSEWARE';
  payload: number;
} // coursewareCode (coursewareCode)
| {
  type: 'REORDER_COURSEWARES';
  payload: CoursewareItem[];
} | {
  type: 'UPDATE_COURSEWARE_CHAPTER';
  payload: {
    coursewareCode: number;
    chapterId?: number;
  };
} | {
  type: 'CLEAR_COURSEWARES';
} // 清空课件列表

// UI 状态
| {
  type: 'SET_CHAPTER_EDITOR_VISIBLE';
  payload: boolean;
} | {
  type: 'SET_COURSEWARE_SELECTOR_VISIBLE';
  payload: boolean;
} | {
  type: 'SET_SELECTED_CHAPTER';
  payload?: number;
} | {
  type: 'SET_SYSTEM_COVERS';
  payload: string[];
} | {
  type: 'SET_LOADING';
  payload: boolean;
};

// ==================== Reducer ====================
export function reducer(state: CoursePageState, action: ACTIONTYPE): CoursePageState {
  switch (action.type) {
    case 'INIT_PAGE':
      return {
        ...initialState,
        mode: action.payload.mode,
        courseCode: action.payload.courseCode,
        basicInfo: {
          ...initialState.basicInfo,
          categoryId: action.payload.categoryId
        },
        chapters: [...initialState.chapters],
        coursewares: [...initialState.coursewares],
        ui: {
          ...initialState.ui,
          systemCovers: [...initialState.ui.systemCovers]
        }
      };
    case 'LOAD_COURSE_DETAIL':
      return {
        ...state,
        ...action.payload,
        ui: {
          ...state.ui,
          selectedChapterId: action.payload.chapters?.[0]?.id
        }
      };
    case 'SET_BASIC_INFO':
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          ...action.payload
        }
      };
    case 'SET_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload
        }
      };
    case 'SET_SYSTEM_COVERS':
      return {
        ...state,
        ui: {
          ...state.ui,
          systemCovers: action.payload
        }
      };
    case 'SET_CHAPTER_EDITOR_VISIBLE':
      return {
        ...state,
        ui: {
          ...state.ui,
          chapterEditorVisible: action.payload
        }
      };
    case 'SET_COURSEWARE_SELECTOR_VISIBLE':
      return {
        ...state,
        ui: {
          ...state.ui,
          coursewareSelectorVisible: action.payload
        }
      };
    case 'SET_SELECTED_CHAPTER':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedChapterId: action.payload
        }
      };
    case 'UPDATE_CHAPTERS':
      {
        const newChapters = action.payload;
        const deletedChapterIds = state.chapters.filter(ch => !newChapters.find(newCh => newCh.id === ch.id)).map(ch => ch.id);

        // 清理已删除章节的课件关联
        const updatedCoursewares = state.coursewares.map(cw => {
          if (deletedChapterIds.includes(cw.chapterId)) {
            return {
              ...cw,
              chapterId: undefined
            };
          }
          return cw;
        });
        return {
          ...state,
          chapters: newChapters,
          coursewares: updatedCoursewares
        };
      }
    case 'ADD_COURSEWARES':
      {
        const newCoursewares = action.payload.map((cw, index) => ({
          ...cw,
          sort: state.coursewares.length + index + 1,
          chapterId: state.ui.selectedChapterId
        }));
        return {
          ...state,
          coursewares: [...state.coursewares, ...newCoursewares]
        };
      }
    case 'DELETE_COURSEWARE':
      {
        const coursewareCode = action.payload;
        const remainingCoursewares = state.coursewares.filter(cw => cw.coursewareCode !== coursewareCode).map((cw, index) => ({
          ...cw,
          sort: index + 1 // 重新编号
        }));
        return {
          ...state,
          coursewares: remainingCoursewares
        };
      }
    case 'REORDER_COURSEWARES':
      {
        const reorderedCoursewares = action.payload.map((cw, index) => ({
          ...cw,
          sort: index + 1
        }));
        return {
          ...state,
          coursewares: reorderedCoursewares
        };
      }
    case 'UPDATE_COURSEWARE_CHAPTER':
      {
        const {
          coursewareCode,
          chapterId
        } = action.payload;
        return {
          ...state,
          coursewares: state.coursewares.map(cw => cw.coursewareCode === coursewareCode ? {
            ...cw,
            chapterId
          } : cw)
        };
      }
    case 'CLEAR_COURSEWARES':
      {
        return {
          ...state,
          coursewares: []
        };
      }
    case 'TOGGLE_HAS_CHAPTER':
      {
        const hasChapter = action.payload;
        if (hasChapter) {
          // 不区分 → 区分：创建"章节1"并移入所有课件
          const newChapterId = Date.now();
          const newChapter: Chapter = {
            id: newChapterId,
            name: $t("章节1"),
            sort: 1
          };
          return {
            ...state,
            basicInfo: {
              ...state.basicInfo,
              hasChapter: true
            },
            chapters: [newChapter],
            coursewares: state.coursewares.map(cw => ({
              ...cw,
              chapterId: newChapterId
            })),
            ui: {
              ...state.ui,
              selectedChapterId: newChapterId
            }
          };
        } else {
          // 区分 → 不区分：删除章节，平铺课件
          const flattenedCoursewares: CoursewareItem[] = [];

          // 按章节 sort 升序遍历
          const sortedChapters = [...state.chapters].sort((a, b) => a.sort - b.sort);
          sortedChapters.forEach(chapter => {
            // 获取该章节下的课件，按 sort 升序
            const chapterCoursewares = state.coursewares.filter(cw => cw.chapterId === chapter.id).sort((a, b) => a.sort - b.sort);
            flattenedCoursewares.push(...chapterCoursewares);
          });

          // 重新编号 sort
          const reorderedCoursewares = flattenedCoursewares.map((cw, index) => ({
            ...cw,
            chapterId: undefined,
            sort: index + 1
          }));
          return {
            ...state,
            basicInfo: {
              ...state.basicInfo,
              hasChapter: false,
              studyMode: 2 // 强制自由学习
            },
            chapters: [],
            coursewares: reorderedCoursewares
          };
        }
      }
    default:
      return state;
  }
}