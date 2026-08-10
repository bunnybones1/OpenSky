import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { clamp } from '@opensky/shared/utils/math'
import { Texture } from 'three'

import UpdateManager from '~/systems/UpdateManager'
import { taskTimer } from '~/utils/taskTimer'

const LIFE_SPAN = 5000

class TimedTexture {
  constructor(
    public texture: Texture,
    public timeToDispose: number
  ) {
    //
  }
}
export default class TextureCache {
  protectedRegistry: string[] = []
  registry: string[] = []
  textures = new Map<string, TimedTexture>()
  private _now = 0
  constructor() {
    UpdateManager.register(this)
  }
  getTexture(url: string) {
    if (this.registry.includes(url)) {
      removeFromArray(this.registry, url)
      this.registry.push(url)
      const tt = this.textures.get(url)!
      tt.timeToDispose = this._now + LIFE_SPAN
      return tt.texture
    } else if (this.protectedRegistry.includes(url)) {
      return this.textures.get(url)!.texture
    } else {
      throw new Error(`${url} not found in texture cache`)
    }
  }
  hasTexture(url: string) {
    return this.registry.includes(url) || this.protectedRegistry.includes(url)
  }
  delete(url: string) {
    if (this.textures.has(url)) {
      this.textures.delete(url)
      removeFromArray(this.registry, url)
    }
  }
  setTexture(url: string, texture: Texture) {
    if (this.registry.includes(url)) {
      throw new Error(`${url} already in texture cache`)
    } else {
      let mipmaps: ImageData[] | undefined = texture.mipmaps
      let mipmapsToDestroy: ImageData[] | undefined
      Object.defineProperty(texture, 'mipmaps', {
        get: () => {
          if (!mipmaps) {
            throw new Error(`${url} already cleared?`)
          }
          const readOnceMipmaps = mipmaps
          mipmapsToDestroy = mipmaps
          mipmaps = []
          taskTimer.add(() => {
            //console.log(`clearing ${url}`)
            mipmapsToDestroy!.length = 0
          }, 1)
          return readOnceMipmaps
        }
      })
      this.registry.push(url)
      this.textures.set(url, new TimedTexture(texture, this._now + LIFE_SPAN))
    }
  }
  protect(url: string | (() => Promise<string>)) {
    if (typeof url !== 'string') {
      url().then(actualUrl => this.protect(actualUrl))
      return
    }
    if (!this.protectedRegistry.includes(url)) {
      this.protectedRegistry.push(url)
    }
    if (this.registry.includes(url)) {
      removeFromArray(this.registry, url)
    }
  }

  update(dt: number) {
    dt = clamp(dt, 0, 0.1)
    this._now += dt
    while (
      this.registry.length > 0 &&
      this.textures.get(this.registry[0])!.timeToDispose < this._now
    ) {
      this.disposeTexture(this.registry[0])
    }
  }
  disposeTexture(url: string) {
    //console.log(`disposing ${url}`)
    if (this.registry.includes(url)) {
      removeFromArray(this.registry, url)
      const tt = this.textures.get(url)!
      this.textures.delete(url)
      tt.texture.dispose()
      if (tt.texture.mipmaps.length > 0) {
        tt.texture.mipmaps.length = 0
      }
    } else {
      throw new Error(`${url} not found in texture cache`)
    }
  }
  lookupTextureUrl(texture: Texture) {
    for (const [key, v] of this.textures.entries()) {
      if (v.texture === texture) {
        return key
      }
    }
    return undefined
  }
}
