import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import {
  AuthedPlayerBadge,
  PlayerLeaderboardRowLayout,
  PlayerLeaderboardRowLayoutNoRewards
} from '~/LeaderboardPage/shared/style/PlayerLeaderboardRowLayout.css'
import { SoundClient } from '~/shared/clients'
import { Text } from '~/shared/components/Text'
import { UnreadBadge } from '~/shared/components/UnreadBadge'
import { GameType } from '~/shared/constants/ranks'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeVars } from '~/shared/style/Theme.css'

import { BattleTagCell } from '../../shared/components/BattleTagCell'
import {
  PlayerLeaderboardRowStyle,
  RewardImage,
  RewardImageBadge,
  RewardWrapper,
  WinRateProgress
} from './PlayerLeaderboardRow.css'

const FontSize = { base: '14px', tabletWide: '16px' } as const

interface PlayerLeaderboardRowProps {
  address: string
  name: string
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  mode: GameType
  skyTagTitle?: number
  rank?: number
  region?: string
  tagArtId?: string
  score?: number
  silverRewards?: number
  conquestRewards?: number
  winRatio: number
  gamesPlayed: number
  isAuthedUser: boolean
  crystalID?: number
  showRewardColumn?: boolean
}

export const PlayerLeaderboardRow = memo(
  ({
    address,
    name,
    playerRank,
    playerRankStage,
    region,
    mode,
    tagArtId,
    skyTagTitle,
    rank,
    score,
    gamesPlayed,
    winRatio,
    conquestRewards,
    silverRewards,
    isAuthedUser,
    crystalID,
    showRewardColumn
  }: PlayerLeaderboardRowProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()

    const winRatePercent = useMemo(() => Math.round(winRatio * 100), [winRatio])
    return (
      <Link
        to={makeAccountRoute(address)}
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            borderTop: isAuthedUser ? '1px solid' : undefined
          }),
          MaxPlayerLeaderboardWidth,
          showRewardColumn
            ? PlayerLeaderboardRowLayout
            : PlayerLeaderboardRowLayoutNoRewards,
          PlayerLeaderboardRowStyle[isAuthedUser ? 'golden' : 'primary']
        )}
        style={{
          borderColor: isAuthedUser ? ThemeVars.color.warm6 : ThemeVars.color.purple7
        }}
        onMouseEnter={() => SoundClient.playSound('CursorHoverSlip')}
        onMouseDown={() => SoundClient.playSound('CursorMainClick')}
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
            name={name}
            region={region}
            mode={mode}
            tagArtId={tagArtId}
            skyTagTitle={skyTagTitle}
            rank={rank}
            crystalID={crystalID}
          />
          {isAuthedUser && (
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  zIndex: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'warm6'
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
          )}
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
            {gamesPlayed}
          </Text>
        </div>
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
          {showRewardColumn && (
            <>
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
                    <UnreadBadge
                      className={RewardImageBadge}
                      unread={silverRewards}
                    />
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
            </>
          )}
        </div>
      </Link>
    )
  }
)

PlayerLeaderboardRow.displayName = 'PlayerLeaderboardRow'
