import type { Card } from '@opensky/proto'

type SourceCardInput = {
  id: number
  name: string
  description: string
  asset: string
  class: Card['class'] | string
  element: Card['element'] | string
  type: Card['type'] | string
  manaCost: number
  power: number
  health: number
  attachedSpellID?: number | null
  keywords?: string[] | null
  status: Card['status'] | string
  set: Card['set'] | string
  imageURL?: Card['imageURL'] | null
  itemType: Card['itemType'] | string
  isNew?: boolean | null
  silverCardTokenId?: number | null
  goldCardTokenId?: number | null
}

// The checked-in catalog also contains internal season metadata. Project only
// the generated Go Card JSON fields, retaining nil pointers as explicit nulls.
export const sourceCardWire = (card: SourceCardInput): Card =>
  ({
    id: card.id,
    name: card.name,
    description: card.description,
    asset: card.asset,
    class: card.class,
    element: card.element,
    type: card.type,
    manaCost: card.manaCost,
    power: card.power,
    health: card.health,
    attachedSpellID: card.attachedSpellID ?? null,
    keywords: card.keywords ?? null,
    status: card.status,
    set: card.set,
    imageURL: card.imageURL ?? null,
    itemType: card.itemType,
    isNew: card.isNew ?? null,
    silverCardTokenId: card.silverCardTokenId ?? null,
    goldCardTokenId: card.goldCardTokenId ?? null
  }) as unknown as Card
