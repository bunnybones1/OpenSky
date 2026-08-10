import chunk from 'lodash-es/chunk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UsePaginatedItemsParams<T> {
  items: T[]
  pageSize?: number
  onPageLoad?: (page: number) => void
  lastPageLoaded?: number
}

export const usePaginatedItems = <T>({
  items,
  pageSize,
  lastPageLoaded,
  onPageLoad
}: UsePaginatedItemsParams<T>) => {
  const [currentPage, setCurrentPage] = useState(lastPageLoaded || 0)
  const isMounted = useRef(false)

  useEffect(() => {
    if (isMounted.current) {
      // Reset the current page to 0 when the items array changes
      setCurrentPage(0)
      if (onPageLoad) onPageLoad(0)
    }
  }, [items, onPageLoad, pageSize])

  useEffect(() => {
    isMounted.current = true
  }, [])

  const loadNextPage = useCallback(() => {
    let newPage: number | undefined
    setCurrentPage((_currentPage) => {
      newPage = _currentPage + 1
      return newPage
    })
    if (onPageLoad && newPage !== undefined) onPageLoad(newPage)
  }, [onPageLoad])

  const paginatedItems = useMemo(() => {
    if (!pageSize) return items

    const chunkedItems = chunk(items, pageSize)

    return chunkedItems.filter((items, i) => i <= currentPage).flatMap((item) => item)
  }, [items, pageSize, currentPage])

  return { paginatedItems, loadNextPage: !!pageSize ? loadNextPage : undefined }
}
