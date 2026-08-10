import { FlagCodes, PrismClass } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo } from 'react'
import { Link } from 'react-router-dom'

import { deckViewerDeckStringSelector } from '~/AppLayout/DeckViewer/shared/selectors'
import { DeckLeaderboardRowLayout } from '~/LeaderboardPage/shared/style/DeckLeaderboardRowLayout.css'
import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { CostGraph } from '~/shared/components/CostGraph/CostGraph'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { PRISM_ICON_TYPES } from '~/shared/constants/cards'
import { makeDeckViewerRoute } from '~/shared/helpers/routes/items-decks'
import { useUserDeckByDeckstring } from '~/shared/hooks/decks/useUserDeckByDeckstring'
import { useSelector } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CollectedCell } from './components/CollectedCell'
import { TopPlayerCell } from './components/TopPlayerCell'
import { DeckLeaderboardRowStyle } from './DeckLeaderboardRow.css'

const FontSize = { base: '14px', tabletWide: '16px' } as const

interface DeckLeaderboardRowProps {
  prisms: PrismClass[]
  tagArtID?: string
  region: FlagCodes | null
  name: string
  address: string
  deckString: string
  score: number
}

export const DeckLeaderboardRow = memo(
  ({
    prisms,
    tagArtID,
    region,
    name,
    address,
    deckString,
    score
  }: DeckLeaderboardRowProps) => {
    const craftedDeck = useUserDeckByDeckstring(deckString)
    const selectedDeckString = useSelector(deckViewerDeckStringSelector)

    return (
      <Link
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            cursor: 'pointer'
          }),
          MaxPlayerLeaderboardWidth,
          DeckLeaderboardRowLayout,
          DeckLeaderboardRowStyle,
          { isSelected: selectedDeckString === deckString }
        )}
        to={makeDeckViewerRoute(deckString, craftedDeck?.uuid)}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            height: 'full',
            justifyContent: 'center',
            alignItems: 'center'
          })}
        >
          <Icon height="16px" color="white" type={PRISM_ICON_TYPES[prisms[0]]} />
          {prisms.length > 1 && (
            <div
              className={Sprinkles({
                marginLeft: '8px'
              })}
            >
              <Icon height="16px" color="white" type={PRISM_ICON_TYPES[prisms[1]]} />
            </div>
          )}
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            height: 'full',
            justifyContent: 'center',
            alignItems: 'center'
          })}
        >
          <CostGraph deckString={deckString} height={20} />
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
        <TopPlayerCell
          name={name}
          region={region}
          address={address}
          tagArtID={tagArtID}
        />
        <CollectedCell deckString={deckString} />
      </Link>
    )
  }
)

DeckLeaderboardRow.displayName = 'DeckLeaderboardRow'
