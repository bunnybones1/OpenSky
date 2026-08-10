/* eslint-disable valtio/state-snapshot-rule */
import { GameMode } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { GameType } from '~/shared/constants/ranks'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useAccountLeaderboard } from '~/shared/queries/useAccountLeaderboard'
import { usePlayerLeaderboard } from '~/shared/queries/usePlayerLeaderboard'
import { playerLeaderboardFilterState } from '~/shared/state/player-leaderboard/player-leaderboard-filter-state'
import {
  playerLeaderboardUIState,
  updatePlayerLeaderboardUI
} from '~/shared/state/player-leaderboard/player-leaderboard-ui-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { AuthedPlayerRow } from './components/AuthedPlayerRow'
import { EmptyPlayerLeaderboard } from './components/EmptyPlayerLeaderboard'
import { PlayerLeaderboardHeader } from './components/PlayerLeaderboardHeader'
import { PlayerLeaderboardLoader } from './components/PlayerLeaderboardLoader'
import { PlayerLeaderboardControls } from './PlayerLeaderboardControls/PlayerLeaderboardControls'
import { PlayerLeaderboardRow } from './PlayerLeaderboardRow/PlayerLeaderboardRow'
import { PlayerLeaderboardTableHeader } from './PlayerLeaderboardTableHeader/PlayerLeaderboardTableHeader'

export const PlayerLeaderboardPage = memo(() => {
  const { data: authedAccount } = useAuthedAccount()
  const playerLeaderboardFilters = useSnapshot(playerLeaderboardFilterState)
  const { pageIndex, isPlayer } = useSnapshot(playerLeaderboardUIState)
  const {
    data: playerLeaderboard,
    isFetching,
    hasNextPage,
    fetchNextPage,
    error
  } = usePlayerLeaderboard(playerLeaderboardFilters)

  const {
    data: accountLeaderboard,
    isFetching: isFetchingAccount,
    error: accountError
  } = useAccountLeaderboard(
    playerLeaderboardFilters.gameMode,
    playerLeaderboardFilters.season
  )

  const goToPreviousPage = useCallback(() => {
    updatePlayerLeaderboardUI('pageIndex', playerLeaderboardUIState.pageIndex - 1)
  }, [])

  const goToNextPage = useCallback(() => {
    const nextPage = playerLeaderboard?.pages[playerLeaderboardUIState.pageIndex + 1]
    updatePlayerLeaderboardUI('pageIndex', playerLeaderboardUIState.pageIndex + 1)

    if (!nextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, playerLeaderboard?.pages])

  const page = useMemo(() => {
    if (!playerLeaderboard) return playerLeaderboard

    if (!!playerLeaderboard.pages[pageIndex]) {
      return playerLeaderboard.pages[pageIndex]
    }

    if (
      pageIndex > playerLeaderboard.pages.length - 1 &&
      !!playerLeaderboard.pages[pageIndex - 1]
    ) {
      return playerLeaderboard.pages[pageIndex - 1]
    }

    return undefined
  }, [playerLeaderboard, pageIndex])

  const leaderboardList = useMemo(() => {
    return isPlayer ? accountLeaderboard : page?.list
  }, [isPlayer, accountLeaderboard, page])

  const isLoading = useMemo(() => {
    if (isPlayer) {
      return isFetchingAccount || (accountLeaderboard === undefined && !accountError)
    } else {
      return isFetching || (playerLeaderboard === undefined && !error)
    }
  }, [
    isPlayer,
    isFetching,
    playerLeaderboard,
    error,
    isFetchingAccount,
    accountLeaderboard,
    accountError
  ])

  const { userSilverRewards, userConquestRewards } = useMemo(() => {
    const userAccount = accountLeaderboard?.find((account) => {
      account.account.address === authedAccount?.address
    })
    return {
      userSilverRewards: userAccount ? userAccount.rankedSilverReward : 0,
      userConquestRewards: userAccount ? userAccount.rankedTicketReward : 0
    }
  }, [accountLeaderboard, authedAccount])
  const anyRewards = leaderboardList?.some(
    (i) => i.rankedSilverReward > 0 || i.rankedTicketReward > 0
  )

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        paddingX: '16px'
      })}
    >
      <PlayerLeaderboardHeader />
      <PlayerLeaderboardControls />
      <PlayerLeaderboardTableHeader
        hideBottomBorder={isPlayer && !accountError}
        showRewardColumn={anyRewards}
      />
      {!!leaderboardList?.length ? (
        leaderboardList?.map((player, index) => (
          <PlayerLeaderboardRow
            key={`${player.account.address}-${index}`}
            address={player.account.address}
            name={player.account.name}
            rank={player.rank}
            playerRank={player.accountStat.playerRank}
            playerRankStage={player.accountStat.playerRankStage}
            mode={
              player.accountStat.gameMode === GameMode.RANKED_CONSTRUCTED
                ? GameType.CONSTRUCTED
                : GameType.DISCOVERY
            }
            crystalID={player.account.crystalID}
            tagArtId={player.account.tagArtID}
            skyTagTitle={player.account.titleID}
            region={player.account.region}
            score={player.accountStat.score}
            gamesPlayed={player.accountStat.gamesPlayed}
            winRatio={player.accountStat.winRatio}
            silverRewards={player.rankedSilverReward}
            conquestRewards={player.rankedTicketReward}
            isAuthedUser={
              !!authedAccount && player.account.address === authedAccount.address
            }
            showRewardColumn={anyRewards}
          />
        ))
      ) : isLoading ? (
        <PlayerLeaderboardLoader />
      ) : (
        <EmptyPlayerLeaderboard />
      )}
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '16px',
          marginBottom: '96px'
        })}
      >
        <Button
          text="Prev"
          onClick={goToPreviousPage}
          frameType="roundedLeft"
          colorType="default"
          disabled={pageIndex === 0 || isPlayer}
        />
        <Button
          text="Next"
          disabled={
            (!hasNextPage &&
              !!playerLeaderboard?.pages.length &&
              pageIndex + 1 === playerLeaderboard.pages.length) ||
            isFetching ||
            isPlayer
          }
          onClick={goToNextPage}
          frameType="roundedRight"
          colorType="default"
        />
      </div>
      <AuthedPlayerRow
        silverRewards={userSilverRewards}
        conquestRewards={userConquestRewards}
        showRewardColumn={anyRewards}
      />
    </div>
  )
})

PlayerLeaderboardPage.displayName = 'PlayerLeaderboardPage'
