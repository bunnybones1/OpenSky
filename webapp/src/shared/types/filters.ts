import { OwnershipFilter } from './cards'

export interface SharedStickerFilters {
  ownership: OwnershipFilter
  search?: string
  isEquipped?: boolean
}

export interface SharedCardBackFilters {
  ownership: OwnershipFilter
  search?: string
  isEquipped?: boolean
}
