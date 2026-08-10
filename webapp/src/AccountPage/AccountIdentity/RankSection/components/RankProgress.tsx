import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { PlayerRank, PlayerRankStage } from '~/lib/proto'
import { SoundClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Grid } from '~/shared/components/Base/Grid'
import { Icon } from '~/shared/components/Icon/Icon'
import { RankBadge } from '~/shared/components/RankBadge'
import { RankProgressBar } from '~/shared/components/RankProgressBar/RankProgressBar'
import { GameType } from '~/shared/constants/ranks'

interface Props {
  mode: GameType
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  rank?: number
  questionClick: () => void
  rightBorder?: boolean
  points: number
  pointsNeeded: number
}

const RankProgress = ({
  playerRank,
  playerRankStage,
  mode,
  rank,
  questionClick,
  rightBorder = false,
  points,
  pointsNeeded
}: Props) => {
  const { t } = useTranslation()

  const pointsType =
    playerRank === PlayerRank.UNRANKED ? t('profile.XP') : t('ranks.RP')
  return (
    <RankProgressGrid
      gridTemplateColumns={'70px 1fr'}
      gridGap={'8px'}
      height="88px"
      flex={1}
      type="centered-row"
      pr="14px"
      position="relative"
      flexWrap="nowrap"
      overflow="hidden"
      className="BEEP"
      style={
        rightBorder
          ? {
              borderRight: `1px solid #4d3c7b`
            }
          : {}
      }
    >
      <Box position="relative" width="100%" height="100%">
        <Box
          position="absolute"
          left="50%"
          top="50%"
          transform="translate(-50%, -50%)"
          width="100%"
        >
          <RankBadge
            playerRank={playerRank}
            playerRankStage={playerRankStage}
            mode={mode}
            rank={rank}
          />
        </Box>
      </Box>

      <Grid
        gridTemplateRows={'1fr 1fr 1fr'}
        height="100%"
        style={{ alignItems: 'center' }}
      >
        <Text
          fontSize={['14px', '14px', '14px', '14px']}
          color="purple9"
          fontWeight="bold"
          textAlign="left"
          width="100%"
          lineHeight={['14px', '14px', '14px', '16px']}
        >
          {t(`gameMode.${mode.toUpperCase() as Uppercase<GameType>}`)}
        </Text>
        <Text
          fontSize={'16px'}
          color="white"
          style={{
            marginBottom: playerRank !== PlayerRank.GRANDWEAVER ? '0px' : '0px',
            textTransform: 'capitalize'
          }}
          textAlign="left"
          position="relative"
          top="2px"
          width="100%"
          lineHeight={['14px', '14px', '14px', '16px']}
        >
          <span style={{}}>
            {t(`ranks.${playerRank}`)}
            {playerRank !== PlayerRank.GRANDWEAVER &&
              playerRank !== PlayerRank.MASTER &&
              !!rank && (
                <>
                  #{rank}
                  <Text
                    fontSize={'12px'}
                    fontFamily="condensed"
                    color={'purple8'}
                    style={{ display: 'inline-block', float: 'right' }}
                  >
                    {`${points}/${pointsNeeded} ${pointsType}`}
                    <FlexBox
                      position="relative"
                      zIndex={1}
                      onClick={questionClick}
                      ml={1}
                      type="centered-row"
                      style={{ display: 'inline-block' }}
                      onMouseEnter={() => SoundClient.playSound('CursorHoverSlip')}
                    >
                      <Icon
                        color="purple8"
                        type="info-empty"
                        height="12px"
                        style={{ position: 'relative', top: '2px' }}
                      />
                    </FlexBox>
                  </Text>
                </>
              )}
          </span>
        </Text>
        <Box mt={'8px'}>
          <RankProgressBar
            points={points}
            pointsNeeded={pointsNeeded}
            pointsType={playerRank === PlayerRank.UNRANKED ? 'XP' : 'rankPoints'}
            showIndicator={false}
            playerRank={playerRank}
            mode={mode}
          />
        </Box>
      </Grid>
    </RankProgressGrid>
  )
}

const RankProgressGrid = styled(Grid)`
  padding-top: 12px;
  padding-bottom: 12px;
`

const MemoizedRankProgress = memo(RankProgress, (prevProps: Props, props: Props) => {
  const { points, rank, playerRank } = prevProps
  return (
    points === props.pointsNeeded &&
    rank === props.rank &&
    playerRank === props.playerRank
  )
})

MemoizedRankProgress.displayName = 'RankProgress'

export default MemoizedRankProgress
