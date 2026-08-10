import styled from '@emotion/styled'
import { memo } from 'react'

import { Box } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { StickerInfo } from '../../../queries/useCurrentSeasonStickers'

interface SingleStickerPackProps {
  sticker1: StickerInfo
}

export const SingleStickerPack = memo(({ sticker1 }: SingleStickerPackProps) => {
  const { getAssetUrl } = useGetAssetContext()

  if (!getAssetUrl) return null

  return (
    <>
      <Box
        width="60%"
        height="auto"
        position="absolute"
        left="6%"
        bottom="6%"
        zIndex={2}
      >
        <StickerImg src={getAssetUrl(`webapp/stickers/4x/${sticker1.artID}.webp`)} />
      </Box>
    </>
  )
})

export const StickerImg = styled.img`
  filter: brightness(60%);
  width: 100%;
  -webkit-filter: brightness(60%);
`

SingleStickerPack.displayName = 'SingleStickerPack'
