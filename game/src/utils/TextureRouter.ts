import { Texture, Uniform } from 'three'

export class TextureRoute {
  constructor(
    public texture: Texture,
    public values: string
  ) {
    //
  }
}
export class TextureRouter {
  getFragmentSamplerCode() {
    let final = ''
    if (this._textureTrackers.size > 0) {
      const textures = Array.from(this._textureTrackers.keys())
      for (let i = 0; i < textures.length; i++) {
        final += `  vec4 texel${i} = texture2D(map${i}, vUv);\n`
      }
    }
    return final
  }
  getTextureName(texture: Texture) {
    if (this._textureTrackers.has(texture)) {
      return this._textureTrackers.get(texture)!.name
    } else {
      throw new Error('Texture not found')
    }
  }
  getTexelName(texture: Texture) {
    if (this._textureTrackers.has(texture)) {
      return this._textureTrackers.get(texture)!.name.replace('map', 'texel')
    } else {
      throw new Error('Texture not found')
    }
  }
  hasAny() {
    return this._textureTrackers.size > 0
  }
  registerUniforms(uniforms: { [K: string]: Uniform }, uvTransform = false) {
    const textures = Array.from(this._textureTrackers.keys())
    for (let i = 0; i < textures.length; i++) {
      const tracker = this._textureTrackers.get(textures[i])!
      uniforms[tracker.name] = new Uniform(textures[i])
      if (uvTransform) {
        //@ts-ignore
        uniforms.uUvTransform = new Uniform(textures[i].matrix)
      }
    }
  }
  private _textureTrackers = new Map<Texture, TextureTracker>()
  constructor(attrStrings: Array<TextureRoute | undefined>) {
    for (const a of attrStrings) {
      if (a) {
        this.add(a)
      }
    }
  }
  add(textureRoute: TextureRoute) {
    if (this._textureTrackers.has(textureRoute.texture)) {
      this._textureTrackers.get(textureRoute.texture)!.value +=
        textureRoute.values
    } else {
      this._textureTrackers.set(
        textureRoute.texture,
        new TextureTracker(
          'map' + this._textureTrackers.size,
          textureRoute.values
        )
      )
    }
  }
  correct(textureRoute: TextureRoute) {
    if (this._textureTrackers.has(textureRoute.texture)) {
      return this._textureTrackers.get(textureRoute.texture)!.type === 'float'
        ? textureRoute.values
        : textureRoute
    } else {
      throw new Error('Cannot correct unregistered channel')
    }
  }
  getVertexShaderBeforeMain() {
    let final = ''
    if (this._textureTrackers.size > 0) {
      final += `  varying vec2 vUv;\n`
    }
    return final
  }
  getFragmentShaderBeforeMain() {
    let final = ''
    if (this._textureTrackers.size > 0) {
      final += `  varying vec2 vUv;\n`
      this._textureTrackers.forEach(tracker => {
        final += `  uniform sampler2D ${tracker.name};\n`
      })
    }
    return final
  }
}
type AttrTypes = 'vec4' | 'vec3' | 'vec2' | 'float'
class TextureTracker {
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
