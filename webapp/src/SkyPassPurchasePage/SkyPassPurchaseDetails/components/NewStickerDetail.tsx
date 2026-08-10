import { ItemType, SkypassTier } from '@opensky/proto'
import { getStickerID } from '@opensky/shared/assetsIDs'
import { Sticker } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AllStickers } from '~/shared/constants/stickers'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SkyPassDetail,
  SkyPassDetailBadge,
  SkyPassDetailDesc,
  SkyPassDetailInner,
  SkyPassDetailTitle
} from '../shared/SkyPassDetail.css'
import { NewStickerDetailImageBG, NewStickerImage } from './NewStickerDetail.css'

export const NewStickerDetail = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const { data: skyPassInfo } = useSkyPassInfo()

  const stickerToDisplay = useMemo(() => {
    let sticker: Sticker | undefined

    skyPassInfo?.levels.forEach((level) => {
      if (level.rewards) {
        level.rewards.forEach((reward) => {
          if (
            reward.itemType === ItemType.SW_STICKERS &&
            reward.tier === SkypassTier.PREMIUM &&
            !!reward.attributes &&
            !!reward.attributes.tokenIDs &&
            !!reward.attributes.tokenIDs.length
          ) {
            const stickerData = AllStickers.get(
              getStickerID(reward.attributes.tokenIDs[0])
            )
            if (!!stickerData) {
              sticker = stickerData
            }
          }
        })
      }
    })

    return sticker
  }, [skyPassInfo?.levels])

  if (!stickerToDisplay) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple3',
          overflow: 'hidden',
          position: 'relative'
        }),
        SkyPassDetail
      )}
    >
      {!!getAssetUrl && (
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              zIndex: 4
            }),
            SkyPassDetailBadge
          )}
        >
          <img
            src={getAssetUrl('webapp/icons/badge-limited-time-mint-reward.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        </div>
      )}
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }),
          SkyPassDetailInner
        )}
        style={{
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/premium-sticker.webp')})`
            : undefined
        }}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 2,
            width: 'full',
            height: 'full'
          })}
        >
          <div className={SkyPassDetailTitle}>
            {t('skypass.detailsTitles.NewSticker', { name: stickerToDisplay?.name })}
          </div>
          <div className={SkyPassDetailDesc}>
            {t('skypass.detailsDescs.NewSticker', { name: stickerToDisplay?.name })}
          </div>
        </div>
        {!!stickerToDisplay && !!getAssetUrl && (
          <div
            className={Sprinkles({
              position: 'relative',
              width: 'full',
              height: 'full'
            })}
          >
            <img
              className={clsx(
                Sprinkles({ zIndex: 2, position: 'absolute' }),
                NewStickerImage
              )}
              src={getAssetUrl(`webapp/stickers/4x/${stickerToDisplay.artID}.webp`)}
            />
            <img
              className={clsx(
                Sprinkles({ zIndex: 1, position: 'absolute' }),
                NewStickerDetailImageBG
              )}
              src={getAssetUrl('webapp/misc/skypass-reward-sticker-bg.webp')}
            />
          </div>
        )}
      </div>
    </div>
  )
})

NewStickerDetail.displayName = 'NewStickerDetail'
