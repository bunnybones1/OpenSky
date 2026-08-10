import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

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
import {
  CardBackDetailStyle,
  FirstCardBack,
  SecondCardBack,
  ThirdCardBack
} from './CardBackDetail.css'

export const CardBackDetail = memo(() => {
  const { t } = useTranslation()

  const { data: skyPassInfo } = useSkyPassInfo()
  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple3',
          overflow: 'hidden',
          position: 'relative'
        }),
        SkyPassDetail,
        CardBackDetailStyle,
        'isCardBack'
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
            ? `url(${getAssetUrl('webapp/backgrounds/premium-feature.webp')})`
            : undefined
        }}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              zIndex: 2,
              width: 'full',
              height: 'full'
            })
          )}
        >
          <div className={SkyPassDetailTitle}>
            {`${!!skyPassInfo ? `${skyPassInfo.seasonName} ` : ''}${t(
              'skypass.titleLabels.SW_CARD_BACKS'
            )}`}
          </div>
          <div className={SkyPassDetailDesc}>
            {t('skypass.detailsDescs.CardBack', {
              name: skyPassInfo?.seasonName || t('quests.subNavSeasonal')
            })}
          </div>
        </div>
        <div
          className={Sprinkles({
            position: 'relative',
            width: 'full',
            height: 'full'
          })}
        >
          {!!getAssetUrl && !!skyPassInfo?.cardBackName && (
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  zIndex: 2,
                  top: 0,
                  left: 0,
                  width: 'full',
                  height: 'full'
                })
              )}
            >
              <img
                className={clsx(
                  Sprinkles({ height: 'full', position: 'absolute', zIndex: 3 }),
                  FirstCardBack
                )}
                src={getAssetUrl(
                  `webapp/card-backs/2x/${skyPassInfo?.cardBackName}.webp`
                )}
              />
              <img
                className={clsx(
                  Sprinkles({ zIndex: 2, position: 'absolute' }),
                  SecondCardBack
                )}
                src={getAssetUrl(
                  `webapp/card-backs/2x/${skyPassInfo?.cardBackName}.webp`
                )}
              />
              <img
                className={clsx(
                  Sprinkles({ height: 'full', zIndex: 1, position: 'absolute' }),
                  ThirdCardBack
                )}
                src={getAssetUrl(
                  `webapp/card-backs/2x/${skyPassInfo?.cardBackName}.webp`
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

CardBackDetail.displayName = 'CardBackDetail'
