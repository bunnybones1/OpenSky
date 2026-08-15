import type { DeckEquipment } from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceDeckEquipmentInput = {
  stickers?: Nullable<readonly number[]>
  heroSkin?: Nullable<number>
  cardBack?: Nullable<number>
}

/** Recreates encoding/json output for the generated Go DeckEquipment struct. */
export const sourceDeckEquipmentWire = (
  equipment: SourceDeckEquipmentInput
): DeckEquipment =>
  ({
    stickers: equipment.stickers?.length ? [...equipment.stickers] : null,
    heroSkin: equipment.heroSkin ?? null,
    cardBack: equipment.cardBack ?? null
  }) as unknown as DeckEquipment
