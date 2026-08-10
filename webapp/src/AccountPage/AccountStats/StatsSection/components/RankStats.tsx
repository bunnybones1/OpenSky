import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Theme } from '~/__deprecated__/style/Theme'
import { Text } from '~/__deprecated__/Text'
import { PlayerRank, PlayerRankStage } from '~/lib/proto'
import { Asset } from '~/shared/components/Asset'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { RankBadge } from '~/shared/components/RankBadge'
import { GameType, RANK_ORDER } from '~/shared/constants/ranks'
import { getRankFromAccountStat } from '~/shared/helpers/account/get-rank-from-account-stat'
import { getRankStageFromAccountStat } from '~/shared/helpers/account/get-rank-stage-from-account-stat'
import { isRankAchieved } from '~/shared/helpers/account/is-rank-achieved'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { Mutable } from '~/shared/types/utility'

import { StatsSectionBox } from '../StatsSection'

interface Props {
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  mode: GameType
  rank?: number
}

const getLineLength = (playerRank: PlayerRank): string => {
  const rankIndex = (
    RANK_ORDER as Mutable<typeof RANK_ORDER> as PlayerRank[]
  ).indexOf(playerRank)

  if (rankIndex === RANK_ORDER.length - 1) return '100%'
  if (rankIndex === 0) return `calc(${100 / 6}% / 2)`
  return `calc(${(100 / 6) * rankIndex}% + ${100 / 6 / 2}%)`
}

const RankStat = memo(({ playerRank, playerRankStage, mode, rank }: Props) => {
  const lineWidth = getLineLength(playerRank)
  const { t } = useTranslation()
  return (
    <FlexBox width="100%" position="relative" type="centered-start-column">
      <Text fontSize={18} fontWeight="bold" pb="10px" color="purple9">
        {t(`gameMode.${mode}`)}
        <span
          style={{ paddingLeft: '4px', textTransform: 'capitalize' }}
          className={mode}
        >
          {t(`ranks.${playerRank}`)}
        </span>
      </Text>
      <Box width={94} height={94} mb={3}>
        <RankBadge
          playerRank={playerRank}
          playerRankStage={playerRankStage}
          mode={mode}
          rank={rank}
        />
      </Box>
      <FlexBox width="87%" type="start-row" pb={75.2} mr={18}>
        <FlexBox width="100%" position="relative" height="10px" type="centered-row">
          <Box
            width={18}
            height={1}
            style={{
              backgroundImage:
                'linear-gradient(to left, #fd8b00, rgba(253, 139, 0, 0))'
            }}
          />
          <Box flex={1} height={1} bg="purple7" />
          <FlexBox
            width="calc(100% - 18px)"
            position="absolute"
            left={18}
            top="50%"
            transform="translateY(-50%)"
            type="start-row"
          >
            <Box
              height={1}
              style={{
                width: lineWidth
              }}
              bg="#fd8b00"
            />
          </FlexBox>
          <FlexBox
            width="calc(100% - 18px)"
            top="50%"
            transform="translateY(-50%)"
            right={0}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            position="absolute"
            zIndex={2}
          >
            {RANK_ORDER.map((_rank) => {
              const isRankAcieved = isRankAchieved(_rank, playerRank)
              return (
                <Box
                  width={13}
                  height={13}
                  border="1px solid"
                  borderRadius="50%"
                  position="relative"
                  key={_rank}
                  style={{
                    borderColor: isRankAcieved ? '#fd8b00' : Theme.colors.purple7,
                    backgroundColor: isRankAcieved ? '#fd8b00' : Theme.colors.purple1
                  }}
                >
                  <FlexBox
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    width={13}
                    height={13}
                    type="centered-row"
                    pt="1px"
                  >
                    <Icon type="check" color="black" height="10px" />
                  </FlexBox>
                  <Box
                    width={58}
                    height={58}
                    key={`${rank}-image`}
                    overflow="hidden"
                    position="absolute"
                    top={17.2}
                    left="50%"
                    transform="translateX(-50%)"
                  >
                    <Asset
                      url={`webapp/icons/${_rank.toLowerCase()}-${mode.toLowerCase()}.webp`}
                      style={{
                        width: '100%'
                      }}
                    />
                  </Box>
                  <Box
                    position="absolute"
                    left="50%"
                    transform="translateX(-50%)"
                    top={84}
                  >
                    <Text
                      fontSize={[1, 1, 1, 1, 2]}
                      color="purple9"
                      fontFamily="mono"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {t(`ranks.${_rank}`)?.toLowerCase()}
                    </Text>
                  </Box>
                </Box>
              )
            })}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  )
})

RankStat.displayName = 'RankStat'

const RankStats = memo(() => {
  const { data: activeAccount } = useActiveAccount()

  return (
    <>
      <StatsSectionBox pt={3} px={5} pb={48} mb={5}>
        {!!activeAccount && (
          <RankStat
            playerRank={getRankFromAccountStat(
              activeAccount.stats?.rankedConstructed
            )}
            playerRankStage={getRankStageFromAccountStat(
              activeAccount.stats?.rankedConstructed
            )}
            mode={GameType.CONSTRUCTED}
            rank={
              activeAccount.stats?.rankedConstructed
                ? activeAccount.stats.rankedConstructed.rank
                : undefined
            }
          />
        )}
      </StatsSectionBox>
      <StatsSectionBox pt={3} px={5} pb={48}>
        {!!activeAccount && (
          <RankStat
            playerRank={getRankFromAccountStat(activeAccount.stats?.rankedDiscovery)}
            playerRankStage={getRankStageFromAccountStat(
              activeAccount.stats?.rankedDiscovery
            )}
            mode={GameType.DISCOVERY}
            rank={
              activeAccount?.stats?.rankedDiscovery
                ? activeAccount.stats.rankedDiscovery.rank
                : undefined
            }
          />
        )}
      </StatsSectionBox>
    </>
  )
})

RankStats.displayName = 'RankStats'

export default RankStats
