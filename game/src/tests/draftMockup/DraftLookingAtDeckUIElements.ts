import { PALETTE_ROW } from '~/constants'
import SafeListeners from '~/utils/helpers/SafeListeners'

import { DraftLookingAtUIElements } from './DraftLookingAtUIElements'
import { DraftStatePlayer } from './DraftState'

export class DraftLookingAtDeckUIElements extends DraftLookingAtUIElements {
  constructor(player: DraftStatePlayer, safe: SafeListeners) {
    super(player)
    const sorters = [
      'cost',
      'alphabetical',
      'rarity',
      'unitOrSpell',
      'element'
    ] as const
    for (const mySorter of sorters.slice().reverse()) {
      const button = this.makeButton(
        () => {
          if (player.lookingAtDeckSortBy !== mySorter) {
            player.lookingAtDeckSortBySecondary = player.lookingAtDeckSortBy
            player.lookingAtDeckSortBy = mySorter
          } else {
            player.lookingAtDeckReverse = !player.lookingAtDeckReverse
          }
        },
        mySorter,
        100
      )
      safe.listenToProperty(player, 'lookingAtDeckSortBy', sorter => {
        button.basePaletteRow =
          mySorter === sorter ? PALETTE_ROW.BLUE : PALETTE_ROW.PURPLE
      })
    }
  }
}
