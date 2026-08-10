import { ItemType } from '@opensky/proto'
import { useMemo } from 'react'

import { useTokenBalances } from '~/shared/queries/useTokenBalances'

export const useNumNewStickers = () => {
  const { data: stickerBalances } = useTokenBalances(ItemType.SW_STICKERS)
  return useMemo(() => {
    return stickerBalances?.filter((sticker) => sticker.isNew).length || 0
  }, [stickerBalances])
}
