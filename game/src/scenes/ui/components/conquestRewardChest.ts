// import { NUM_GRANDWEAVERS } from '@opensky/shared/constants'
import { Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import FireCracker from '~/meshes/FireCracker'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { padLeadingZeros } from '~/utils/stringUtils'
import { safelyResetFlipY } from '~/utils/textureUtils'

import { flashColor } from './rankConstants'

export class ConquestRewardChest extends Object2D {
  private _treasureLevel: number | undefined
  private _chestMesh: RectangleMesh | undefined
  private _newChestMesh: RectangleMesh | undefined
  private _nextTreasureLevel: number | undefined
  private _preparingForNewChest: boolean

  constructor() {
    super()
  }

  async prepareChest(level: number) {
    if (this._treasureLevel === level) {
      return
    }
    this._preparingForNewChest = true
    this._nextTreasureLevel = level

    const rankBadgeUrl =
      level != undefined &&
      `game/conquest/transparent/conquest-treasure-${padLeadingZeros(
        level,
        2
      )}.png`
    const rankBadgeTexture = rankBadgeUrl
      ? ((await getAssetsManager().load('texture', rankBadgeUrl)) as Texture)
      : undefined
    safelyResetFlipY(rankBadgeTexture)
    const newChestMesh = new RectangleMesh(
      new RectangleMaterial({
        map: rankBadgeTexture,
        forceTransparent: true,
        colorMode: 'SCREEN'
      })
    )
    this._newChestMesh = newChestMesh
    this._preparingForNewChest = false
  }
  async showNextChest() {
    const nextChest = this._nextTreasureLevel
    if (!this._newChestMesh || nextChest === undefined) {
      return
    }
    if (this._preparingForNewChest) {
      throw new Error('wait until preparation is complete')
    }

    const oldChestMesh = this._chestMesh

    const newChestMesh = this._newChestMesh
    this._newChestMesh = undefined
    this._chestMesh = newChestMesh
    this.add(newChestMesh)

    const sizePin = new Pin(1, 1)
    newChestMesh.matrix.setConstraints(
      sizePin,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    newChestMesh.matrix.setColorRGB(0, 0, 0)
    let growProxy: AnimatedBool | undefined
    let tintProxy: AnimatedBool | undefined
    if (oldChestMesh) {
      growProxy = new AnimatedBool(
        v => {
          const s = v * 0.2 + 1
          sizePin.x.scale = s
          sizePin.y.scale = s
        },
        false,
        100,
        Easing.Quartic.Out,
        300
      )

      tintProxy = new AnimatedBool(
        v => {
          newChestMesh.matrix.setColorRGB(v * 1.2, v * 1.2, v * 0.8)
        },
        false,
        50,
        Easing.Quartic.Out,
        1000
      )

      await Promise.all([
        growProxy!.animateValue(true),
        tintProxy!.animateValue(true)
      ])
    }
    if (oldChestMesh) {
      this.remove(oldChestMesh)

      const fireCracker = new FireCracker(
        getAssetsManager().getAsset('particle'),
        fc => {
          fc.parent!.remove(fc)
        },
        64,
        30000,
        40000,
        500,
        0,
        flashColor
      )
      fireCracker.matrix.setConstraints(new Pin(1.5, 1.5))

      newChestMesh.add(fireCracker)

      tintProxy!.animateValue(false)
      await growProxy!.animateValue(false)
    }

    this._treasureLevel = nextChest
    this._nextTreasureLevel = undefined
  }
}
