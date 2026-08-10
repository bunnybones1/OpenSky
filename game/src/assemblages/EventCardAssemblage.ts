import { CardDescriptionTextSegment } from '@opensky/parse-card-description'
import { lerp } from '@opensky/shared/utils/math'
import { Rarity } from '@skyweaver/state-metadata'
import { Component } from 'gg'
import { DoubleSide, Material, Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_HERO_ABILITY } from '~/colors/colorLibrary'
import CardComponent from '~/components/CardComponent'
import CardInstanceComponent, {
  RelaxedCardInstance
} from '~/components/CardInstanceComponent'
import EventCardComponent from '~/components/EventCardComponent'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import InteractiveIndicatorsComponent from '~/components/InteractiveIndicatorsComponent'
import OrderComponent from '~/components/OrderComponent'
import TransformComponent from '~/components/TransformComponent'
import ZoneComponent from '~/components/ZoneComponent'
import { RENDER_ORDERS } from '~/constants'
import { setupCardArt } from '~/helpers/cardArtHelpers'
import { checkForHijackedCardText } from '~/helpers/cardTextHijacker'
import { getAdditiveFillerMaterial } from '~/helpers/getAdditiveFillerMaterial'
import {
  getHeroAbilityAccentColor,
  getHeroAbilityAccentColorPrealphad
} from '~/helpers/heroAbilityAccentColorsLib'
import { makeTraitBadgeHolder } from '~/helpers/traitHelpers'
import { getCardAssetString } from '~/materials'
import InteractiveObject3D from '~/meshes/InteractiveObject3D'
import queryParams from '~/queryParams'
import { Easing } from '~/systems/animation/Easing'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import {
  Interactives,
  InteractivesFactoryMethod
} from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { addText } from '~/utils/textUtils'
import { findObject3DByName, modify3DObjects } from '~/utils/threeUtils'
import { copyTransform } from '~/utils/transformUtils'

const TEXT_DEPTH = 0.0008
const NUDGE_UP = -0.0015

const __maxDescriptionHeight = 0.017

function createEventCardBackInteractives(): Interactives {
  const template = getAssetsManager().fetchMeshDeepClone(
    'gamePiecesPhysical',
    'hero-ability'
  )
  const borrowFromThis = getAssetsManager().fetchMeshDeepClone(
    'gamePiecesPhysical',
    'card'
  )
  const back = findObject3DByName(borrowFromThis, 'card-frame-base')
  back.name = 'temp-back-leave-it-alone'
  back.scale.multiplyScalar(0.75)
  template.add(back)

  const visualsRoot = new InteractiveObject3D(template)
  const s = 0.95
  visualsRoot.scale.set(s, s, s)
  registerMeshesToLCMaterials(visualsRoot)

  const collider = findObject3DByName<Mesh>(
    visualsRoot,
    'hero-ability-collider'
  )
  visualsRoot.collider = collider

  const colliderMaterial = collider.material as Material
  colliderMaterial.side = DoubleSide

  modify3DObjects<Mesh>(visualsRoot, 'hero-ability-mana-gem', mesh => {
    mesh.userData.isFrontFacing = true
  })

  const highlight: Mesh = findObject3DByName(
    visualsRoot,
    'hero-ability-highlight'
  )

  if (highlight.material instanceof Material) {
    highlight.material = highlight.material.clone()
  }

  visualsRoot.traverse(obj => {
    if (obj.userData.isFrontFacing) {
      obj.visible = false
    }
  })

  // changeFrameRarity(visualsRoot, 'base', false, true, true)

  return { visualsRoot, highlight, collider }
}

