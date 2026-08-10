import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { playState } from '~/shared/state/play-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PetalImage, PointsTooltipStyle } from './ConquestPointsExplanation.css'

const PointsTooltip = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({ fontSize: '16px', padding: '8px', color: 'purple9' }),
        PointsTooltipStyle
      )}
    >
      {t('play.conquestDeckPointsTooltipMessage')}
    </div>
  )
})

PointsTooltip.displayName = 'PointsTooltip'

export const ConquestPointsExplanation = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  const { selectedConquestDeck } = useSnapshot(playState)

  const { data: deck } = useUserDeck(selectedConquestDeck)

  if (!deck) return null

  return (
    <Tooltip placement="right" tooltip={<PointsTooltip />} tooltipDelay={250}>
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginTop: { base: '12px', tablet: '16px' }
        })}
      >
        {!!getAssetUrl && (
          <img src={getAssetUrl(`webapp/icons/petal.webp`)} className={PetalImage} />
        )}
        <Text fontWeight="500" fontSize="16px" color="purple9">
          {`+${deck.conquestV2Points} ${t('play.conquestPointsPerMatch')}`}
        </Text>
        <Icon type="info-empty" height="16px" color="purple9" marginLeft="4px" />
      </div>
    </Tooltip>
  )
})

ConquestPointsExplanation.displayName = 'ConquestPointsExplanation'
