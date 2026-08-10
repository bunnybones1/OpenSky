import { FlagCodes } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { PlayerTag } from '~/shared/components/DeckStatsList/DeckStatsTopPlayer/components/PlayerTag'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useDeckTopPlayerAddress } from '~/shared/queries/decks/useDeckTopPlayer'
import { useAccount } from '~/shared/queries/useAccount'
import { useDispatch } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckTopPlayerLeaderboardLink, NoTopPlayer } from './DeckStatsTopPlayer.css'

interface DeckStatsTopPlayerProps {
  deckString: string
}

export const DeckStatsTopPlayer = memo(({ deckString }: DeckStatsTopPlayerProps) => {
  const { data: topPlayerAddress } = useDeckTopPlayerAddress(deckString)
  const { data: topPlayerAccount } = useAccount(topPlayerAddress || undefined)
  const dispatch = useDispatch()
  const art = useAccountTagArtUrl(topPlayerAccount?.tagArtID)

  const { t } = useTranslation()

  const player = useMemo(() => {
    if (!topPlayerAccount || !art) return undefined

    return {
      name: topPlayerAccount.name,
      id: topPlayerAccount.address,
      art: art.raw,
      region: topPlayerAccount.region as FlagCodes | undefined
    }
  }, [art, topPlayerAccount])

  const onTopPlayerClick = useCallback(
    (id: string) => {
      dispatch(push(makeAccountRoute(id)))
    },
    [dispatch]
  )

  const onLeaderboardClick = useCallback(() => {
    dispatch(
      push(ROUTES_CONFIG.routes.LEADERBOARD.routes.DECK_LEADERBOARD.directPath)
    )
  }, [dispatch])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        })}
      >
        <Text color="purple9" fontSize="16px" fontWeight="700">
          {t('decks.TopPlayer')}
        </Text>
        <Text
          cursor="pointer"
          onClick={onLeaderboardClick}
          color="purple8"
          fontSize="14px"
          className={DeckTopPlayerLeaderboardLink}
        >
          {t('decks.GoToLeaderboard')}
        </Text>
      </div>
      {topPlayerAccount === null || topPlayerAddress === null ? (
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '12px',
              backgroundColor: 'purple4'
            }),
            NoTopPlayer
          )}
        >
          <Text color="purple7" fontSize="14px">
            {t('decks.NoTopPlayer')}
          </Text>
        </div>
      ) : (
        <PlayerTag onClick={onTopPlayerClick} player={player} />
      )}
    </div>
  )
})

DeckStatsTopPlayer.displayName = 'DeckStatsTopPlayer'
