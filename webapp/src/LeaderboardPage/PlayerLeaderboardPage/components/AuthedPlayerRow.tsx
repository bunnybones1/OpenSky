/* eslint-disable valtio/state-snapshot-rule */
import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { BattleTagCell } from '~/LeaderboardPage/shared/components/BattleTagCell'
import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import {
  AuthedPlayerBadge,
  PlayerLeaderboardRowLayout,
  PlayerLeaderboardRowLayoutNoRewards
} from '~/LeaderboardPage/shared/style/PlayerLeaderboardRowLayout.css'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { UnreadBadge } from '~/shared/components/UnreadBadge'
import { GameType } from '~/shared/constants/ranks'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { playerLeaderboardFilterState } from '~/shared/state/player-leaderboard/player-leaderboard-filter-state'
import {
  playerLeaderboardUIState,
  updatePlayerLeaderboardUI
} from '~/shared/state/player-leaderboard/player-leaderboard-ui-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  RewardImage,
  RewardImageBadge,
  RewardWrapper,
  WinRateProgress
} from '../PlayerLeaderboardRow/PlayerLeaderboardRow.css'
import { AuhtedPlayerRowLayout, ViewButtonStyle } from './AuthedPlayerRow.css'

const FontSize = { base: '14px', tabletWide: '16px' } as const

interface AuthedPlayerRowProps {
  silverRewards: number
  conquestRewards: number
  showRewardColumn?: boolean
}

export const AuthedPlayerRow = memo(
  ({ silverRewards, conquestRewards, showRewardColumn }: AuthedPlayerRowProps) => {
    const { data: authedAccount } = useAuthedAccount()
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()
    const { gameMode } = useSnapshot(playerLeaderboardFilterState)
    const { isPlayer } = useSnapshot(playerLeaderboardUIState)

    const { playerRank, playerRankStage, rank, score, winRatio, gamesPlayed } =
      useMemo(() => {
        const rankToUse =
          gameMode === GameMode.RANKED_CONSTRUCTED
            ? authedAccount?.stats?.rankedConstructed
            : authedAccount?.stats?.rankedDiscovery
        return {
          playerRank: rankToUse?.playerRank,
          playerRankStage: rankToUse?.playerRankStage,
          rank: rankToUse?.rank,
          score: rankToUse?.score,
          winRatio: rankToUse?.winRatio,
          gamesPlayed: rankToUse?.gamesPlayed
        }
      }, [
        authedAccount?.stats?.rankedConstructed,
        authedAccount?.stats?.rankedDiscovery,
        gameMode
      ])

    const viewPlayer = useCallback(() => {
      if (!!playerRank) {
        window.scrollTo({ top: 0 })
        updatePlayerLeaderboardUI('isPlayer', !playerLeaderboardUIState.isPlayer)
      }
    }, [playerRank])

    const winRatePercent = useMemo(
      () => Math.round((winRatio as number) * 100),
      [winRatio]
    )

    if (!authedAccount || !playerRank || !playerRankStage) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            width: 'full',
            borderRight: '1px solid',
            borderLeft: '1px solid',
            borderTop: '1px solid',
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'purple1',
            borderColor: 'cold6'
          }),
          MaxPlayerLeaderboardWidth,
          showRewardColumn
            ? PlayerLeaderboardRowLayout
            : PlayerLeaderboardRowLayoutNoRewards,
          AuhtedPlayerRowLayout
        )}
      >
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: '4px',
            position: 'relative'
          })}
        >
          <BattleTagCell
            playerRank={playerRank}
            playerRankStage={playerRankStage}
            name={authedAccount.name}
            region={authedAccount.region}
            crystalID={authedAccount.crystalID}
            mode={
              gameMode === GameMode.RANKED_CONSTRUCTED
                ? GameType.CONSTRUCTED
                : GameType.DISCOVERY
            }
            tagArtId={authedAccount.tagArtID}
            skyTagTitle={authedAccount.titleID}
            rank={rank}
          />
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                zIndex: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'cold7'
              }),
              AuthedPlayerBadge
            )}
          >
            <Text
              color="black"
              fontSize="10px"
              fontWeight="600"
              fontFamily="condensed"
            >
              {t('generic.ME')}
            </Text>
          </div>
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                zIndex: 2
              }),
              ViewButtonStyle
            )}
          >
            <Button
              onClick={viewPlayer}
              colorType={isPlayer ? 'orange' : 'blue'}
              frameType="default"
              text={isPlayer ? t('general.hide') : t('general.view')}
            />
          </div>
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
            {score || 0}
          </Text>
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          })}
        >
          <Text fontSize={FontSize} color="purple9">
            {`${winRatePercent}%`}
          </Text>
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                backgroundColor: 'warm3',
                overflow: 'hidden',
                position: 'relative',
                marginTop: '4px'
              }),
              WinRateProgress
            )}
          >
            <div
              className={Sprinkles({
                position: 'absolute',
                left: 0,
                top: 0,
                height: 'full',
                backgroundColor: 'forest5'
              })}
              style={{ width: `${winRatePercent}%` }}
            />
          </div>
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid',
            borderColor: 'purple7'
          })}
        >
          <Text fontSize={FontSize} color="purple9">
            {gamesPlayed || 0}
          </Text>
        </div>
        {showRewardColumn && (
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            })}
          >
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }),
                RewardWrapper
              )}
            >
              {!!silverRewards && (
                <div
                  className={clsx(
                    Sprinkles({
                      position: 'relative'
                    })
                  )}
                >
                  {!!getAssetUrl && (
                    <img
                      className={RewardImage}
                      src={getAssetUrl('webapp/icons/silver-card-with-letter.webp')}
                    />
                  )}
                  <UnreadBadge className={RewardImageBadge} unread={silverRewards} />
                </div>
              )}
              {!!conquestRewards && (
                <div
                  className={clsx(
                    Sprinkles({
                      position: 'relative'
                    })
                  )}
                >
                  {!!getAssetUrl && (
                    <img
                      className={RewardImage}
                      src={getAssetUrl('webapp/icons/conquest-ticket.webp')}
                    />
                  )}
                  <UnreadBadge
                    unread={conquestRewards}
                    className={RewardImageBadge}
                  />
                </div>
              )}
            </div>
            {!!getAssetUrl && (
              <img
                className={Sprinkles({ height: 'full' })}
                style={{ opacity: !silverRewards && !conquestRewards ? 0.6 : 1 }}
                src={getAssetUrl('webapp/backgrounds/weekly-reward.webp')}
              />
            )}
          </div>
        )}
      </div>
    )
  }
)

AuthedPlayerRow.displayName = 'AuthedPlayerRow'
