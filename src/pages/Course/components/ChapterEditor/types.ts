/**
 * 章节数据结构
 */
export interface Chapter {
  /** 章节ID，新增时不传，编辑时必传 */
  id?: number;
  /** 章节名称，1-100字符 */
  name: string;
  /** 排序号，从1开始 */
  sort: number;
}

/**
 * 课程状态类型
 */
export type CourseStatus = 'published' | 'hidden' | 'disabled';

/**
 * ChapterEditor 组件 Props
 */
export interface ChapterEditorProps {
  /** 是否显示弹窗 */
  visible: boolean;
  /** 章节列表 */
  value: Chapter[];
  /** 课程状态，用于删除时的提示文案 */
  courseStatus?: CourseStatus;
  /** 章节变更回调 */
  onChange: (chapters: Chapter[]) => void;
  /** 关闭弹窗回调 */
  onClose: () => void;
}
