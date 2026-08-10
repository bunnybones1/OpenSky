import { PlayerRank } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { RankBadge } from '~/shared/components/RankBadge'
import { RankProgressBar } from '~/shared/components/RankProgressBar/RankProgressBar'
import { GameType } from '~/shared/constants/ranks'
import { getRankXPRequiredFromAccountStat } from '~/shared/helpers/account/get_rank_xp_required_from_account_stat'
import { getAccountStat } from '~/shared/helpers/account/get-account-stat'
import { getNextRankInfo } from '~/shared/helpers/account/get-next-rank'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SharedProgressBarBorder,
  SharedProgressBarGradient,
  SharedProgressBarRewardGlow,
  SharedProgressBarRewardInner,
  SharedProgressBarRewardText,
  SharedProgressBarRewardWrapper
} from '../../shared/style/SharedPlayPageStyle.css'
import {
  PlayPageRankProgressBarBadge,
  PlayPageRankProgressBarBar,
  PlayPageRankProgressBarStyle,
  PlayPageRankProgressRewardBadge
} from './RankedProgressBar.css'

interface PlayPageRankProgressBarProps {
  isDiscovery?: boolean
  isXPTextHidden?: boolean
}

export const RankedProgressBar = memo(
  ({ isDiscovery, isXPTextHidden }: PlayPageRankProgressBarProps) => {
    const { data: authedAccount } = useAuthedAccount()
    const { t } = useTranslation()
    const { getAssetUrl } = useGetAssetContext()

    const accountStat = useMemo(() => {
      if (!authedAccount) return undefined
      return getAccountStat(
        isDiscovery ? GameType.DISCOVERY : GameType.CONSTRUCTED,
        authedAccount
      )
    }, [authedAccount, isDiscovery])

    const {
      currentPoints,
      rankUpPointsNeeded,
      nextPlayerRank,
      nextPlayerRankStage,
      nextPlayerRankPos
    } = useMemo(() => {
      return {
        ...getRankXPRequiredFromAccountStat(accountStat),
        ...getNextRankInfo(accountStat)
      }
    }, [accountStat])

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            position: 'relative',
            alignItems: 'center',
            width: 'full'
          }),
          PlayPageRankProgressBarStyle
        )}
      >
        <div className={Sprinkles({ width: 'full', position: 'relative' })}>
          {!!accountStat && (
            <>
              <div
                className={clsx(
                  Sprinkles({
                    position: 'absolute',
                    zIndex: 3,
                    left: 0
                  }),
                  PlayPageRankProgressBarBadge
                )}
              >
                <RankBadge
                  playerRankStage={accountStat.playerRankStage}
                  playerRank={accountStat.playerRank}
                  mode={isDiscovery ? GameType.DISCOVERY : GameType.CONSTRUCTED}
                  rank={accountStat.rank}
                />
              </div>
              <div
                className={clsx(
                  Sprinkles({
                    position: 'relative',
                    zIndex: 4
                  }),
                  PlayPageRankProgressBarBar
                )}
              >
                <RankProgressBar
                  points={currentPoints}
                  playerRank={accountStat.playerRank}
                  mode={isDiscovery ? GameType.DISCOVERY : GameType.CONSTRUCTED}
                  pointsNeeded={rankUpPointsNeeded}
                  pointsType={
                    accountStat.playerRank === PlayerRank.UNRANKED
                      ? 'XP'
                      : 'rankPoints'
                  }
                  showXPText={!isXPTextHidden}
                />
              </div>
            </>
          )}
          {/* Border Behind Bar */}
          <div className={Sprinkles({ position: 'relative', width: 'full' })}>
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  border: '1px solid',
                  borderColor: 'purple7',
                  backgroundColor: 'purple2'
                }),
                SharedProgressBarBorder
              )}
            />
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  top: 0,
                  width: 'full',
                  zIndex: 2
                }),
                SharedProgressBarGradient
              )}
            />
          </div>
        </div>
        {/* Reward */}
        <div
          className={clsx(
            Sprinkles({ position: 'relative' }),
            SharedProgressBarRewardWrapper
          )}
        >
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                border: '1px solid',
                borderColor: 'purple7',
                backgroundColor: 'purple2'
              }),
              SharedProgressBarBorder
            )}
          />
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                top: 0,
                width: 'full',
                zIndex: 2
              }),
              'isRight',
              SharedProgressBarGradient
            )}
          />
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                width: 'full',
                height: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }),
              SharedProgressBarRewardInner
            )}
          >
            {!!getAssetUrl && (
              <img
                className={clsx(
                  Sprinkles({ position: 'absolute' }),
                  SharedProgressBarRewardGlow
                )}
                src={getAssetUrl(`webapp/icons/rewardglow.webp`)}
              />
            )}
            {accountStat && nextPlayerRank && (
              <>
                <div
                  className={clsx(
                    Sprinkles({
                      fontWeight: '700',
                      fontSize: '12px',
                      color: 'white',
                      position: 'absolute'
                    }),
                    SharedProgressBarRewardText
                  )}
                >
                  {nextPlayerRank === 'GRANDWEAVER' ? 'GRANDWEAVER' : nextPlayerRank}
                </div>
                <div
                  className={clsx(
                    Sprinkles({ position: 'absolute', zIndex: 3 }),
                    PlayPageRankProgressRewardBadge
                  )}
                >
                  <RankBadge
                    playerRank={nextPlayerRank}
                    playerRankStage={nextPlayerRankStage}
                    mode={isDiscovery ? GameType.DISCOVERY : GameType.CONSTRUCTED}
                    rank={nextPlayerRankPos}
                  />
                </div>
                <div
                  className={clsx(
                    Sprinkles({
                      fontWeight: '700',
                      fontSize: { base: '10px', tabletWide: '12px' },
                      color: 'purple9',
                      position: 'absolute'
                    }),
                    SharedProgressBarRewardText,
                    'isBottom'
                  )}
                >
                  {t('play.rankUp')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
)

RankedProgressBar.displayName = 'RankedProgressBar'
