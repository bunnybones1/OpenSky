import { proxy } from 'valtio'
import { derive } from 'valtio/utils'

interface HeroFeatureState {
  skinsToMint: { [key: number]: number }
  fromPage?: string
  isCarouselMoving: boolean
}

const DEFAULT_HERO_FEATURE_STATE: HeroFeatureState = {
  fromPage: undefined,
  skinsToMint: {},
  isCarouselMoving: false
}

export const heroFeatureState = proxy(DEFAULT_HERO_FEATURE_STATE)

export const updateHeroFeatureState = <T extends keyof HeroFeatureState>(
  key: T,
  value: HeroFeatureState[T]
) => {
  heroFeatureState[key] = value
}

export const addSkinToMint = (id: number) => {
  heroFeatureState.skinsToMint[id] = 1
}

export const removeSkinToMint = (id: number) => {
  if (!!heroFeatureState.skinsToMint[id]) {
    delete heroFeatureState.skinsToMint[id]
  }
}

export const updateHeroSkinQuantity = (id: number, amount: number) => {
  if (heroFeatureState.skinsToMint[id]) {
    heroFeatureState.skinsToMint[id] = amount
  }
}

export const resetHeroFeatureState = () => {
  heroFeatureState.fromPage = DEFAULT_HERO_FEATURE_STATE.fromPage
  heroFeatureState.skinsToMint = DEFAULT_HERO_FEATURE_STATE.skinsToMint
  heroFeatureState.isCarouselMoving = DEFAULT_HERO_FEATURE_STATE.isCarouselMoving
}

export const derivedHeroFeatureState = derive({
  totalSkinsInOrder: (get) => {
    const { skinsToMint } = get(heroFeatureState)

    let total = 0

    for (const numSkinsSelected in skinsToMint) {
      total += skinsToMint[Number(numSkinsSelected)]
    }

    return total
  },
  skinIdsInOrder: (get) =>
    Object.keys(get(heroFeatureState).skinsToMint).map((id) => Number(id))
})
