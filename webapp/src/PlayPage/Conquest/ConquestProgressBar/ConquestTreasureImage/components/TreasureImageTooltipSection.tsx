import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  TreasureImageIconWrapper,
  TreasureSilverCardsImg,
  TreasureTooltipImage
} from './TreasureImageTooltipSection.css'

interface TreasureTooltipSectionProps {
  level: number
  amountUSDC: number
  amountSilver: number
}

export const TreasureTooltipSection = memo(
  ({ level, amountUSDC, amountSilver }: TreasureTooltipSectionProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()
    return (
      <div
        className={Sprinkles({
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <div className={Sprinkles({ position: 'relative' })}>
          {!!getAssetUrl && (
            <img
              src={getAssetUrl(`webapp/icons/conquest-treasure-${level}.webp`)}
              className={TreasureTooltipImage}
            />
          )}
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute'
              }),
              TreasureImageIconWrapper
            )}
          >
            {amountSilver > 0 && (
              <Icon type="hexbound-set" height="32px" color="warm3" />
            )}
          </div>
        </div>

        <Text color="white" fontSize="16px">
          {t('general.LevelWithArg', { level })}
        </Text>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '8px'
          })}
        >
          <ImageIcon type="usdc" height="16px" />
          <Text marginLeft="4px" color="cold6" fontSize="14px">
            {`${amountUSDC} USDC`}
          </Text>
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '8px'
          })}
        >
          {!!getAssetUrl && (
            <img
              src={getAssetUrl('webapp/icons/silver-cards.webp')}
              className={TreasureSilverCardsImg}
            />
          )}
          <Text marginLeft="4px" color="warm7" fontSize="14px">
            {t(`play.treasureToolTipSilverCards`, { count: amountSilver })}
          </Text>
        </div>
      </div>
    )
  }
)

TreasureTooltipSection.displayName = 'TreasureTooltipSection'
