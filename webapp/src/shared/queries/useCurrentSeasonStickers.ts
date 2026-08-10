import { Sticker as StateSticker } from '@opensky/shared/constants'
import { StickerLibrary } from '@opensky/shared/cosmetics'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { Sticker as APISticker } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { INVITE_STICKERS } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { isNotNull } from '~/shared/helpers/is-defined-is-not-null'

import { authenticationState } from '../state/authentication-state'

export interface StickerInfo extends StateSticker, APISticker {}

export const useCurrentSeasonStickers = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery<StickerInfo[]>(
    INVITE_STICKERS,
    async () => {
      const { stickers } = await APIClient.opensky.getStickers()
      const stickersWithInfo = stickers.map((sticker) => {
        const stickerInfo = StickerLibrary.get(sticker.tokenId)
        if (!!stickerInfo) {
          return {
            ...sticker,
            ...stickerInfo
          }
        } else {
          return null
        }
      })

      return stickersWithInfo.filter(isNotNull)
    },
    {
      staleTime: ONE_DAY,
      enabled: !!userAddress
    }
  )
}
