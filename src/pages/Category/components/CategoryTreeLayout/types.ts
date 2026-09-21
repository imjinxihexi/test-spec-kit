import type { CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';

/**
 * CategoryTreeLayout 组件的 Props
 */
export interface CategoryTreeLayoutProps {
  /**
   * 渲染右侧内容区域
   * @param selectedNodeId 当前选中的节点 ID ('all' 或数字)
   * @param refresh 刷新分类树的方法
   */
  renderContent: (
    selectedNodeId: number | string,
    refresh: () => void
  ) => React.ReactNode;

  /**
   * 额外的子组件（如 Modal、Drawer 等），会在 Context Provider 内部渲染
   */
  children?: React.ReactNode;

  /**
   * 是否显示叶子节点
   * @default true
   */
  showLeafNodes?: boolean;

  /**
   * 是否在分类树顶部显示【排序】按钮（点击弹出排序弹窗）
   * @default false
   */
  sortable?: boolean;

  /**
   * 排序保存成功后的回调（用于刷新右侧表格等）；左侧分类树会由布局内部自动刷新
   */
  onSorted?: () => void;

  /**
   * 默认选中的节点 ID
   * @default 'all'
   */
  defaultSelectedNodeId?: number | string;

  /**
   * 左侧列宽度 (基于 24 栅格)
   * @default 4
   */
  leftSpan?: number;

  /**
   * 右侧列宽度 (基于 24 栅格)
   * @default 20
   */
  rightSpan?: number;

  /**
   * 容器高度的视口偏移量（px）。容器高度 = calc(100vh - heightOffset)。
   *
   * 为什么需要它：骁龙基座传给子应用的容器是 height:auto，布局内部那条
   * `height:100%` → `flex:1` → `overflow:hidden` 的链条会断掉，导致分类树全展开时
   * 把整个页面顶高、右侧内容下方出现大片空白。这里给容器一个确定高度把链补上。
   *
   * 默认 70 = 基座顶部 tab 栏高度。若某个页面所处的框架头部高度不同（如学员端），
   * 传入对应数值覆盖即可。
   * @default 70
   */
  heightOffset?: number;

  /**
   * 分类树数据加载完成的回调
   */
  onTreeDataLoaded?: (treeData: CategoryTreeNode[]) => void;

  /**
   * 自定义获取分类树数据的函数
   * 返回 CategoryTreeNode[]（不含"全部"虚拟节点，组件内部会自动添加）
   * 不传则使用默认的 admin 端 getCategoryTree
   */
  fetchTreeData?: () => Promise<CategoryTreeNode[]>;
}
