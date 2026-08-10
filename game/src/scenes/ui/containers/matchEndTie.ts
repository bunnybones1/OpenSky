import { UI } from '..'
import { MatchEndContainer } from './matchEnd'

export default class MatchEndTieContainer extends MatchEndContainer {
  constructor(ui: UI, priority: number) {
    super(ui, priority, 'tie')
  }
}
