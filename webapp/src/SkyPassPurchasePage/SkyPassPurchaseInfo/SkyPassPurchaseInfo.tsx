import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import Skeleton from 'react-loading-skeleton'

import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import { SkyPassPurchaseButtons } from './SkyPassPurchaseButtons/SkyPassPurchaseButtons'
import {
  SkyPassPurchaseInfoDesc,
  SkyPassPurchaseInfoDescText,
  SkyPassPurchaseInfoImage,
  SkyPassPurchaseInfoStyle
} from './SkyPassPurchaseInfo.css'

const SeasonFont = { base: '18px', tablet: '26px' } as const
const TitleFont = { base: '26px', tabletWide: '40px' } as const
const DescFont = { base: '12px', tabletWide: '18px' } as const

export const SkyPassPurchaseInfo = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { data: seasonInfo } = useSeasonInfo()
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          position: 'sticky',
          top: 0
        }),
        SkyPassPurchaseInfoStyle
      )}
    >
      {!!getAssetUrl && (
        <img
          className={SkyPassPurchaseInfoImage}
          src={getAssetUrl('webapp/misc/premium-skypass-crest.webp')}
        />
      )}
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }),
          SkyPassPurchaseInfoDesc
        )}
      >
        {!seasonInfo?.currentSeason ? (
          <Skeleton
            height="20px"
            width="72px"
            baseColor={THEME_COLORS.white}
            highlightColor={THEME_COLORS.gray9}
          />
        ) : (
          <Text
            color="white"
            fontWeight="600"
            fontSize={SeasonFont}
            fontFamily="condensed"
          >
            {t('ranks.SeasonNum', { season: seasonInfo.currentSeason }).toUpperCase()}
          </Text>
        )}
        <Text
          color="white"
          fontWeight="600"
          fontFamily="condensed"
          marginTop="4px"
          fontSize={TitleFont}
        >
          {t('skypass.PREMIUMSKYPASS')}
        </Text>
        <Text
          color="white"
          className={SkyPassPurchaseInfoDescText}
          textAlign="center"
          fontWeight="600"
          fontSize={DescFont}
        >
          {t('skypass.premiumDesc')}
        </Text>
        <SkyPassPurchaseButtons />
      </div>
    </div>
  )
})

SkyPassPurchaseInfo.displayName = 'SkyPassPurchaseInfo'
