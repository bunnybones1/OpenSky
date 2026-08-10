import { useCallback, useRef } from 'react'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

import { NAVBAR_WIDTH } from '../constants/ui'

interface Args {
  numColumns: number
  ratio: number
  columnGap: number
  paddingBottom: number
}

export const useEstimateVirtualizedItemSize = ({
  numColumns,
  ratio,
  columnGap,
  paddingBottom
}: Args) => {
  const listParentRef = useRef<HTMLDivElement | null>(null)
  const isTabletWide = useResponsiveQuery('tabletWide')

  const estimateSize = useCallback(() => {
    // Subtract 15 to account for the scrollbar
    let baseWidth = window.innerWidth - 15

    if (listParentRef.current) {
      const computedStyle = window.getComputedStyle(listParentRef.current)

      const padding = computedStyle.paddingLeft

      baseWidth =
        listParentRef.current.clientWidth -
        Number(!!padding ? padding.replace('px', '') : 0) * 2
    }

    const gapAmount = (numColumns - 1) * columnGap
    const width = baseWidth - (!isTabletWide ? NAVBAR_WIDTH : 0) - gapAmount
    const itemHeight = (width / numColumns) * ratio

    return itemHeight + paddingBottom
  }, [numColumns, columnGap, isTabletWide, ratio, paddingBottom])

  return { estimateSize, listParentRef }
}
