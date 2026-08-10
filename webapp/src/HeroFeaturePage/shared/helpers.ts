import { BASE_SKIN_ARRAY, HERO_SKIN_ARRAY } from './constants'

/**
 * Returns the correct hero skin array based on the ID.
 * Right now we're not rendering the legacy and base skins
 * together on the feature page, so we don't want to combine
 * both arrays.
 */
export const getHeroDataArray = (id: number) => {
  if (id < 0) return BASE_SKIN_ARRAY
  return HERO_SKIN_ARRAY
}
