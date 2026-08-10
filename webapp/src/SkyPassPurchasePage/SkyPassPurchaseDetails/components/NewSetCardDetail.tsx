import { ItemType, SkypassTier } from '@opensky/proto'
import { getGradedID } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Cards, CardType } from '~/shared/constants/cards'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SkyPassDetail,
  SkyPassDetailDesc,
  SkyPassDetailInner,
  SkyPassDetailTitle
} from '../shared/SkyPassDetail.css'
import {
  NewSetCardDetailImage,
  NewSetCardDetailImageBg
} from './NewSetCardDetail.css'

export const NewSetCardDetail = memo(() => {
  const { t, i18n } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const { data: seasonInfo } = useSeasonInfo()
  const { data: skyPassInfo } = useSkyPassInfo()

  const cardToDisplaySrc = useMemo(() => {
    let card: CardType | undefined

    skyPassInfo?.levels.forEach((level) => {
      if (level.rewards) {
        level.rewards.forEach((reward) => {
          if (
            (reward.itemType === ItemType.SW_BASE_CARDS ||
              reward.itemType === ItemType.SW_SILVER_CARDS) &&
            reward.tier === SkypassTier.PREMIUM &&
            !!reward.attributes &&
            !!reward.attributes.tokenIDs &&
            !!reward.attributes.tokenIDs.length
          ) {
            const cardData = Cards.get(
              getGradedID(reward.attributes.tokenIDs[0], reward.itemType)
            )
            if (!!cardData && cardData.releaseSeason === seasonInfo?.currentSeason) {
              card = cardData
            }
          }
        })
      }
    })

    if (!!card) {
      return `webapp/cards/full-cards/${i18n.language}/4x/${card.baseId}${
        card.grade === ItemType.SW_SILVER_CARDS ? '-silver' : ''
      }.webp`
    }
    return
  }, [i18n.language, seasonInfo?.currentSeason, skyPassInfo?.levels])

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
            ? `url(${getAssetUrl(
                'webapp/backgrounds/premium-new-release-card.webp'
              )})`
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
            {t('skypass.detailsTitles.FreshReleaseCards')}
          </div>
          <div className={SkyPassDetailDesc}>
            {t('skypass.detailsDescs.FreshReleaseCards')}
          </div>
        </div>
        {!!cardToDisplaySrc && !!getAssetUrl && (
          <div
            className={Sprinkles({
              position: 'relative',
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <img
              className={clsx(
                Sprinkles({ position: 'absolute', zIndex: 2 }),
                NewSetCardDetailImage
              )}
              src={getAssetUrl(cardToDisplaySrc)}
            />
            <img
              className={clsx(
                Sprinkles({ position: 'absolute', zIndex: 1 }),
                NewSetCardDetailImageBg
              )}
              src={getAssetUrl('webapp/misc/skypass-reward-generic-explosion.webp')}
            />
          </div>
        )}
      </div>
    </div>
  )
})

NewSetCardDetail.displayName = 'NewSetCardDetail'
