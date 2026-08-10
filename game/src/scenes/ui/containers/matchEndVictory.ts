import { UI } from '..'
import { MatchEndContainer } from './matchEnd'

export default class MatchEndVictoryContainer extends MatchEndContainer {
  constructor(ui: UI, priority: number) {
    super(ui, priority, 'victory')
  }
}
