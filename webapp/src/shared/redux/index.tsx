import { configureStore } from '@reduxjs/toolkit'
import isEqual from 'lodash-es/isEqual'
import {
  TypedUseSelectorHook,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
  useStore as _useStore
} from 'react-redux'
import { createSelectorCreator, defaultMemoize } from 'reselect'

import { createReduxHistory, routerMiddleware, routerReducer } from './router/reducer'

export const reduxStore = configureStore({
  reducer: {
    router: routerReducer
  },
  middleware: [routerMiddleware]
})

export type RootState = ReturnType<typeof reduxStore.getState>
export type AppDispatch = typeof reduxStore.dispatch
export type AppGetState = typeof reduxStore.getState
export const useDispatch: () => AppDispatch = _useDispatch
export const useSelector: TypedUseSelectorHook<RootState> = _useSelector
export const useReduxStore = () => _useStore<RootState>()
export const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual)
export const history = createReduxHistory(reduxStore)
