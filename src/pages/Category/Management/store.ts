// src/pages/Category/Management/store.ts
import type { CategoryPageItem as Category, CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';

/**
 * 分类管理页面状态
 */
export type CategoryManagementState = {
  // 选中的树节点 ID
  selectedTreeNodeId: number | string;
  // 分类树数据
  treeData: CategoryTreeNode[];
  // 搜索关键词
  searchKeyword: string;
  // 是否显示新增/编辑弹窗
  modalVisible: boolean;
  // 弹窗模式（add / edit / addChild）
  modalMode: 'add' | 'edit' | 'addChild';
  // 当前编辑的分类
  currentCategory: Category | null;
  // 新增子分类时的父分类
  parentCategory: Category | null;
};

/**
 * 初始状态
 */
export const initialState: CategoryManagementState = {
  selectedTreeNodeId: 'all',
  treeData: [],
  searchKeyword: '',
  modalVisible: false,
  modalMode: 'add',
  currentCategory: null,
  parentCategory: null,
};

/**
 * Action 类型
 */
export type ACTIONTYPE =
  | { type: 'SET_SELECTED_TREE_NODE'; payload: number | string }
  | { type: 'SET_TREE_DATA'; payload: CategoryTreeNode[] }
  | { type: 'SET_SEARCH_KEYWORD'; payload: string }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'OPEN_ADD_MODAL' }
  | { type: 'OPEN_EDIT_MODAL'; payload: Category }
  | { type: 'OPEN_ADD_CHILD_MODAL'; payload: Category }
  | { type: 'CLOSE_MODAL' };

/**
 * Reducer
 */
export function reducer(
  state: CategoryManagementState,
  action: ACTIONTYPE
): CategoryManagementState {
  switch (action.type) {
    case 'SET_SELECTED_TREE_NODE':
      return {
        ...state,
        selectedTreeNodeId: action.payload,
      };

    case 'SET_TREE_DATA':
      return {
        ...state,
        treeData: action.payload,
      };

    case 'SET_SEARCH_KEYWORD':
      return {
        ...state,
        searchKeyword: action.payload,
      };

    case 'CLEAR_SEARCH':
      return {
        ...state,
        searchKeyword: '',
      };

    case 'OPEN_ADD_MODAL':
      return {
        ...state,
        modalVisible: true,
        modalMode: 'add',
        currentCategory: null,
        parentCategory: null,
      };

    case 'OPEN_EDIT_MODAL':
      return {
        ...state,
        modalVisible: true,
        modalMode: 'edit',
        currentCategory: action.payload,
        parentCategory: null,
      };

    case 'OPEN_ADD_CHILD_MODAL':
      return {
        ...state,
        modalVisible: true,
        modalMode: 'addChild',
        currentCategory: null,
        parentCategory: action.payload,
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        modalVisible: false,
        currentCategory: null,
        parentCategory: null,
      };

    default:
      return state;
  }
}
