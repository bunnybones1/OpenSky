import { Match } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchHistoryRowPlayer } from './components/MatchHistoryRowPlayer'
import { VsStructure } from './components/VsStructure'
import { MatchHistoryRowMiddle, MatchHistoryRowStyle } from './MatchHistoryRow.css'

interface MatchHistoryRowProps {
  match: Match
}

export const MatchHistoryRow = memo(({ match }: MatchHistoryRowProps) => {
  const { userAddress } = useSnapshot(authenticationState)
  const { getAssetUrl } = useGetAssetContext()

  const [leftPlayer, leftPlayerNumber] = useMemo(() => {
    // TODO: Figure out why math.playerX.address is getting capitalized
    if (
      !!userAddress &&
      match.player1.address.toLowerCase() === userAddress.toLowerCase()
    ) {
      return [match.player1, 1]
    }

    if (
      !!userAddress &&
      match.player2.address.toLowerCase() === userAddress.toLowerCase()
    ) {
      return [match.player2, 2]
    }

    return [match.player1, 1]
  }, [match, userAddress])

  const [rightPlayer, rightPlayerNumber] = useMemo(() => {
    if (leftPlayerNumber === 1) return [match.player2, 2]

    return [match.player1, 1]
  }, [leftPlayerNumber, match])

  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({ width: 'full', position: 'relative' }),
        MatchHistoryRowStyle
      )}
    >
      <VsStructure />
      <div
        className={Sprinkles({
          height: 'full',
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: 'purple4'
        })}
      >
        <div className={Sprinkles({ flex: 1, height: 'full' })}>
          <MatchHistoryRowPlayer
            isWinner={match.winningPlayer === leftPlayerNumber}
            direction="left"
            player={leftPlayer}
          />
        </div>
        <a
          href={`${env.GAME_URL}?mode=REPLAY&replayMatchID=${
            match.id
          }&serializedGamePlayer=${
            !!userAddress && match.player1.address === userAddress ? 0 : 1
          }&replayID=${match.replayID}`}
        >
          <div
            className={clsx(
              Sprinkles({
                height: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }),
              MatchHistoryRowMiddle
            )}
          >
            <Text fontSize="16px" color="purple8" fontWeight="700">
              {t('general.matchHistoryLineVS')}
            </Text>

            <Text fontSize="12px" color="white">
              {!!getAssetUrl && (
                <img
                  style={{
                    width: '11px',
                    transform: 'translateY(2.5px)',
                    margin: '1px 2px',
                    display: 'inline-block'
                  }}
                  src={getAssetUrl('webapp/icons/playbox.webp')}
                />
              )}
              {t('play.watch')}
            </Text>
          </div>
        </a>
        <div className={Sprinkles({ flex: 1, height: 'full' })}>
          <MatchHistoryRowPlayer
            isWinner={match.winningPlayer === rightPlayerNumber}
            direction="right"
            player={rightPlayer}
          />
        </div>
      </div>
    </div>
  )
})

MatchHistoryRow.displayName = 'MatchHistoryRow'
