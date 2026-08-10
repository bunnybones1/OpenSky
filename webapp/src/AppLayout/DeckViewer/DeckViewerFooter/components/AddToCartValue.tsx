import { memo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useDeckCost } from '~/shared/hooks/decks/useDeckCost'
import { useSelector } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { deckViewerDeckStringSelector } from '../../shared/selectors'

export const AddToCartValue = memo(() => {
  const deckString = useSelector(deckViewerDeckStringSelector)
  const { deckCost } = useDeckCost(deckString)

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '8px'
      })}
    >
      {deckCost === undefined ? (
        <Icon type="spinner" height="16px" color="white" />
      ) : (
        <>
          <Text color="white" fontSize="16px" fontFamily="condensed">
            {`$${formatUSDCBalance(deckCost)}`}
          </Text>
        </>
      )}
    </div>
  )
})

AddToCartValue.displayName = 'AddToCartValue'