export const createEventCardFrontInteractives: InteractivesFactoryMethod =
  card => {
    const { visualsRoot, highlight, collider } =
      createEventCardBackInteractives()

    const cardView = card.state.view

    const heroAbilityPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesGraphical'),
      `card-hero-ability-art`
    )

    const heroAbilityFillerPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesGraphical'),
      `card-hero-ability-filler`
    )
    const frontFace: Mesh = heroAbilityPrototype.clone(true)
    const frontFaceFiller: Mesh = heroAbilityFillerPrototype.clone(true)
    frontFaceFiller.material = getAdditiveFillerMaterial(
      getHeroAbilityAccentColorPrealphad(card.base, 0.12)
    )

    frontFace.scale.multiplyScalar(0.352)
    frontFace.rotation.x = Math.PI * -0.5
    frontFace.position.x += 0.00005
    frontFace.position.y += 0.00075
    frontFace.position.z += 0.0025

    frontFace.renderOrder = RENDER_ORDERS.cardArt
    frontFace.userData.isFrontFacing = true

    const assetName = getCardAssetString(card)
    const assetUrl = assetName.startsWith('blob:')
      ? assetName
      : `game/cards/art-full/spells/${assetName}.png`

    const assetBlurredUrl = assetUrl
      .replace('cards/art-full/spells', 'cards/art-full/bgs')
      .replace('.png', '-blurred.png')

    const cardArtCopy = setupCardArt(
      cameraShaker.camera,
      frontFace,
      COLOR_HERO_ABILITY,
      cardView.type,
      assetBlurredUrl,
      assetUrl,
      undefined,
      undefined,
      queryParams.heroAbilityRarity as Rarity,
      'token',
      getHeroAbilityAccentColor(card.base)
    )
    visualsRoot.add(cardArtCopy)
    visualsRoot.add(frontFaceFiller)
    copyTransform(frontFaceFiller, frontFace)
    frontFaceFiller.position.y += 0.00005

    const hijackedText = checkForHijackedCardText(card)

    const name = hijackedText ? hijackedText[0] : 'event name'

    /// Name
    const textName = addText(
      visualsRoot,
      name,
      textOptions.heroAbilityName,
      0,
      TEXT_DEPTH,
      0.001 - 0.0011
    )
    textName.name = 'textName'

    /// Name
    const textNameShadow = addText(
      visualsRoot,
      name,
      textOptions.heroAbilityNameShadow,
      0,
      TEXT_DEPTH,
      0.00036 - 0.0011
    )
    textNameShadow.name = 'shadowName'
    textName.attach(textNameShadow)
    textName.position.z -= 0.001

    modify3DObjects<Mesh>(visualsRoot, 'hero-ability-mana-gem', mesh => {
      mesh.parent!.remove(mesh)
    })

    const segments: CardDescriptionTextSegment[] = [
      {
        text: hijackedText ? hijackedText[1] : 'event description',
        color: 'white'
      }
    ]

    let traitBadges: Object3D | undefined

    let resizeAttempts = 4
    function onDescriptionMeasurementsDoUpdateTraits(tm: TextMesh) {
      let rows = 0
      const max = 0.018
      const b = 0.0055
      const h = tm.height === Infinity ? 0 : tm.height
      if (h + b + b + b < max) {
        rows = 3
      } else if (h + b + b < max) {
        rows = 2
      } else {
        rows = 1
      }
      rows = Math.min(Math.ceil(cardView.traits.length / 2), rows)
      const bh = b * rows

      if (tm.height > __maxDescriptionHeight - bh && resizeAttempts > 0) {
        resizeAttempts--
        tm.options.size *= 0.9
        tm.updateGeometry(true)
        return
      }
      let inherettedVisibility = true
      if (traitBadges) {
        visualsRoot.remove(traitBadges)
        traitBadges.traverse(obj => {
          if (obj.userData.isFrontFacing && !obj.visible) {
            inherettedVisibility = false
          }
        })
        traitBadges = undefined
      }
      traitBadges = makeTraitBadgeHolder(cardView.traits, rows, !tm.isEmpty)
      if (traitBadges) {
        traitBadges.position.z = 0.0115
        traitBadges.scale.multiplyScalar(0.352)
        traitBadges.position.y = 0.001
        tm.position.z = lerp(
          traitBadges.position.z - 0.0025 + bh + h * 0.5,
          0.021,
          0.5
        )
        visualsRoot.add(traitBadges)
        traitBadges.traverse(obj => {
          obj.visible = inherettedVisibility
          obj.userData.isFrontFacing = true
        })
        traitBadges.position.z += NUDGE_UP
      }
      tm.position.z += NUDGE_UP
    }
    /// Card text
    const descriptionText = addText(
      visualsRoot,
      segments,
      { ...textOptions.cardHeroAbilityDescription },
      0,
      TEXT_DEPTH,
      0.017,
      undefined,
      undefined,
      undefined,
      undefined,
      onDescriptionMeasurementsDoUpdateTraits
    )
    onDescriptionMeasurementsDoUpdateTraits(descriptionText)

    if (globalAccess.compositeMode === 'streamer') {
      descriptionText.parent?.remove(descriptionText)
    }

    const labelString = 'Event'

    const detailBannerLabel = addText(
      visualsRoot,
      labelString,
      textOptions.cardDetailLabel,
      0,
      TEXT_DEPTH,
      0.0037
    )
    detailBannerLabel.name = 'detailBannerLabel'

    visualsRoot.traverse(obj => {
      if (obj.userData.isFrontFacing) {
        obj.visible = false
      }
    })

    return { visualsRoot, highlight, collider }
  }

function fancyPulseEase(v: number) {
  return 1 - Math.min(Easing.Quartic.Out(v), 1 - Easing.Exponential.Out(v))
}

const CommonEventCardAssemblage = () => {
  const components: Array<Component<any>> = [new OrderComponent(0)]

  const interactiveIndicatorsComponent = new InteractiveIndicatorsComponent()
  interactiveIndicatorsComponent.value.selectedState.easing = fancyPulseEase
  components.push(interactiveIndicatorsComponent)

  const transformComponent = new TransformComponent()
  components.push(transformComponent)

  components.push(new ZoneComponent())

  return components
}

const EventCardAssemblage = (card: RelaxedCardInstance | undefined) => {
  const components = CommonEventCardAssemblage()

  components.push(
    new CardComponent(),
    new FrameStyleComponent(card?.state.view.rarity || 'base'),
    new EventCardComponent()
  )

  if (card) {
    components.push(new CardInstanceComponent(card))
  }

  return components
}

export default EventCardAssemblage
