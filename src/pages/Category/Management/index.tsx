// src/pages/Category/Management/index.tsx
import { useReducer, useRef, useCallback } from 'react';
import { CategoryTreeLayout } from '@/pages/Category/components';
import { Context } from './context';
import { reducer, initialState } from './store';
import { CategoryList, CategoryModal } from './components';

export default function CategoryManagement() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const listRefreshRef = useRef<(() => void) | null>(null);

  // 刷新列表的方法
  const refreshList = useCallback(() => {
    listRefreshRef.current?.();
  }, []);

  return (
    <Context.Provider value={{ state, dispatch, refreshList }}>
      <CategoryTreeLayout
        showLeafNodes={false}
        sortable
        onSorted={refreshList}
        renderContent={() => <CategoryList listRefreshRef={listRefreshRef} />}
      >
        <CategoryModal />
      </CategoryTreeLayout>
    </Context.Provider>
  );
}
