/**
 * CourseListTable 组件的 Props
 */
export interface CourseListTableProps {
  /**
   * 选中的分类节点 ID
   * - 'all' 表示全部分类
   * - 数字 ID 表示具体分类
   */
  selectedCategoryId?: number | string;

  /**
   * 分类树刷新回调
   */
  onRefresh?: () => void;
}
