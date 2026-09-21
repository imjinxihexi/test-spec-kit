import { createContext, Dispatch } from 'react';
import { ACTIONTYPE, CoursePageState, initialState } from './store';

export type ContextValue = {
  state: CoursePageState;
  dispatch: Dispatch<ACTIONTYPE>;
};

export const Context = createContext<ContextValue>({
  state: initialState,
  dispatch: () => {},
});
