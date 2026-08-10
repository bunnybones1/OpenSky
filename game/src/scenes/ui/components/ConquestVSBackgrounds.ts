import { lerp } from '@opensky/shared/utils/math'
import { Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

export async function createConquestVSBackgrounds(
  gameMode: 'discovery' | 'constructed'
): Promise<ConquestVSBackgrounds> {
  const urls = [
    'game/conquest/opaque/conquest-intro-bg.png',
    'game/conquest/transparent/statues-fronts.png',
    `game/conquest/transparent/vs-${gameMode}.png`
  ]

  const [bgTexture, statuesTexture, gameModeTexture] = await Promise.all(
    urls.map(
      url =>
        getAssetsManager().load('texture', url, false, 2000) as Promise<Texture>
    )
  )
  return new ConquestVSBackgrounds(bgTexture, statuesTexture, gameModeTexture)
}

export class ConquestVSBackgrounds {
  textures: [Texture, Texture, Texture]
  mesh: RectangleMesh
  private _statuesMesh: RectangleMesh
  constructor(
    bgTexture: Texture,
    statuesTexture: Texture,
    gameModeTexture: Texture
  ) {
    this.textures = [bgTexture, statuesTexture, gameModeTexture]

    const commonParams = {
      opacity: 1,
      forceTransparent: true
    }
    const bgMaterial = new RectangleMaterial({
      map: bgTexture,
      ...commonParams
    })
    const statuesMaterial = new RectangleMaterial({
      map: statuesTexture,
      ...commonParams
    })
    const gameModeMaterial = new RectangleMaterial({
      map: gameModeTexture,
      ...commonParams
    })

    const bgMesh = new RectangleMesh(bgMaterial)
    bgMesh.name = 'bg'
    const scaleMix = { value: 0 }
    function onUpdateScale() {
      const scale = lerp(1.2, 1, Easing.Cubic.Out(scaleMix.value))
      bgMesh.matrix.size.x.scale = scale
      bgMesh.matrix.size.y.scale = scale
    }
    simpleTweener.to({
      description: 'conquest bg scale',
      target: scaleMix,
      propertyGoals: { value: 1 },
      duration: 10000,
      onUpdate: onUpdateScale
    })
    this.mesh = bgMesh

    const statuesMesh = new RectangleMesh(statuesMaterial)
    statuesMesh.name = 'statue'
    this._statuesMesh = statuesMesh
    statuesMesh.matrix.setConstraints(
      new SizePin(0.779166, 0.779166, 1 / 3, 'fit'),
      ReadonlyPin.Center,
      new Pin(0.5, 0.415)
    )
    this.mesh.add(statuesMesh)

    const gameModeMesh = new RectangleMesh(gameModeMaterial)
    gameModeMesh.name = 'gameMode'

    gameModeMesh.matrix.setConstraints(
      new SizePin(0.7592592593, 0.7592592593),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    this.mesh.add(gameModeMesh)
  }
  setGame(game: 0 | 1 | 2) {
    const geo = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `conquest-vs-statue-canvas-${game + 1}`
    )
    this._statuesMesh.geometry = geo.geometry
  }

  disposeTextures() {
    for (const texture of this.textures) {
      const texCache = getAssetsManager().getTextureCache(TextureType.Default)
      const url = texCache.lookupTextureUrl(texture)
      if (url) {
        texCache.disposeTexture(url)
      }
    }
  }
}
