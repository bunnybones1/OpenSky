import clsx from 'clsx'
import { memo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { useIdentitySession } from '~/IdentitySession/IdentitySessionContext'
import { DeckSelector } from '~/PlayPage/shared/components/DeckSelector/DeckSelector'
import {
  SharedPlayButtonStyle,
  SharedPlayPageBottomStyle
} from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { Button } from '~/shared/components/Button'
import { GameType } from '~/shared/constants/ranks'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { playState, updatePlayState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const SpinnerIcon = { icon: 'spinner' } as const

export const IdentityPracticeVsBotPage = memo(() => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { selectedDeck } = useSnapshot(playState)
  const { data: decks, isLoading } = useUserDecks()
  const { session } = useIdentitySession()
  const { t } = useTranslation()

  useEffect(() => {
    if (!selectedDeck && decks?.length) {
      updatePlayState('selectedDeck', decks[0].uuid)
    }
  }, [decks, selectedDeck])

  const selectedDeckData = decks?.find((deck) => deck.uuid === selectedDeck)

  const onPlayClick = useCallback(() => {
    if (!selectedDeckData) return
    const gameUrl = new URL(env.GAME_URL)
    gameUrl.searchParams.set('mode', 'LOCAL_BOT')
    gameUrl.searchParams.set('skipAuth', '')
    gameUrl.searchParams.set('deck', selectedDeckData.deckString)
    gameUrl.searchParams.set('playerAlias', session.user.displayName)
    window.location.assign(gameUrl)
  }, [selectedDeckData, session.user.displayName])

  return (
    <>
      <div className={Sprinkles({ marginTop: '16px' })}>
        <DeckSelector selectedGameType={GameType.CONSTRUCTED} />
      </div>
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            width: 'full',
            position: 'absolute',
            left: 0,
            paddingX: { base: '12px', tablet: '20px' }
          }),
          SharedPlayPageBottomStyle
        )}
      >
        <div />
        <Button
          colorType="orange"
          disabled={!selectedDeckData || isLoading}
          frameType="default"
          height={isTabletWide ? '76px' : '52px'}
          className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          onClick={onPlayClick}
          leftAdornment={isLoading ? SpinnerIcon : undefined}
          buttonId="playButton"
          clickSound="PlayStinger"
          text={isLoading ? t('play.loading') : t('play.play')}
        />
      </div>
    </>
  )
})

IdentityPracticeVsBotPage.displayName = 'IdentityPracticeVsBotPage'
