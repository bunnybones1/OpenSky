import { memo } from 'react'

import { Text } from '~/shared/components/Text'
import { useDeckName } from '~/shared/hooks/decks/useDeckName'
import { useIsStarterDeck } from '~/shared/hooks/decks/useIsStarterDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'

const FontSize = { base: '18px', tabletWide: '32px' } as const

interface HeaderNameProps {
  uuid?: string
}

export const HeaderName = memo(({ uuid }: HeaderNameProps) => {
  const { data: deck } = useUserDeck(uuid)

  const isStarterDeck = useIsStarterDeck(deck?.deckType)
  const name = useDeckName(isStarterDeck, deck?.name, deck?.class)

  if (!deck || !name) return null

  return (
    <Text
      color="white"
      fontSize={FontSize}
      fontWeight="600"
      fontFamily="condensed"
      marginLeft="12px"
    >
      {name}
    </Text>
  )
})

HeaderName.displayName = 'HeaderNameHeaderName'
