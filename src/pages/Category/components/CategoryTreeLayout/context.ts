import { createContext, useContext } from 'react';
import type { CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';

/**
 * CategoryTreeLayout Context 值类型
 */
export interface CategoryTreeContextValue {
  /**
   * 分类树数据（包含"全部"虚拟节点）
   */
  treeData: CategoryTreeNode[];

  /**
   * 当前选中的节点 ID
   */
  selectedNodeId: number | string;

  /**
   * 设置选中节点
   */
  setSelectedNodeId: (id: number | string) => void;

  /**
   * 刷新分类树
   */
  refresh: () => void;

  /**
   * 加载状态
   */
  loading: boolean;
}

/**
 * CategoryTreeLayout Context
 */
export const CategoryTreeContext = createContext<CategoryTreeContextValue | undefined>(
  undefined
);

/**
 * 使用 CategoryTree Context 的自定义 Hook
 * @throws 如果在 CategoryTreeLayout 外部使用会抛出错误
 */
export const useCategoryTree = () => {
  const context = useContext(CategoryTreeContext);
  if (!context) {
    throw new Error('useCategoryTree must be used within CategoryTreeLayout');
  }
  return context;
};
