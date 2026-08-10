import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeckLeaderboardRowLayout } from '~/LeaderboardPage/shared/style/DeckLeaderboardRowLayout.css'
import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const FontSize = { base: '14px', tabletWide: '16px' } as const

export const DeckLeaderboardTableHeader = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'grid',
          borderTop: '1px solid'
        }),
        MaxPlayerLeaderboardWidth,
        DeckLeaderboardRowLayout
      )}
    >
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          borderRight: '1px solid',
          borderColor: 'purple7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text fontSize={FontSize} color="purple9">
          {t('ranks.prism')}
        </Text>
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          borderRight: '1px solid',
          borderColor: 'purple7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text fontSize={FontSize} color="purple9">
          {t('ranks.mana')}
        </Text>
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          borderRight: '1px solid',
          borderColor: 'purple7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text fontSize={FontSize} color="purple9">
          {t('ranks.score')}
        </Text>
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          borderRight: '1px solid',
          borderColor: 'purple7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text fontSize={FontSize} color="purple9">
          {t('ranks.topPlayer')}
        </Text>
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text fontSize={FontSize} color="purple9">
          {t('ranks.collectedHeader')}
        </Text>
      </div>
    </div>
  )
})

DeckLeaderboardTableHeader.displayName = 'DeckLeaderboardTableHeader'
