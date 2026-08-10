import throttle from 'lodash-es/throttle'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

export const getWindowScrollTop = () => {
  const scrollTop =
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body)
          .scrollTop
  return scrollTop
}

export const usePaginateOnScroll = (loadNextPage?: () => void) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadNextPageRef = useRef(loadNextPage)
  const isMobile = useResponsiveQuery('mobile')
  const isTablet = useResponsiveQuery('tablet')
  const isWide = useResponsiveQuery('desktopWide')

  const scrollThreshold = useMemo(() => {
    if (isMobile) return 600
    if (isTablet) return 900
    if (isWide) return 1200
    return 1100
  }, [isMobile, isTablet, isWide])

  const scrollThresholdRef = useRef(scrollThreshold)

  useEffect(() => {
    scrollThresholdRef.current = scrollThreshold
    loadNextPageRef.current = loadNextPage
  }, [loadNextPage, scrollThreshold])

  const handleScroll = useCallback(() => {
    if (!loadNextPageRef.current) return
    const scrollTop = getWindowScrollTop()

    if (scrollContainerRef.current) {
      const top = scrollContainerRef.current.getBoundingClientRect().top
      const offset =
        top + scrollContainerRef.current.offsetHeight - scrollTop - window.innerHeight

      if (offset < scrollThresholdRef.current) loadNextPageRef.current()
    }
  }, [])

  const throttledScroll = useMemo(() => throttle(handleScroll, 250), [handleScroll])

  useEffect(() => {
    if (!!loadNextPage) {
      window.addEventListener('scroll', throttledScroll)
    } else {
      window.removeEventListener('scroll', throttledScroll)
    }
  }, [loadNextPage, throttledScroll])

  useEffect(() => {
    return () => {
      window.removeEventListener('scroll', throttledScroll)
    }
  }, [throttledScroll])

  return { scrollContainerRef }
}
