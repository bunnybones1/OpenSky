import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'

import { useRankedStats } from './hooks/useRankedStats'

interface StatProps {
  value: number | string
  text: string
}

const STAT_SIZE = 90

const Stat = memo(({ value, text }: StatProps) => (
  <FlexBox type="centered-column" width={STAT_SIZE}>
    <Box
      width={STAT_SIZE}
      height={STAT_SIZE}
      borderRadius="50%"
      position="relative"
      overflow="hidden"
      bg="flatBlack"
    >
      <FlexBox
        width={STAT_SIZE - 4}
        height={STAT_SIZE - 4}
        borderRadius="50%"
        position="absolute"
        left="50%"
        zIndex={3}
        top="50%"
        transform="translate(-50%, -50%)"
        bg="purple3"
        type="centered-row"
      >
        <FlexBox
          width={STAT_SIZE - 10}
          height={STAT_SIZE - 10}
          borderRadius="50%"
          position="absolute"
          left="50%"
          zIndex={4}
          top="50%"
          transform="translate(-50%, -50%)"
          bg="flatBlack"
          type="centered-row"
        >
          <Text fontSize={24} color="purple9" fontFamily="mono" textWrap={true}>
            {value}
          </Text>
        </FlexBox>
      </FlexBox>
    </Box>
    <FlexBox pt={2} width="100%" type="centered-row">
      <Text color="purple9" fontSize={[1, 1, 1, 1, 2]} fontFamily="condensed">
        {text}
      </Text>
    </FlexBox>
  </FlexBox>
))

Stat.displayName = 'Stat'

const GameStats = memo(() => {
  const { t } = useTranslation()
  const { data: activeAccount } = useActiveAccount()
  const allTimeLevel = activeAccount ? activeAccount.level : 0

  const rankedStats = useRankedStats(activeAccount)

  return (
    <FlexBox width="100%" height="auto" type="centered-start-column">
      <Text fontSize={18} fontWeight="bold" color="purple9">
        {t('profile.accountSince', {
          accountSince: rankedStats.accountSince
        })}
      </Text>
      <FlexBox
        width="100%"
        pt={[16, 16, 24, 24]}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stat value={allTimeLevel} text={t('ranks.allTimeLevel')} />
        <Stat value={rankedStats.wins} text={t('ranks.wins')} />
        <Stat value={rankedStats.losses} text={t('ranks.losses')} />
        <Stat value={rankedStats.winRate} text={t('ranks.winRate')} />
        <Stat value={rankedStats.gamesPlayed} text={t('ranks.gamesPlayed')} />
      </FlexBox>
    </FlexBox>
  )
})

GameStats.displayName = 'GameStats'

export default GameStats
