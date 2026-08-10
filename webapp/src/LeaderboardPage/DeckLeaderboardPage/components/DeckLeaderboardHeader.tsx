import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { WeekOfSeasonExplainer } from '~/LeaderboardPage/shared/components/WeekOfSeasonExplainer/WeekOfSeasonExplainer'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const FontSize = { base: '36px', tabletWide: '42px' } as const

export const DeckLeaderboardHeader = memo(() => {
  const { t } = useTranslation()
  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingY: '16px'
      })}
    >
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text
          color="purple9"
          fontWeight="700"
          fontFamily="condensed"
          fontSize={FontSize}
        >
          {t('ranks.deckLeaderboardHeader')}
        </Text>
      </div>
      <WeekOfSeasonExplainer />
    </div>
  )
})

DeckLeaderboardHeader.displayName = 'DeckLeaderboardHeader'
