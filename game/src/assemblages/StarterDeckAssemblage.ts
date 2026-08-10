import { DeckClass } from '@opensky/proto'
import { STARTER_DECK_ASSETS } from '@opensky/shared/constants'
import device from '@opensky/shared/device'
import { Component } from 'gg'
import { Mesh } from 'three'

import { getAssetsManager } from '~/assets'
import { BasicMapMesh } from '~/assets/MeshTypes'
import MeshComponent from '~/components/MeshComponent'
import OrderComponent from '~/components/OrderComponent'
import TransformComponent from '~/components/TransformComponent'
import ZoneComponent from '~/components/ZoneComponent'
import * as textOptions from '~/systems/text/TextOptions'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { addText } from '~/utils/textUtils'

const TEXT_DEPTH = 0.01
const NAME_TEXT_Z = 0.032

const DECK_NAMES: { [K in DeckClass]: string } = {
  STR: 'Strength',
  HRT: 'Heart',
  AGY: 'Agility',
  INT: 'Intellect',
  WIS: 'Wisdom',
  STH: 'Strength',
  STA: 'Strength',
  STI: 'Strength',
  STW: 'Strength',
  HRA: 'Strength',
  HRI: 'Strength',
  HRW: 'Strength',
  AGI: 'Strength',
  AGW: 'Strength',
  INW: 'Strength',
  UNKNOWN_CLASS: 'Strength'
}

function createStarterDeckVisuals(deckClass: DeckClass): Mesh {
  const visualsRoot = getAssetsManager().fetchMeshDeepClone(
    'starterDeckFrame',
    'deck-frame'
  )
  const coverArt = visualsRoot.children[0] as BasicMapMesh
  const s = 0.8
  visualsRoot.scale.set(s, s, s)
  visualsRoot.rotateZ(Math.PI * 0.025)
  visualsRoot.translateZ(-0.0075)
  visualsRoot.translateY(-0.02)
  visualsRoot.translateX(device.isMobile ? 0.004 : -0.001)
  registerMeshesToLCMaterials(visualsRoot)

  const deckBGAsset = STARTER_DECK_ASSETS[deckClass]
  const bgUrl = `game/starter-deck-cover-art/opaque/${deckBGAsset.backgroundAsset}.png`

  getAssetsManager()
    .load('texture', bgUrl)
    .then(texture => {
      coverArt.material.texture = texture
      safelyResetFlipY(coverArt.material.texture)
    })

  const name = `${DECK_NAMES[deckClass]} Starter`

  /// Name
  const textName = addText(
    visualsRoot,
    name,
    { ...textOptions.cardName, size: 15 },
    0,
    TEXT_DEPTH,
    NAME_TEXT_Z + 0.001
  )
  textName.name = 'textName'
  /// Name
  const textNameShadow = addText(
    visualsRoot,
    name,
    { ...textOptions.cardNameShadow, size: 15 },
    0,
    TEXT_DEPTH,
    NAME_TEXT_Z + 0.00006
  )
  textNameShadow.name = 'shadowName'
  textName.attach(textNameShadow)
  for (let i = 0; i < 3; i++) {
    const card = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesPhysical',
      'card-frame-base'
    )
    card.rotateZ(Math.PI)
    const s = 0.8
    card.scale.set(1, s / (0.8 + 2), 1)
    card.position.z += 0.0025 * i - 0.0065
    card.position.y += 0.004 * i - 0.005
    visualsRoot.add(card)
  }

  return visualsRoot
}

const StarterDeckAssemblage = (deckClass: DeckClass) => {
  const components: Array<Component<any>> = [
    new OrderComponent(0),
    new TransformComponent(),
    new ZoneComponent(),
    new MeshComponent(createStarterDeckVisuals(deckClass))
  ]

  return components
}

export default StarterDeckAssemblage
