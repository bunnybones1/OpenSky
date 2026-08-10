import styled from '@emotion/styled'
import { memo, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { SoundClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Grid } from '~/shared/components/Base/Grid'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { LeaderboardRewardsDialog } from '~/shared/components/LeaderboardRewardsDialog'
import { SeasonSelect } from '~/shared/components/SeasonSelect'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { GameType } from '~/shared/constants/ranks'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { getRankXPRequiredFromAccountStat } from '~/shared/helpers/account/get_rank_xp_required_from_account_stat'
import { getRankFromAccountStat } from '~/shared/helpers/account/get-rank-from-account-stat'
import { getRankStageFromAccountStat } from '~/shared/helpers/account/get-rank-stage-from-account-stat'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useTimeUntilSeasonEnd } from '~/shared/hooks/useTimeUntilSeasonEnd'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'

import RankDescriptionTooltip from './components/RankDescriptionTooltip'
import RankProgress from './components/RankProgress'
import { useSeasonStats } from './queries/useSeasonStats'
import { RankedStatsSection } from './RankedStatsSection/RankedStatsSection'
import { RankProgressExplanationDialog } from './RankProgressDialog/RankProgressExplanationDialog'
import { RankSectionSeasonSelectOptions } from './RankSection.css'

export const TimeUntilSeasonEnd = memo(() => {
  const { t } = useTranslation()

  const timeUntilSeason = useTimeUntilSeasonEnd()

  useLayoutEffect(() => {
    if (timeUntilSeason === 'Now') {
      // Reload page to get new season
      window.location.reload()
    }
  }, [timeUntilSeason])

  if (!timeUntilSeason) return null

  return (
    <SeasonEndsText>
      <Icon
        color="warm7"
        type="clock"
        height="12px"
        style={{ marginLeft: '4px', marginRight: '4px' }}
      />
      {t('profile.seasonEndsIn')}
      &nbsp;
      {timeUntilSeason}
    </SeasonEndsText>
  )
})

TimeUntilSeasonEnd.displayName = 'TimeUntilRewards'

