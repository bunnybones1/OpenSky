import { Player } from '@skyweaver/state-metadata'

import { TabbedLogger } from '~/utils/fancyLogs'

export function onStartCommitCardSelection(
  logger: TabbedLogger | undefined,
  player: Player
) {
  if (logger) {
    logger.logStory(`${player} commiting card selection`)
  }

  // if (store.state) {
  //   const playersDoneCardSelection = store.state.state.players.filter(
  //     p => p.doneCardSelection
  //   )
  //   // if this is the second card selection to be submitted - either both are already done in the store,
  //   // or one is done in the store, and this is the other one
  //   // if (
  //   //   playersDoneCardSelection.length === 2 ||
  //   //   (playersDoneCardSelection.length === 1 &&
  //   //     playersDoneCardSelection[0].id !== player)
  //   // ) {
  //   //   if (world.hasSystem(CardSelectionSystem)) {
  //   //     await world.getSystem(CardSelectionSystem).cleanupVisuals(true)
  //   //     await animationDelay(1000)
  //   //   }
  //   // }
  // }
}
