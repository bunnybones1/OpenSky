import { BaseCard, Rarity } from '@skyweaver/state-metadata'
import { memo, useRef } from 'react'
import { useMount, useUnmount } from 'react-use'

import { ItemType } from '~/lib/proto'
import { CardImage } from '~/shared/components/CardImage/CardImage'
import { CardType } from '~/shared/constants/cards'

import { getGameEngineController } from './helpers/game-engine-manager'

interface Props {
  opacity: number
  card: CardType
  forceFrame?: boolean
}
function rarityLookup(type: ItemType | undefined): Rarity {
  switch (type) {
    case ItemType.SW_GOLD_CARDS:
      return 'gold'
    case ItemType.SW_SILVER_CARDS:
      return 'silver'
    case ItemType.SW_BASE_CARDS:
      return 'base'
    default:
      return 'none'
  }
}
export const CardImageGL = memo(({ card, opacity }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  useUnmount(() => {
    getGameEngineController((swGame) => {
      swGame.pause()
    })
  })
  useMount(() => {
    getGameEngineController((swGame) => {
      swGame.resume()
      swGame.startTrackingCanvasSize()
      const div = containerRef.current
      if (div) {
        const canvas = swGame.getCanvas()
        div.append(canvas)
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        // swGame.setSize(176, 271)
        swGame.showCard(card.id.toString() as BaseCard, rarityLookup(card.grade))
        // canvas.style.width = '176px'
        // canvas.style.height = '271px'
      }
    })
  })
  return (
    <div
      style={{
        position: 'relative'
      }}
    >
      <div
        style={{
          opacity,
          zIndex: 5,
          width: '100%',
          height: '100%',
          transition: '0.3s ease-in-out',
          cursor: 'pointer',
          position: 'absolute'
        }}
        ref={containerRef}
      />
      <CardImage id={card.id} />
    </div>
  )
})

CardImageGL.displayName = 'CardImageGL'
