import styled from '@emotion/styled'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { PlayerRank } from '~/lib/proto'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { GameType } from '~/shared/constants/ranks'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { HighRankProgress } from './components/HighRankProgress'

interface Props {
  points: number
  pointsNeeded: number
  showXPText?: boolean
  showLevel?: boolean
  showIndicator?: boolean
  pointsType?: 'XP' | 'rankPoints'
  playerRank?: PlayerRank
  mode?: GameType
  showMasterProgress?: boolean
}

export const RankProgressBar = memo(
  ({
    points,
    pointsNeeded,
    showXPText = false,
    showIndicator = true,
    pointsType = 'XP',
    playerRank,
    mode,
    showMasterProgress = true
  }: Props) => {
    const { t } = useTranslation()
    const { getAssetUrl } = useGetAssetContext()

    const barWidth = useMemo(() => {
      if (points <= 0) return 0
      else return points > pointsNeeded ? 100 : (points / pointsNeeded) * 100
    }, [points, pointsNeeded])

    const isMasterProgress = useMemo(
      () =>
        (playerRank === PlayerRank.MASTER || playerRank === PlayerRank.GRANDWEAVER) &&
        showMasterProgress,
      [playerRank, showMasterProgress]
    )

    return (
      <RankBarContainer>
        {isMasterProgress && mode ? (
          <HighRankProgress mode={mode} showIndicator={showIndicator} />
        ) : (
          <>
            <FlexBox type="centered-row" position="relative" flex={1} height="100%">
              <Box
                position="absolute"
                height="6px"
                bg="rgba(252, 176, 5, 0.3)"
                width="100%"
                className="rankProgressBar"
                left={0}
              />
              <Box
                style={{
                  width: `${barWidth}%`
                }}
                height="6px"
                className="rankProgressBar"
                position="absolute"
                left={0}
                top="50%"
                transform="translateY(-50%)"
                bg={'#fd8b00'}
                zIndex={2}
              />
              {showIndicator && (
                <Box
                  style={{
                    left: `${barWidth}%`
                  }}
                  width="2px"
                  height="10px"
                  position="absolute"
                  top="50%"
                  transform="translateY(-50%)"
                  bg="white"
                  zIndex={3}
                />
              )}
            </FlexBox>
          </>
        )}
        {showXPText && !isMasterProgress && (
          <FlexBox
            alignItems="center"
            style={{
              position: 'absolute',
              top: pointsType === 'XP' ? '-40px' : '-32px',
              left: '4px'
            }}
          >
            {pointsType === 'XP' && !!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/xp-symbol.webp')}
                style={{
                  width: '24px',
                  height: '24px',
                  zIndex: 99,
                  paddingTop: '2px',
                  marginRight: '2px'
                }}
              />
            )}
            <Text fontSize={1} color="purple9" fontWeight="bold">
              {`${points} / ${pointsNeeded} ${t(`profile.${pointsType}`)}`}
            </Text>
          </FlexBox>
        )}
      </RankBarContainer>
    )
  }
)

RankProgressBar.displayName = 'RankProgressBar'

const RankBarContainer = styled(FlexBox)`
  width: 100%;
  position: relative;
  top: 0px;
  height: 100%;
  text-align: center;
  justify-content: center;
  flex-direction: row;
  flex-wrap: no-wrap;
`
