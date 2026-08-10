import { UI } from '..'
import { MatchEndContainer } from './matchEnd'

export default class MatchEndDefeatContainer extends MatchEndContainer {
  constructor(ui: UI, priority: number) {
    super(ui, priority, 'defeat')
  }
}
