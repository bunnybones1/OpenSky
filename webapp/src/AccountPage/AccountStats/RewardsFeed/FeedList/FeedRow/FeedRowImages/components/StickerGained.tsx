import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { StickersGainedFeedItem } from '~/shared/types/feed'

import { FeedItemGlow } from '../shared/components/FeedItemGlow'

interface Props {
  meta: StickersGainedFeedItem['meta']
}

export const StickerGained = memo(({ meta }: Props) => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  let additionalSticker = 0
  const maxStickersToShow = 3

  let stickerShowAmount = meta.stickers.length
  if (stickerShowAmount > maxStickersToShow) {
    additionalSticker = meta.stickers.length - maxStickersToShow
    stickerShowAmount = maxStickersToShow
  }

  return (
    <>
      <StickerGainedWrapper
        className={clsx({
          oneSticker: stickerShowAmount === 1,
          twoStickers: stickerShowAmount === 2,
          threeStickers: stickerShowAmount === 3
        })}
        height="100%"
        width="100%"
        justifyContent="center"
        overflow="hidden"
        position="absolute"
        top={0}
        left={0}
        zIndex={2}
      >
        {meta.stickers.map((sticker, i) => {
          if (i < maxStickersToShow) {
            return (
              <Box
                key={`${sticker.id}-${i}`}
                style={{
                  zIndex: i,
                  width: `${100 / meta.stickers.length}%`,
                  position: 'absolute',
                  top: '0px',
                  left: '50%',
                  maxWidth: '50%',
                  minWidth: '30%',
                  transformOrigin: 'center 120%'
                }}
                className="rewardSticker"
              >
                {!!getAssetUrl && (
                  <StickerImg
                    src={getAssetUrl(`webapp/stickers/4x/${sticker.artID}.webp`)}
                  />
                )}
              </Box>
            )
          }
          return null
        })}
        {additionalSticker > 0 && (
          <Box
            style={{
              color: '#c5b4f4',
              zIndex: 20,
              position: 'absolute',
              right: '5px',
              top: '5px',
              fontSize: '11px'
            }}
          >
            {t('dashboard.stickers.additionalSticker', { count: additionalSticker })}
          </Box>
        )}
      </StickerGainedWrapper>
      <FeedItemGlow />
    </>
  )
})

const StickerImg = styled.img`
  filter: brightness(100%);
  width: 100%;
  -webkit-filter: brightness(100%);
`

const StickerGainedWrapper = styled(FlexBox)`
  &.oneSticker {
    .rewardSticker {
      transform: translate(-55%, 4px);
    }
  }
  &.twoStickers {
    .rewardSticker {
      :nth-of-type(1) {
        transform: translate(-45%, 4px) rotate(10deg);
      }
      :nth-of-type(2) {
        transform: translate(-55%, 4px) rotate(-10deg);
      }
    }
  }
  &.threeStickers {
    .rewardSticker {
      :nth-of-type(1) {
        transform: translate(-30%, 8px) rotate(15deg);
      }
      :nth-of-type(2) {
        transform: translateX(-50%);
      }
      :nth-of-type(3) {
        transform: translate(-80%, 8px) rotate(-15deg);
      }
    }
  }
`

StickerGained.displayName = 'StickerGained'