const RankSection = memo(() => {
  const { t } = useTranslation()
  const { data: seasonInfo } = useSeasonInfo()
  const [season, setSeason] = useState(seasonInfo?.currentSeason)
  const navigate = useNavigate()
  const { getAssetUrl } = useGetAssetContext()
  const { constructedStat, discoveryStat } = useSeasonStats(season)

  const { openDialog, Dialog } = useDialog({
    Element: RankProgressExplanationDialog,
    id: 'RANK_PROGRESS_EXPLANATION_DIALOG_ID'
  })

  const {
    Dialog: _LeaderboardRewardsDialog,
    openDialog: openLeaderboardRewardsDialog
  } = useDialog({
    Element: LeaderboardRewardsDialog,
    id: 'LEADERBOARD_REWARDS_DIALOG_ID'
  })

  const onQuestionClick = useCallback(() => openDialog(), [openDialog])
  const onLeaderboardRewardsClick = useCallback(
    () => openLeaderboardRewardsDialog(),
    [openLeaderboardRewardsDialog]
  )

  useEffect(() => {
    if (!season && !!seasonInfo) {
      setSeason(seasonInfo.currentSeason)
    }
  }, [seasonInfo, season])

  const onSelectSeason = useCallback((season: number) => {
    setSeason(season)
  }, [])

  const onRankSectionClick = useCallback(() => {
    navigate(ROUTES_CONFIG.routes.LEADERBOARD.routes.PLAYER_LEADERBOARD.directPath)
  }, [navigate])

  return (
    <>
      <RankSectionHeader>
        <FlexBox style={{ alignItems: 'center' }}>
          <RankSectionHeaderTitle>{t('profile.RANKS')}</RankSectionHeaderTitle>
          <Box width={140} ml={3}>
            <SeasonSelect
              optionsClassName={RankSectionSeasonSelectOptions}
              selectedSeason={season}
              onChangeFn={onSelectSeason}
            />
          </Box>
        </FlexBox>

        <FlexBox style={{ alignItems: 'center', marginRight: '12px' }}>
          <TimeUntilSeasonEnd />
          <Button
            frameType="default"
            colorType="default"
            text={t('profile.leaderboard')}
            onClick={onRankSectionClick}
          />
        </FlexBox>
      </RankSectionHeader>
      <Grid
        gridTemplateColumns={'1fr 1fr'}
        borderTop="1px solid"
        borderColor="purple6"
        type="centered-row"
        width="100%"
      >
        <Box
          style={{
            backgroundImage: !!getAssetUrl
              ? `linear-gradient(180deg, rgba(12, 6, 30, 0.75) 42.75%, rgba(12, 6, 30, 1) 80.25%), url(${getAssetUrl(
                  'webapp/backgrounds/constructed-empty-bg.webp'
                )})`
              : undefined,
            backgroundSize: 'cover'
          }}
        >
          <Tooltip placement="top-start" tooltip={<RankDescriptionTooltip />}>
            <RankProgress
              playerRank={getRankFromAccountStat(constructedStat)}
              playerRankStage={getRankStageFromAccountStat(constructedStat)}
              points={getRankXPRequiredFromAccountStat(constructedStat).currentPoints}
              pointsNeeded={
                getRankXPRequiredFromAccountStat(constructedStat).rankUpPointsNeeded
              }
              rightBorder={true}
              mode={GameType.CONSTRUCTED}
              rank={!!constructedStat ? constructedStat.rank : undefined}
              questionClick={onQuestionClick}
            />
          </Tooltip>
          <RankedStatsSection stats={constructedStat} onClick={onRankSectionClick} />
        </Box>
        <Box
          style={{
            backgroundImage: !!getAssetUrl
              ? `linear-gradient(180deg, rgba(12, 6, 30, 0.75) 42.75%, rgba(12, 6, 30, 1) 80.25%), url(${getAssetUrl(
                  'webapp/backgrounds/discovery-empty-bg.webp'
                )})`
              : undefined,
            backgroundSize: 'cover'
          }}
        >
          <Tooltip placement="top-start" tooltip={<RankDescriptionTooltip />}>
            <RankProgress
              playerRank={getRankFromAccountStat(discoveryStat)}
              playerRankStage={getRankStageFromAccountStat(discoveryStat)}
              points={getRankXPRequiredFromAccountStat(discoveryStat).currentPoints}
              pointsNeeded={
                getRankXPRequiredFromAccountStat(discoveryStat).rankUpPointsNeeded
              }
              mode={GameType.DISCOVERY}
              rank={!!discoveryStat ? discoveryStat.rank : undefined}
              questionClick={onQuestionClick}
            />
          </Tooltip>
          <RankedStatsSection stats={discoveryStat} onClick={onRankSectionClick} />
        </Box>
      </Grid>
      <RankSectionFooter
        onClick={onLeaderboardRewardsClick}
        onMouseEnter={() => SoundClient.playSound('CursorHoverSlip')}
      >
        <RankSectionFooterText>{t('profile.rankExplanation')}</RankSectionFooterText>
        <Icon
          color="purple8"
          type="info-empty"
          height="12px"
          style={{ marginLeft: '4px', marginRight: '12px' }}
        />
      </RankSectionFooter>
      {Dialog}
      {_LeaderboardRewardsDialog}
    </>
  )
})

RankSection.displayName = 'RankSection'

const RankSectionHeader = styled(FlexBox)`
  height: 52px;
  width: 100%;
  background: ${({ theme }) => theme.colors.purple4};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  align-items: center;
  margin-top: 16px;
  justify-content: space-between;
`

const RankSectionHeaderTitle = styled(FlexBox)`
  font-family: 'Barlow Condensed';
  font-weight: 500;
  font-size: 26px;
  color: ${({ theme }) => theme.colors.purple9};
  margin-left: 12px;
`

const RankSectionFooter = styled(FlexBox)`
  height: 50px;
  width: 100%;
  background: ${({ theme }) => theme.colors.purple2};
  align-items: center;
  justify-content: flex-end;
`

const RankSectionFooterText = styled(FlexBox)`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.purple8};
  &:hover {
    color: white;
  }
`

const SeasonEndsText = styled(FlexBox)`
  color: ${({ theme }) => theme.colors.warm7};
  font-size: 13px;
  font-weight: 700;
  margin-right: 8px;
`

export default RankSection
