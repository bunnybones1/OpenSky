import { Entity } from 'gg'

import { getAssetsManager } from '~/assets'
import { makeHSL } from '~/colors/utils'
import CollidableComponent from '~/components/CollidableComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import TransformComponent from '~/components/TransformComponent'
import { ARENA_ANGLE } from '~/constants'
import { createCard } from '~/factories/CardFactory'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import inputProvider, { underPointer } from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import { getFakeCardTagView } from '~/utils/card'
import { createOverlay } from '~/utils/ui'
import { world } from '~/world'

import { BaseTestScene } from './BaseTestScene'

class TestClipSpaceCardScene extends BaseTestScene {
  updaters: Array<() => void> = []
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready
    const xLevels = 5

    for (let i = 0; i < xLevels; i++) {
      const depth = (i / (xLevels - 1) - 0.5) * 1.99
      const ol = createOverlay(container, undefined, undefined, depth)
      ol.name += i
      ol.matrix.setConstraints(
        new Pin(1 / xLevels, 1, 10, 10),
        ReadonlyPin.TopLeft,
        new Pin(i / xLevels, 0, -5, -5)
      )
      ol.matrix.setColor(makeHSL(i / xLevels, 0.6, 0.5), 0.75)
      const text = new UITextMesh(`${depth}`, {
        ...textOptions.generic,
        size: 70,
        color: 'white'
      })
      container.add(text)
      text.matrix.setConstraints(
        new Pin(1 / xLevels, 1),
        ReadonlyPin.TopLeft,
        new Pin((i + 0.5) / xLevels, 0.5)
      )
      text.material.depth = -0.999
    }

    const circleLengthNum = 10

    for (let x = 0; x < circleLengthNum; x++) {
      const xPos = (x / (circleLengthNum - 1) - 0.5) * 2
      for (let y = 0; y < circleLengthNum; y++) {
        const yPos = (y / (circleLengthNum - 1) - 0.5) * 2
        const depth = yPos

        const card = createCard(getFakeCardTagView('1001', 'gold'), true)
        card.toggle(FrontFacesVisibleComponent, true)
        card.get('transform').rotation.x = ARENA_ANGLE
        card.get('transform').scale.setScalar((y + 1) / 100)
        const text = new TextMesh(`${depth.toFixed(2)}`, {
          ...textOptions.generic,
          size: 0.9,
          color: 'white',
          width: 300
        })
        this.scene.add(text)
        this.updaters.push(() => {
          card.get('transform').position.set(xPos * 0.9, yPos * 0.9, depth)
          card.get('transform').position.unproject(this.camera)

          text.position.set(xPos * 0.9 + 0.07, yPos * 0.9, -0.99)
          text.position.unproject(this.camera)
        })
      }
    }

    const overText = new UITextMesh('', {
      ...textOptions.generic,
      size: 50,
      color: 'white'
    })
    overText.matrix.setConstraintsPosition(new Pin(0.5, 0.25))
    container.add(overText)
    container.show()
    super.initUI(ui)
    underPointer.addRoot3D(CollidableComponent.entities)
    inputProvider.onMove.addListener((x, y) => {
      const hit = underPointer.testHit(x, y, () => true)
      if (hit?.frontMost) {
        const h = hit.frontMost
        if (h instanceof Entity) {
          overText.text = `${h.get('mesh').name}\n${hit.clipSpaceDepth.toFixed(
            2
          )}`
        } else {
          overText.text = `${h.name}\n${hit.clipSpaceDepth.toFixed(2)}`
        }
      } else {
        overText.text = 'nothing'
      }
    })

    await getAssetsManager().loadAsset('gamePiecesPhysical')
    await getAssetsManager().loadAsset('gamePiecesGraphical')

    TransformComponent.defaultScene = this.scene

    world.addSystem(new CardVisualsSystem())
    world.addSystem(new CardArtGenerationSystem())
    world.addSystem(new TextureAnimationSystem())
    world.addSystem(new InteractiveIndicatorsSystem())
    world.addSystem(new FrameStyleSystem())

    await ui.getContainer('options').ready
    ui.getContainer('options').show()
  }

  update(dt: number) {
    this.updaters.forEach(u => u())

    super.update(dt)
  }
}

export const scene = TestClipSpaceCardScene
