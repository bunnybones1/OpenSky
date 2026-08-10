import { useMemo, useSyncExternalStore } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const [getSnapshot, subscribe] = useMemo(() => {
    if (window.matchMedia === null) {
      return [
        () => {
          return false
        },
        () => () => {
          /** */
        }
      ]
    }

    const mediaQueryList = window.matchMedia(query)

    return [
      () => mediaQueryList.matches,
      (notify: () => void) => {
        mediaQueryList.addListener(notify)
        return () => {
          mediaQueryList.removeListener(notify)
        }
      }
    ]
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
