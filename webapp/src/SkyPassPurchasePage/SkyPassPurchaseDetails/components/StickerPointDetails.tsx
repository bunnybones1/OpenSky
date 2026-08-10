import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SkyPassDetail,
  SkyPassDetailDesc,
  SkyPassDetailInner,
  SkyPassDetailTitle
} from '../shared/SkyPassDetail.css'
import { StickerPointDetailsImage } from './StickerPointDetails.css'

export const StickerPointDetails = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple3',
          overflow: 'hidden'
        }),
        SkyPassDetail
      )}
    >
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
            ? `url(${getAssetUrl('webapp/backgrounds/premium-sticker-points.webp')})`
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
            {t('skypass.detailsTitles.StickerPoints')}
          </div>
          <div className={SkyPassDetailDesc}>
            {t('skypass.detailsDescs.StickerPoints')}
          </div>
        </div>
        {!!getAssetUrl && (
          <div
            className={Sprinkles({
              position: 'relative',
              width: 'full',
              height: 'full'
            })}
          >
            <img
              className={clsx(
                StickerPointDetailsImage,
                Sprinkles({ width: 'full', height: 'full' })
              )}
              src={getAssetUrl('webapp/misc/skypass-reward-sticker-points.webp')}
            />
          </div>
        )}
      </div>
    </div>
  )
})

StickerPointDetails.displayName = 'StickerPointDetails'
