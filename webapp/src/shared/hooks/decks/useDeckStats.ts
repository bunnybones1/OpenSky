import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import { useMemo } from 'react'

export const useDeckStats = (cardIds: BaseCard[]) => {
  return useMemo(() => {
    let numWater = 0
    let numAir = 0
    let numEarth = 0
    let numFire = 0
    let numLight = 0
    let numDark = 0
    let numMetal = 0
    let numMind = 0
    let numUnits = 0
    let numSpells = 0

    cardIds.forEach((id) => {
      const card = CardLibrary.get(id)

      if (!!card) {
        if (card.type === 'spell') {
          numSpells += 1
        } else {
          numUnits += 1
        }

        if (card.element === 'air') numAir += 1
        if (card.element === 'water') numWater += 1
        if (card.element === 'earth') numEarth += 1
        if (card.element === 'fire') numFire += 1
        if (card.element === 'light') numLight += 1
        if (card.element === 'dark') numDark += 1
        if (card.element === 'metal') numMetal += 1
        if (card.element === 'mind') numMind += 1
      }
    })

    return {
      numWater,
      numAir,
      numEarth,
      numFire,
      numLight,
      numDark,
      numMetal,
      numMind,
      numUnits,
      numSpells
    }
  }, [cardIds])
}
