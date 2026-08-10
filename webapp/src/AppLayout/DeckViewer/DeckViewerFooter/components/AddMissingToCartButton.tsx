import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { getSilverID } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useAddToCart } from '~/shared/mutations/cart/useAddToCart'
import { useCart } from '~/shared/queries/useCart'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { CartItem } from '~/shared/types/market'

import { AddToCartValue } from './AddToCartValue'

interface AddMissingToCartButtonProps {
  deckString?: string
}

export const AddMissingToCartButton = memo(
  ({ deckString }: AddMissingToCartButtonProps) => {
    const addToCart = useAddToCart()
    const { t } = useTranslation()
    const { cardIds } = useDecodedDeckString(deckString)
    const { data: cart } = useCart()

    const ownedCards = useDeckOwnedCards(cardIds)

    const unOwnedCards = useMemo(() => {
      if (!cardIds) return
      return !ownedCards
        ? cardIds
        : cardIds.filter((id) => {
            return !ownedCards.includes(id)
          })
    }, [cardIds, ownedCards])

    const tokenIdsNotAddedToCart = useMemo(() => {
      if (!unOwnedCards || cart === undefined) return

      if (!cart) return unOwnedCards.map(getSilverID)

      return unOwnedCards
        .filter((card) => {
          const silverId = getSilverID(card)
          if (
            !cart.some(
              (item) => item.tokenId === silverId && item.side === SwapType.BUY
            )
          ) {
            return true
          }
          return false
        })
        .map(getSilverID)
    }, [cart, unOwnedCards])

    const isFullyAdded = !tokenIdsNotAddedToCart || !tokenIdsNotAddedToCart.length

    const addDeckToCart = useCallback(() => {
      if (!deckString) return

      if (!tokenIdsNotAddedToCart || !tokenIdsNotAddedToCart.length) return

      const newItems: CartItem[] = tokenIdsNotAddedToCart.map((tokenId) => ({
        tokenId,
        side: SwapType.BUY,
        amount: 1,
        type: ItemType.SW_SILVER_CARDS
      }))
      addToCart.mutate(newItems)
    }, [addToCart, deckString, tokenIdsNotAddedToCart])

    return (
      <Button
        colorType="blue"
        disabled={addToCart.isLoading || isFullyAdded}
        frameType="default"
        onClick={addDeckToCart}
        text={t(isFullyAdded ? 'decks.MissingAddedToCart' : 'decks.AddMissingToCart')}
        leftAdornment={{ icon: 'cart' }}
        rightAdornment={
          addToCart.isLoading ? { icon: 'spinner' } : { component: AddToCartValue }
        }
        className={clsx(Sprinkles({ marginTop: '8px' }), FullWidthButtonStyle)}
        buttonClassName={FullWidthButtonStyle}
      />
    )
  }
)

AddMissingToCartButton.displayName = 'AddMissingToCartButton'
