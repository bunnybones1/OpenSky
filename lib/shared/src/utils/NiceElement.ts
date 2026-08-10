export type NiceCategory =
  | 'user'
  | 'secret'
  | 'never'
  | 'graphics'
  | 'physics'
  | 'materials'
  | 'testGeometry'
  | 'skyTest'
  | 'linework'
  | 'vis'
  | 'foils'
  | 'manaVialOptions'
  | 'raycastCloudOptions'
  | 'webGL'
  | 'triggers'
  | 'missiles'
  | 'beams'
  | 'lights'
  | 'options'
  | 'sound'
  | 'game'
  | 'userGraphics'
  | 'ui'
export default class NiceElement {
  static registry: NiceElement[] = []
  constructor(
    public name: string,
    public label: string | (() => string),
    public category: NiceCategory,
    public orderPriority: number = 0
  ) {
    NiceElement.registry.push(this)
    if (orderPriority === 0) {
      orderPriority = NiceElement.registry.length
    }
  }
}
