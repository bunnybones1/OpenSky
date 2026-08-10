import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestTreasureInfo } from '~/shared/queries/useConquestTreasureInfo'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MAX_CONQUEST_TREASURE_LEVEL } from '../shared/constants'
import { TreasureTooltipSection } from './components/TreasureImageTooltipSection'
import {
  ConquestTreasureImageIcon,
  ConquestTreasureImageLoader,
  ConquestTreasureImageWrapper,
  TreasureTooltipDivider,
  TreasureTooltipHeader,
  TreasureTooltipWrapper
} from './ConquestTreasureImage.css'

interface ConquestTreasureImageProps {
  level: number
}

// We always show max level on the right side of tooltip
const TreasureImageTooltip = memo(({ level }: ConquestTreasureImageProps) => {
  const { data: treasureInfo } = useConquestTreasureInfo()
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')

  const currentLevelInfo = useMemo(() => {
    if (!treasureInfo) return
    const info = treasureInfo[level]

    if (!info) return

    return {
      amountUSDC: formatUSDCBalance(info.amountUSDC),
      amountSilver: info.amountSilver
    }
  }, [treasureInfo, level])

  const maxLevelInfo = useMemo(() => {
    if (!treasureInfo || level === MAX_CONQUEST_TREASURE_LEVEL) return
    const info = treasureInfo[MAX_CONQUEST_TREASURE_LEVEL]

    if (!info) return

    return {
      amountUSDC: formatUSDCBalance(info.amountUSDC),
      amountSilver: info.amountSilver
    }
  }, [treasureInfo, level])

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }),
        TreasureTooltipWrapper
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingX: '12px',
            backgroundColor: 'purple3'
          }),
          TreasureTooltipHeader
        )}
      >
        <Icon
          type="hexbound-set"
          height={!isTabletWide ? '24px' : '32px'}
          color="warm3"
        />
        <Text fontSize="14px" color="purple8" marginLeft="12px">
          {t('play.treasureToolTipHeader', {
            expansion: t('sets.HEXBOUND_INVASION')
          })}
        </Text>
      </div>
      {!!currentLevelInfo ? (
        <div
          className={Sprinkles({
            paddingX: '16px',
            paddingBottom: '24px',
            paddingTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'full',
            backgroundColor: 'purple3'
          })}
        >
          <TreasureTooltipSection
            level={level}
            amountSilver={currentLevelInfo.amountSilver}
            amountUSDC={currentLevelInfo.amountUSDC}
          />
          {!!maxLevelInfo && (
            <>
              <div
                className={Sprinkles({
                  height: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  paddingX: '12px'
                })}
              >
                <div className={TreasureTooltipDivider} />
              </div>
              <TreasureTooltipSection
                level={MAX_CONQUEST_TREASURE_LEVEL}
                amountSilver={maxLevelInfo.amountSilver}
                amountUSDC={maxLevelInfo.amountUSDC}
              />
            </>
          )}
        </div>
      ) : (
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }),
            ConquestTreasureImageLoader
          )}
        >
          <Icon type="spinner" color="white" height="32px" />
        </div>
      )}
    </div>
  )
})

TreasureImageTooltip.displayName = 'TreasureImageTooltip'

export const ConquestTreasureImage = memo(({ level }: ConquestTreasureImageProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { data: treasureInfo } = useConquestTreasureInfo()
  const isTabletWide = useResponsiveQuery('tabletWide')

  const currentLevelInfo = useMemo(() => {
    if (!treasureInfo) return
    const info = treasureInfo[level]

    if (!info) return

    return {
      amountUSDC: formatUSDCBalance(info.amountUSDC),
      amountSilver: info.amountSilver
    }
  }, [treasureInfo, level])

  return (
    <Tooltip
      placement="top-end"
      tooltip={<TreasureImageTooltip level={level} />}
      tooltipDelay={50}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }),
          ConquestTreasureImageWrapper
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(`webapp/icons/conquest-treasure-${level}.webp`)}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        )}
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute'
            }),
            ConquestTreasureImageIcon
          )}
        >
          {!!currentLevelInfo && currentLevelInfo?.amountSilver > 0 && (
            <Icon
              type="hexbound-set"
              color="warm3"
              height={!isTabletWide ? '24px' : '32px'}
            />
          )}
        </div>
      </div>
    </Tooltip>
  )
})

ConquestTreasureImage.displayName = 'ConquestTreasureImage'
