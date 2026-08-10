import styled from '@emotion/styled'
import { memo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Skeleton from 'react-loading-skeleton'

import { Theme } from '~/__deprecated__/style/Theme'
import ELODescriptionTooltip from '~/AccountPage/AccountIdentity/RankSection/RankedStatsSection/components/ELODescriptionTooltip'
import RankPositionTooltip from '~/AccountPage/AccountIdentity/RankSection/RankedStatsSection/components/RankPositionTooltip'
import { AccountStat } from '~/lib/proto'
import { Text } from '~/shared/components/Base'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Grid } from '~/shared/components/Base/Grid'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'

interface RankedStatsSectionProps {
  stats?: AccountStat
  onClick: () => void
}

interface RankInfoHeaderProps {
  children: ReactNode
}

const RankInfoHeader = memo(({ children }: RankInfoHeaderProps) => {
  return (
    <Text fontSize={[14, 14, 14, 16]} color="purple9" fontWeight="medium">
      {children}
    </Text>
  )
})

RankInfoHeader.displayName = 'RankInfoHeader'

const RankInfoSubheader = memo(({ children }: RankInfoHeaderProps) => {
  return (
    <Text
      textWrap
      fontSize={[10, 10, 10, 12]}
      color="purple8"
      fontWeight="medium"
      textAlign="center"
    >
      {children}
    </Text>
  )
})

RankInfoSubheader.displayName = 'RankInfoSubheader'

const RankInfo = memo(
  ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => {
    return (
      <StyledRankInfo onClick={onClick} py="10px" px={[12, 12, 12, 20]}>
        {children}
      </StyledRankInfo>
    )
  }
)

RankInfo.displayName = 'RankInfo'

export const RankedStatsSection = memo(
  ({ stats, onClick }: RankedStatsSectionProps) => {
    const { t } = useTranslation()

    return (
      <RankGrid gridTemplateColumns={'1fr 1fr 1fr'}>
        <Tooltip placement="top" tooltip={<RankPositionTooltip />}>
          <RankInfo onClick={onClick}>
            {!stats ? (
              <Skeleton
                height="20px"
                width="50px"
                baseColor={Theme.colors.purple4}
                highlightColor={Theme.colors.purple5}
              />
            ) : (
              <>
                <RankInfoHeader>{stats.rank || 'N/A'}</RankInfoHeader>
                <RankInfoSubheader>{t('profile.position')}</RankInfoSubheader>
              </>
            )}
          </RankInfo>
        </Tooltip>
        <Tooltip placement="top" tooltip={<ELODescriptionTooltip />}>
          <RankInfo>
            {!stats ? (
              <Skeleton
                height="20px"
                width="50px"
                baseColor={Theme.colors.purple4}
                highlightColor={Theme.colors.purple5}
              />
            ) : (
              <>
                <RankInfoHeader>{stats.score}</RankInfoHeader>
                <RankInfoSubheader>{t('profile.rankPoints')}</RankInfoSubheader>
              </>
            )}
          </RankInfo>
        </Tooltip>
        <RankInfo>
          {!stats ? (
            <Skeleton
              height="20px"
              width="50px"
              baseColor={Theme.colors.purple4}
              highlightColor={Theme.colors.purple5}
            />
          ) : (
            <>
              <RankInfoHeader>{stats.gamesPlayed}</RankInfoHeader>
              <RankInfoSubheader>{t('profile.Matches')}</RankInfoSubheader>
            </>
          )}
        </RankInfo>
        <RankInfo>
          {!stats ? (
            <Skeleton
              height="20px"
              width="50px"
              baseColor={Theme.colors.purple4}
              highlightColor={Theme.colors.purple5}
            />
          ) : (
            <>
              <RankInfoHeader>{Math.round(stats.winRatio * 100)}%</RankInfoHeader>
              <RankInfoSubheader>{t('ranks.winRate')}</RankInfoSubheader>
            </>
          )}
        </RankInfo>
        <RankInfo>
          {!stats ? (
            <Skeleton
              height="20px"
              width="50px"
              baseColor={Theme.colors.purple4}
              highlightColor={Theme.colors.purple5}
            />
          ) : (
            <>
              <RankInfoHeader>{stats.winStreak}</RankInfoHeader>
              <RankInfoSubheader>{t('profile.winStreak')}</RankInfoSubheader>
            </>
          )}
        </RankInfo>
        <RankInfo>
          {!stats ? (
            <Skeleton
              height="20px"
              width="50px"
              baseColor={Theme.colors.purple4}
              highlightColor={Theme.colors.purple5}
            />
          ) : (
            <>
              <RankInfoHeader>{stats.abandonCount}</RankInfoHeader>
              <RankInfoSubheader>{t('ranks.abandons')}</RankInfoSubheader>
            </>
          )}
        </RankInfo>
      </RankGrid>
    )
  }
)

RankedStatsSection.displayName = 'RankedStatsSection'

const RankGrid = styled(Grid)`
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
`

const StyledRankInfo = styled(FlexBox)`
  color: white;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  height: 54px;
  border-right: 1px solid ${({ theme }) => theme.colors.purple6};
  border-bottom: 1px solid ${({ theme }) => theme.colors.purple6};
`
