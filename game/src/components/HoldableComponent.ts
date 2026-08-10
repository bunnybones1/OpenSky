import { Component, Entity } from 'gg'

import { Components } from '.'

type E = Entity<Components>

interface HoldableValue {
  onHold: (held: E) => void
  onHoldCancel: (held: E) => void
}

export default class HoldableComponent extends Component<HoldableValue> {
  constructor(onHold: (held: E) => void, onHoldCancel: (held: E) => void) {
    super({
      onHold,
      onHoldCancel
    })
  }
}
