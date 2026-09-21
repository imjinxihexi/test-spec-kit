import { createContext, Dispatch } from 'react';
import { ACTIONTYPE, PreviewState } from './store';

export type ContextValue = {
  state: PreviewState;
  dispatch: Dispatch<ACTIONTYPE>;
};

export const Context = createContext({} as ContextValue);
