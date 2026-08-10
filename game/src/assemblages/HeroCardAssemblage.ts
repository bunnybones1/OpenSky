import {
  DECKCLASS_PRISMS,
  HERO_DECKCLASS,
  HeroSkin
} from '@opensky/shared/constants'
import { DoubleSide, Material, Mesh } from 'three'

import { getAssetsManager } from '~/assets'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import HeroCardComponent from '~/components/HeroCardComponent'
import { setupCardArt } from '~/helpers/cardArtHelpers'
import { managePrismGems } from '~/helpers/prismGems'
import InteractiveObject3D from '~/meshes/InteractiveObject3D'
import queryParams from '~/queryParams'
import * as textOptions from '~/systems/text/TextOptions'
import { cameraShaker } from '~/utils/cameraShaker'
import { Interactives } from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { addText } from '~/utils/textUtils'
import { findObject3DByName } from '~/utils/threeUtils'

import { CommonCardAssemblage } from './CardAssemblage'

const TEXT_DEPTH = 0.0013
const NAME_TEXT_Z = 0.016

export function createHeroCardInteractives(heroSkin: HeroSkin): Interactives {
  const visualsRoot = new InteractiveObject3D(
    getAssetsManager().fetchMeshDeepClone('gamePiecesPhysical', 'heroCard')
  )

  const s = 0.95
  visualsRoot.scale.set(s, s, s)
  registerMeshesToLCMaterials(visualsRoot)

  const collider = findObject3DByName<Mesh>(visualsRoot, 'heroCard-collider')
  visualsRoot.collider = collider

  const colliderMaterial = collider.material as Material
  colliderMaterial.side = DoubleSide

  const isLocked = heroSkin.grade === 'none'
  const frameFrontToRemove = `heroCard-frame${isLocked ? '' : '-none'}`
  const f = findObject3DByName(visualsRoot, frameFrontToRemove)
  f.parent!.remove(f)

  const highlight: Mesh = findObject3DByName(visualsRoot, 'heroCard-highlight')

  if (highlight.material instanceof Material) {
    highlight.material = highlight.material.clone()
  }

  const bgUrl = heroSkin.bgID.startsWith('blob:')
    ? heroSkin.bgID
    : `game/cards/art-full/bgs/${heroSkin.bgID}.png`

  const fgUrl = heroSkin.artID.startsWith('blob:')
    ? heroSkin.artID
    : `game/cards/art-full/heroes/${heroSkin.artID}.png`

  const cardArt = findObject3DByName(
    getAssetsManager().getAsset('gamePiecesGraphical'),
    `card-hero-art`
  ) as Mesh

  const cardArtCopy = setupCardArt(
    cameraShaker.camera,
    cardArt,
    'sky',
    'unit',
    bgUrl,
    fgUrl,
    undefined,
    undefined,
    queryParams.foilHero ? heroSkin.grade : 'base'
  )

  cardArtCopy.scale.multiplyScalar(0.352)
  cardArtCopy.rotation.x = Math.PI * -0.5
  cardArtCopy.position.x += 0.00005
  cardArtCopy.position.y += 0.00075
  cardArtCopy.position.z += 0.0025

  cardArtCopy.userData.isFrontFacing = true
  visualsRoot.add(cardArtCopy)

  const name = heroSkin.name

  /// Name
  const textName = addText(
    visualsRoot,
    name,
    textOptions.cardName,
    0,
    TEXT_DEPTH,
    NAME_TEXT_Z + 0.001
  )
  textName.name = 'textName'

  /// Name
  const textNameShadow = addText(
    visualsRoot,
    name,
    textOptions.cardNameShadow,
    0,
    TEXT_DEPTH,
    NAME_TEXT_Z + 0.00006
  )
  textNameShadow.name = 'shadowName'
  textName.attach(textNameShadow)
  const prisms = DECKCLASS_PRISMS[HERO_DECKCLASS[heroSkin.hero]]
  managePrismGems(visualsRoot, prisms)

  return { visualsRoot, highlight, collider }
}

const HeroCardAssemblage = (heroSkin: HeroSkin) => {
  const components = CommonCardAssemblage()

  components.push(new HeroCardComponent(heroSkin))
  components.push(new FrameStyleComponent(heroSkin.grade))

  return components
}

export default HeroCardAssemblage
