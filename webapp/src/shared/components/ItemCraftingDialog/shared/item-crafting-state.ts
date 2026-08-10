import { ItemType } from '@opensky/proto'
import { proxy } from 'valtio'

interface ItemCraftingState {
  id?: number
  itemType?: ItemType.SW_BASE_CARDS | ItemType.SW_HERO
}

const DEFAULT_ITEM_CRAFTING_STATE: ItemCraftingState = {
  id: undefined
}

export const itemCraftingState = proxy<ItemCraftingState>(DEFAULT_ITEM_CRAFTING_STATE)

export const openItemCraftingDialog = ({
  id,
  itemType
}: Required<ItemCraftingState>) => {
  itemCraftingState.id = id
  itemCraftingState.itemType = itemType
}

export const resetItemCraftingDialog = () => {
  itemCraftingState.id = DEFAULT_ITEM_CRAFTING_STATE.id
  itemCraftingState.itemType = DEFAULT_ITEM_CRAFTING_STATE.itemType
}
