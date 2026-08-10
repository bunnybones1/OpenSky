import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { makeNavigateToMarketDecksRoute } from '~/shared/helpers/routes/market-page'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  ItemsDeckButtonArt,
  ItemsDeckButtonFrame,
  ItemsDeckButtonGradient,
  ItemsDeckButtonHighlight,
  ItemsDeckButtonPlus,
  ItemsDeckButtonStyle,
  ItemsDeckButtonText,
  ItemsDeckButtonTop,
  ItemsDeckButtonWrapper
} from './ItemsDeckButton.css'

interface ItemsDeckButtonProps {
  type: 'buy' | 'create'
}

const PromptFontSize = { base: '18px', tabletWide: '22px' } as const
const PlusIconSize = { base: '32px', tabletWide: '48px' } as const

export const ItemsDeckButton = memo(({ type }: ItemsDeckButtonProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    if (type === 'buy') {
      dispatch(push(makeNavigateToMarketDecksRoute()))
    } else {
      dispatch(push(ROUTES_CONFIG.routes.CREATE_DECK.directPath))
    }
  }, [dispatch, type])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative'
        }),
        ItemsDeckButtonWrapper
      )}
      data-deck-button-id={type}
      onMouseDown={() => SoundClient.playSound('BackReturnSwipe')}
      onMouseEnter={() => SoundClient.playSound('CursorHoverSlip')}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full',
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0
          }),
          ItemsDeckButtonStyle
        )}
        onClick={onClick}
      >
        <Text
          className={ItemsDeckButtonText}
          color="white"
          fontSize={PromptFontSize}
          fontWeight="700"
          textAlign="center"
        >
          {t(type === 'buy' ? 'decks.buyDecks' : 'decks.createDeck')}
        </Text>
        {!!getAssetUrl && (
          <>
            <img
              src={getAssetUrl('webapp/misc/deck-highlight.webp')}
              className={clsx(
                Sprinkles({
                  height: 'full',
                  width: 'full',
                  position: 'absolute',
                  left: 0,
                  pointerEvents: 'none',
                  top: 0
                }),
                ItemsDeckButtonHighlight
              )}
            />
            {type === 'buy' && (
              <img
                className={clsx(
                  Sprinkles({
                    height: 'full',
                    width: 'full',
                    position: 'absolute',
                    left: 0,
                    pointerEvents: 'none',
                    top: 0
                  }),
                  ItemsDeckButtonTop
                )}
                src={getAssetUrl('webapp/misc/deck-cards-silver.webp')}
              />
            )}
            <img
              className={clsx(
                Sprinkles({
                  height: 'full',
                  width: 'full',
                  position: 'absolute',
                  left: 0,
                  pointerEvents: 'none',
                  top: 0
                }),
                ItemsDeckButtonFrame
              )}
              src={getAssetUrl('webapp/misc/deck-border.webp')}
            />
            <div
              className={clsx(
                Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute'
                }),
                ItemsDeckButtonPlus
              )}
            >
              <Icon height={PlusIconSize} color="cold8" type="plus" />
            </div>
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute'
                }),
                ItemsDeckButtonGradient
              )}
            />
            <img
              className={clsx(
                Sprinkles({
                  position: 'absolute'
                }),
                ItemsDeckButtonArt
              )}
              src={getAssetUrl(
                type === 'buy'
                  ? 'webapp/backgrounds/bg-mind-03.webp'
                  : 'webapp/backgrounds/bg-fire-03.webp'
              )}
            />
          </>
        )}
      </div>
    </div>
  )
})

ItemsDeckButton.displayName = 'ItemsDeckButton'
