import { Player } from '@skyweaver/state-metadata'

import ActionHistorySidebar from '.'
import TurnRow from './TurnRow'

export default class StartTurnRow extends TurnRow {
  constructor(sidebar: ActionHistorySidebar, playerId: Player) {
    super(sidebar, playerId, 'start')
  }
}
