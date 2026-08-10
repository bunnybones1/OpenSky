export class AttributeRouter {
  private _attributeTrackers = new Map<string, AttributeTracker>()
  constructor(attrStrings: Array<string | undefined>) {
    for (const a of attrStrings) {
      if (a) {
        this.add(a)
      }
    }
  }
  add(attrString: string) {
    const chunks = attrString.split('.')
    const attrName = chunks[0]
    if (chunks.length !== 2) {
      throw new Error('Invalid attribute definition')
    }
    if (this._attributeTrackers.has(attrName)) {
      this._attributeTrackers.get(attrName)!.value += chunks[1]
    } else {
      this._attributeTrackers.set(
        attrName,
        new AttributeTracker(attrName, chunks[1])
      )
    }
  }
  correct(attrString: string) {
    const chunks = attrString.split('.')
    const attrName = chunks[0]
    if (chunks.length !== 2) {
      throw new Error('Invalid attribute definition')
    }
    if (this._attributeTrackers.has(attrName)) {
      return this._attributeTrackers.get(attrName)!.type === 'float'
        ? chunks[0]
        : attrString
    } else {
      throw new Error('Cannot correct unregistered attribute')
    }
  }
  getVertexPreamble() {
    let final = ''
    this._attributeTrackers.forEach(attr => {
      final += `  attribute ${attr.type} ${attr.name};\n`
    })
    return final
  }
}
type AttrTypes = 'vec4' | 'vec3' | 'vec2' | 'float'
class AttributeTracker {
  constructor(
    public name: string,
    public value: string
  ) {
    //
  }
  get type(): AttrTypes {
    const v = this.value
    function t(char: string) {
      return v.includes(char)
    }
    if (t('w') || t('a')) {
      return 'vec4'
    } else if (t('z') || t('b')) {
      return 'vec3'
    } else if (t('y') || t('g')) {
      return 'vec2'
    } else if (t('x') || t('r')) {
      return 'float'
    } else {
      throw new Error('No valid terms defined')
    }
  }
}
