import { MutableRefObject, RefCallback, useCallback } from 'react'

type RefType<T> = MutableRefObject<T | null> | RefCallback<T> | null

// When using forwardRef, react does not forward the full element to the component,
// so we do not have access to things like ref.current.open for HTMLDialogElements
// for example. What this function does, it clones the forwarded ref into a new ref
// in order to give us access to the full dom node.

export const useSharedRef = <T>(refA: RefType<T>, refB: RefType<T>): RefCallback<T> =>
  useCallback(
    (instance) => {
      if (typeof refA === 'function') {
        refA(instance)
      } else if (refA) {
        refA.current = instance
      }
      if (typeof refB === 'function') {
        refB(instance)
      } else if (refB) {
        refB.current = instance
      }
    },
    [refA, refB]
  )
