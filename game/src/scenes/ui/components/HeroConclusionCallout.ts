import { DeckClass } from '@opensky/proto'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { Prism } from '@skyweaver/state-metadata'
import { ClampToEdgeWrapping, Color } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { MatchEndType } from '~/helpers/typeHelpers'
import { heroAssetForPrisms } from '~/materials'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import UpdateManager from '~/systems/UpdateManager'
import { safelyResetFlipY } from '~/utils/textureUtils'

import { heroWingsSize } from './matchEndCommonData'

const COLOR_PULSE_YELLOW = new Color(0.2, 0.18, -0.05).multiplyScalar(0.75)
const COLOR_PULSE_RED = new Color(0.1, -0.08, -0.05).multiplyScalar(0.75)

const __pulseColors: { [K in MatchEndType]: Color | undefined } = {
  victory: COLOR_PULSE_YELLOW,
  defeat: COLOR_PULSE_RED,
  tie: undefined
}
const HERO_HEIGHT_OFFSET_RATIO: Map<DeckClass, number> = new Map([
  [DeckClass.STR, 0],
  [DeckClass.STA, 0],
  [DeckClass.STW, 0],
  [DeckClass.STH, 0],
  [DeckClass.STI, -0.15],
  [DeckClass.AGY, 0],
  [DeckClass.AGW, 0],
  [DeckClass.HRA, 0],
  [DeckClass.AGI, 0],
  [DeckClass.WIS, 0],
  [DeckClass.HRW, -0.15],
  [DeckClass.INW, 0],
  [DeckClass.HRT, 0],
  [DeckClass.HRI, 0],
  [DeckClass.INT, 0]
])

export async function createHeroConclusionCallout(
  endType: MatchEndType,
  prisms: Prism[]
) {
  const heroContainer = new Object2D()

  const heroContainerOffsetPin = ReadonlyPin.Top.cloneOffset(0, 0) // Starts 20 px below and animates up

  heroContainer.matrix.setConstraints(
    Pin.fromPixels(heroWingsSize.width, 220),
    ReadonlyPin.Top,
    heroContainerOffsetPin
  )

  if (endType === 'victory') {
    // TODO: Victory wings
    const wings = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'victory-wings'
    )

    heroContainer.add(wings)

    wings.matrix.setConstraints(
      Pin.fromPixels(heroWingsSize.width, heroWingsSize.height),
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(0, 45)
    )
    wings.material.depth = -0.99
  }

  await getAssetsManager()
    .load(
      'texture',
      `game/cards/art-full/heroes/${heroAssetForPrisms(prisms)}.png`
    )
    .then(heroTexture => {
      safelyResetFlipY(heroTexture)
      heroTexture.wrapS = ClampToEdgeWrapping
      heroTexture.wrapT = ClampToEdgeWrapping

      const colorReference = __pulseColors[endType]
      const deckClass = prismsToDeckClass(prisms)
      const offset = HERO_HEIGHT_OFFSET_RATIO.get(deckClass)
      const hero = new RectangleMesh(
        new RectangleMaterial({
          map: heroTexture,
          forceTransparent: true,
          colorMode: colorReference ? 'SCREEN' : 'MULTIPLY',
          glitchy: endType === 'defeat'
        }),
        0.4
      )
      heroContainer.add(hero)
      const offsetPin = ReadonlyPin.Top.clone()
      offsetPin.y.scale += offset!

      hero.matrix.setConstraints(
        new SizePin(1, 2.8, 648 / 1092, 'y'),
        ReadonlyPin.Top,
        offsetPin
      )
      hero.material.depth = -0.99
      if (endType === 'defeat') {
        const defeatLines = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'defeat-background'
        )

        heroContainer.add(defeatLines)
        const defeatOffsetPin = ReadonlyPin.Center.cloneOffset(offset!, 45)
        defeatOffsetPin.y.scale += offset!
        defeatLines.matrix.setConstraints(
          Pin.fromPixels(heroWingsSize.width, heroWingsSize.height * 1.7),
          ReadonlyPin.Center,
          defeatOffsetPin
        )
        defeatLines.material.depth = -0.99
      }

      if (colorReference) {
        const color = colorReference.clone()
        let time = 0
        UpdateManager.register({
          update(dt: number) {
            time += dt
            const phase = Math.sin(time * 1.75)
            const strength = phase + 1
            color.copy(colorReference).multiplyScalar(strength)
            hero.matrix.setColor(color)
          }
        })
      }
    })

  // Animate up Hero container
  const heroContainerOffsetY = heroContainerOffsetPin.y.offset

  await simpleTweener.to({
    description: 'slide hero container',
    target: heroContainerOffsetPin.y,
    propertyGoals: {
      offset: heroContainerOffsetY - 20
    },
    duration: 500,
    easing: Easing.Quadratic.Out
  }).finished

  return heroContainer
}
