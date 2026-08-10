import { memo } from 'react'

import { Box } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { StickerInfo } from '~/shared/queries/useCurrentSeasonStickers'

import { StickerImg } from './SingleStickerPack'

interface DoubleStickerPackProps {
  sticker1: StickerInfo
  sticker2: StickerInfo
}

export const DoubleStickerPack = memo(
  ({ sticker1, sticker2 }: DoubleStickerPackProps) => {
    const { getAssetUrl } = useGetAssetContext()

    if (!getAssetUrl) return null

    return (
      <>
        <Box
          width="47.72%"
          height="auto"
          position="absolute"
          left="6%"
          bottom="6%"
          transform="rotate(-10deg)"
          zIndex={2}
        >
          <StickerImg
            src={getAssetUrl(`webapp/stickers/4x/${sticker1.artID}.webp`)}
          />
        </Box>
        <Box
          width="52.3%"
          height="auto"
          position="absolute"
          right="6%"
          top="6%"
          transform="rotate(10deg)"
          zIndex={1}
        >
          <StickerImg
            src={getAssetUrl(`webapp/stickers/4x/${sticker2.artID}.webp`)}
          />
        </Box>
      </>
    )
  }
)

DoubleStickerPack.displayName = 'DoubleStickerPack'
