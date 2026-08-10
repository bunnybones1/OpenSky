import { i18n } from '@opensky/language-manager'
import { Player } from '@skyweaver/state-metadata'

import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { store } from '~/state'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import ActionHistorySidebar from '.'
import { CELL_SIZE } from './constants'
import Row from './Row'
import { getPlayerColor } from './rowUtils'

export default class TurnRow extends Row {
  constructor(
    sidebar: ActionHistorySidebar,
    playerId: Player,
    type: 'start' | 'end'
  ) {
    super(sidebar, 38)

    const lift = -2
    const separation = 7
    const color = getPlayerColor(playerId)
    const playerNameText = new UITextMesh(
      store.player === playerId
        ? i18n.t('ui.whoseTurn.yourTurn')
        : i18n.t('ui.whoseTurn.enemysTurn'),
      {
        ...textOptions.actionHistoryTurn,
        width: CELL_SIZE,
        color
      },
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    playerNameText.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset(0, lift - separation)
    )
    this.add(playerNameText)

    const turnText = new UITextMesh(
      i18n.t(`ui.whoseTurn.type.${type}`),
      {
        ...textOptions.actionHistoryTurn,
        width: CELL_SIZE,
        size: 13,
        color
      },
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    turnText.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset(0, lift + separation)
    )
    this.add(turnText)
  }
}
