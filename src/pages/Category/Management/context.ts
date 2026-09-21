// src/pages/Category/Management/context.ts
import { createContext, Dispatch } from 'react';
import { ACTIONTYPE, CategoryManagementState } from './store';

export type ContextValue = {
  state: CategoryManagementState;
  dispatch: Dispatch<ACTIONTYPE>;
  refreshList?: () => void; // 刷新列表的回调
};

export const Context = createContext({} as ContextValue);
