import { Player } from '@skyweaver/state-metadata'

import ActionHistorySidebar from '.'
import TurnRow from './TurnRow'

export default class EndTurnRow extends TurnRow {
  constructor(sidebar: ActionHistorySidebar, playerId: Player) {
    super(sidebar, playerId, 'end')
  }
}
