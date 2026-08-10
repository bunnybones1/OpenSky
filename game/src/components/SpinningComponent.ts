import { Component } from 'gg'

interface SpinningValue {
  speed: number
}

export default class SpinningComponent extends Component<SpinningValue> {
  constructor(speed: number) {
    super({ speed })
  }
}
