import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useTimeUntilRewards } from '~/shared/hooks/useTimeUntilRewards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const FontAndIconSize = { base: '14px', tabletWide: '16px' } as const

export const SeasonEndHeader = memo(() => {
  const timeUntilRewards = useTimeUntilRewards()
  const { t } = useTranslation()
  return (
    <div
      className={Sprinkles({
        width: 'full',
        height: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      })}
    >
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px'
        })}
      >
        <Text color="purple9" fontSize={FontAndIconSize} marginRight="4px" noWrap>
          {t('ranks.rewardHeader')}
        </Text>
        <Tooltip tooltip={t('playerLeaderboard.rewardExplainer')} placement="top">
          <Icon
            type="info-empty"
            height={{ base: '14px', tabletWide: '16px' }}
            color="purple9"
          />
        </Tooltip>
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Icon
          type="clock"
          height={{ base: '14px', tabletWide: '16px' }}
          color="warm6"
          marginRight="4px"
        />
        <Text color="warm6" fontSize={FontAndIconSize}>
          {timeUntilRewards}
        </Text>
      </div>
    </div>
  )
})

SeasonEndHeader.displayName = 'SeasonEndHeader'
