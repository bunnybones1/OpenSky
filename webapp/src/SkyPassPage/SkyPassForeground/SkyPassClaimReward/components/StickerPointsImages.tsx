import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '~/shared/components/Button'
import { CurrentSeasonStickerPack } from '~/shared/components/CurrentSeasonStickerPack/CurrentSeasonStickerPack'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { MagicExplosionWrapper } from '~/shared/components/webgl/MagicExplosionWrapper'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useInvitePointsForUser } from '~/shared/queries/invite-a-friend/useInvitePointsForUser'
import { useCurrentSeasonStickers } from '~/shared/queries/useCurrentSeasonStickers'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SecondaryStickerContainer,
  StickerContainer
} from './StickerPointsImages.css'

const StickerPointsImagesTooltip = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        flexWrap: 'wrap',
        padding: '12px',
        pointerEvents: 'all'
      })}
      style={{
        width: '310px'
      }}
    >
      <Text color="white">{t('skypass.stickerPointsTooltip.1')}</Text>
      <Link to={ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.REWARDS.directPath}>
        <Text marginLeft="4px" color="cold8">
          {t('skypass.stickerPointsTooltip.2')}
        </Text>
      </Link>
      <Text color="white">{t('skypass.stickerPointsTooltip.3')}</Text>
    </div>
  )
})

StickerPointsImagesTooltip.displayName = 'StickerPointsImagesTooltip'

interface Props {
  hasExplosion: boolean
}

export const StickerPointsImages = memo(({ hasExplosion }: Props) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)

  const { getAssetUrl } = useGetAssetContext()
  const { data: stickersData } = useCurrentSeasonStickers()
  const { data: pointsData } = useInvitePointsForUser()
  const isTablet = useResponsiveQuery('tablet')

  const nextSticker = useMemo(() => {
    if (!pointsData || !stickersData) return

    return stickersData.find((sticker) => {
      return sticker.requiredPoints > pointsData.total
    })
  }, [stickersData, pointsData])

  if (!nextSticker) return null
  return (
    <div
      className={Sprinkles({
        position: 'relative'
      })}
      style={{
        zIndex: 3,
        width: '100%',
        height: '100vh'
      }}
    >
      <div className={SecondaryStickerContainer}>
        <CurrentSeasonStickerPack
          nextStickerTokenId={nextSticker?.tokenId}
          isOpaque={true}
        />
      </div>
      <div className={StickerContainer}>
        <MagicExplosionWrapper
          explosionEffect={hasExplosion}
          explosionEffectVisibleStart={true}
          isReadyToAnimate={true}
        >
          {!!getAssetUrl && (
            <img
              src={getAssetUrl(`webapp/stickers/6x/${nextSticker.artID}.webp`)}
              style={{
                width: '100%',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          )}
        </MagicExplosionWrapper>
      </div>
      <div
        className={Sprinkles({
          position: 'absolute'
        })}
        style={{
          right: !isTablet ? '10px' : '20px',
          top: !isTablet ? '8px' : '20px'
        }}
      >
        <Tooltip
          isVisible={isTooltipVisible}
          placement="bottom-start"
          tooltip={<StickerPointsImagesTooltip />}
        >
          <Button
            frameType="default"
            colorType="default"
            isToggled={isTooltipVisible}
            height={!isTablet ? '28px' : '36px'}
            buttonClassName={Sprinkles({
              paddingX: !isTablet ? '0px' : '4px'
            })}
            onClick={() => setIsTooltipVisible((isVisible) => !isVisible)}
            leftAdornment={{
              icon: 'info-empty'
            }}
          />
        </Tooltip>
      </div>
    </div>
  )
})

StickerPointsImages.displayName = 'StickerPointsImages'
