import { useReducer, useState } from 'react';
import { useDidRecover } from '@xpeng/react-router-cache-route';
import { Context } from './context';
import { reducer, initialState } from './store';
import CoursePage from './CoursePage';

export default function CourseEdit() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [pageKey, setPageKey] = useState(0);

  useDidRecover(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'create';
    if (mode !== 'create') return;

    const categoryId = params.get('categoryId');
    dispatch({
      type: 'INIT_PAGE',
      payload: {
        mode: 'create',
        categoryId: categoryId && categoryId !== 'all' ? Number(categoryId) : undefined
      }
    });
    setPageKey(key => key + 1);
  });

  return (
    <Context.Provider value={{ state, dispatch }}>
      <CoursePage key={pageKey} />
    </Context.Provider>
  );
}
