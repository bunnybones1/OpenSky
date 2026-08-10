import { memo, useMemo } from 'react'

import { FlexBox } from '~/shared/components/Base'

import { useCurrentSeasonStickers } from '../../queries/useCurrentSeasonStickers'
import { DoubleStickerPack } from './components/DoubleStickerPack'
import { SingleStickerPack } from './components/SingleStickerPack'
import { TripleStickerPack } from './components/TripleStickerPack'

interface CurrentSeasonStickerPackProps {
  nextStickerTokenId?: number
  isOpaque?: boolean
}

export const CurrentSeasonStickerPack = memo(
  ({ nextStickerTokenId, isOpaque = false }: CurrentSeasonStickerPackProps) => {
    const { data: stickers } = useCurrentSeasonStickers()

    const filteredStickers = useMemo(() => {
      if (!stickers || !stickers.length) return

      return stickers.filter((sticker) => {
        return sticker.tokenId !== nextStickerTokenId
      })
    }, [nextStickerTokenId, stickers])

    if (!filteredStickers || !filteredStickers.length) return null

    const isSinglePack = filteredStickers.length == 1
    const isDoublePack = filteredStickers.length == 2

    return (
      <FlexBox
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
        opacity={isOpaque ? 1 : 0.6}
      >
        <FlexBox position="relative" zIndex={1} width="100%" height="100%" mt="-9%">
          {isSinglePack ? (
            <SingleStickerPack sticker1={filteredStickers[0]} />
          ) : isDoublePack ? (
            <DoubleStickerPack
              sticker1={filteredStickers[0]}
              sticker2={filteredStickers[1]}
            />
          ) : (
            <TripleStickerPack
              sticker1={filteredStickers[0]}
              sticker2={filteredStickers[1]}
              sticker3={filteredStickers[2]}
            />
          )}
        </FlexBox>
      </FlexBox>
    )
  }
)

CurrentSeasonStickerPack.displayName = 'CurrentSeasonStickerPack'
