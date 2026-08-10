import { i18n, translate } from '@opensky/language-manager'
import {
  CardDescriptionTextSegment,
  getParsedCardDescription,
  getTextSegmentsFromDescription
} from '@opensky/parse-card-description'
import { lerp } from '@opensky/shared/utils/math'
import {
  BaseCard,
  CardLibrary,
  isCharacter,
  isHero,
  isHeroAbility
} from '@skyweaver/state-metadata'
import { Component, Entity } from 'gg'
import { DoubleSide, Material, Mesh, Object3D, Vector3 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { Components } from '~/components'
import CardComponent from '~/components/CardComponent'
import CardInstanceComponent, {
  RelaxedCardInstance
} from '~/components/CardInstanceComponent'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import HeroComponent from '~/components/HeroComponent'
import InteractiveIndicatorsComponent from '~/components/InteractiveIndicatorsComponent'
import OrderComponent from '~/components/OrderComponent'
import ParallaxValueComponent from '~/components/ParallaxValueComponent'
import TransformComponent from '~/components/TransformComponent'
import ZoneComponent from '~/components/ZoneComponent'
import { manaCostCompositeNudge } from '~/constants'
import { managePrismGems } from '~/helpers/prismGems'
import { makeTraitBadgeHolder } from '~/helpers/traitHelpers'
import IconIndicator from '~/meshes/IconIndicator'
import InteractiveObject3D from '~/meshes/InteractiveObject3D'
import { accountsStore } from '~/state/AccountStore'
import { Easing } from '~/systems/animation/Easing'
import TextMesh from '~/systems/text/TextMesh'
import {
  makeAttackHealthNumberEffect,
  makeCostNumberEffect,
  makeCostNumberShadowEffect,
  makeNullEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import { shouldShowManaGem } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import {
  Interactives,
  InteractivesFactoryMethod
} from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { cardTypeSymbols, elementSymbols } from '~/utils/symbolLibs'
import { addDynamicText, addText } from '~/utils/textUtils'
import { findObject3DByName, modify3DObjects } from '~/utils/threeUtils'

import { getPrismsForCard } from './getPrismsForCard'

const TEXT_DEPTH = 0.0008
const UNDER_ICONS_DEPTH = -0.0005

const __maxDescriptionHeight = 0.017
const textCostLayerParams = [
  {
    style: textOptions.cardManaCost,
    zo: 0.0002,
    yo: 0,
    effect: makeCostNumberEffect
  },
  {
    style: textOptions.cardManaCostShadow,
    zo: 0,
    yo: -0.00135,
    effect: makeCostNumberShadowEffect
  }
]

export function createCardBackInteractives(): Interactives {
  const visualsRoot = new InteractiveObject3D(
    getAssetsManager().fetchMeshDeepClone('gamePiecesPhysical', 'card')
  )

  const s = 0.95
  visualsRoot.scale.set(s, s, s)
  registerMeshesToLCMaterials(visualsRoot)

  const collider = findObject3DByName<Mesh>(visualsRoot, 'card-collider')
  visualsRoot.collider = collider

  const colliderMaterial = collider.material as Material
  colliderMaterial.side = DoubleSide

  modify3DObjects<Mesh>(visualsRoot, 'card-mana-gem', mesh => {
    mesh.userData.isFrontFacing = true
  })

  const highlight: Mesh = findObject3DByName(visualsRoot, 'card-highlight')

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

export const createCardFrontInteractives: InteractivesFactoryMethod = (
  card,
  owner
) => {
  const { visualsRoot, highlight, collider } = createCardBackInteractives()

  const name =
    isHero(card) && accountsStore.accounts
      ? accountsStore.accounts[owner].name
      : translate.card.name(card.base)

  /// Name
  const textName = addText(
    visualsRoot,
    name,
    textOptions.cardName,
    0,
    TEXT_DEPTH,
    0.001
  )
  textName.name = 'textName'

  /// Name
  const textNameShadow = addText(
    visualsRoot,
    name,
    textOptions.cardNameShadow,
    0,
    TEXT_DEPTH,
    0.00012
  )
  textNameShadow.name = 'shadowName'
  textName.attach(textNameShadow)
  textName.position.z -= 0.001

  if (globalAccess.compositeMode === 'streamer') {
    textName.parent?.remove(textName)
    textNameShadow.parent?.remove(textNameShadow)
  }

  if (shouldShowManaGem(card)) {
    /// Mana Cost
    for (const layer of textCostLayerParams) {
      const effect = layer.effect(
        (CardLibrary.get(card.base) || card.state.view).cost
      )
      const textCost = addDynamicText(
        visualsRoot,
        card.state.view,
        'cost',
        layer.style,
        -0.02285 + manaCostCompositeNudge.x,
        0.0021 + layer.zo,
        -0.0326 + layer.yo + manaCostCompositeNudge.y,
        effect
      )
      textCost.name = 'textCost'

      if (globalAccess.compositeMode === 'streamer') {
        textCost.parent?.remove(textCost)
      }
    }
  } else {
    modify3DObjects<Mesh>(visualsRoot, 'card-mana-gem', mesh => {
      mesh.parent!.remove(mesh)
    })
  }
  if (!isHero(card)) {
    const segments = cardTextOrDefault(
      translate.card.description(card.base),
      id => translate.card.name(`${id}` as BaseCard),
      i18n.t
    )

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
      rows = Math.min(Math.ceil(card.state.view.traits.length / 2), rows)
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
      traitBadges = makeTraitBadgeHolder(
        card.state.view.traits,
        rows,
        !tm.isEmpty
      )
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
      }
    }
    /// Card text
    const descriptionText = addText(
      visualsRoot,
      segments,
      { ...textOptions.cardDescription },
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
  }
  if (!isHeroAbility(card)) {
    const eyecon = new IconIndicator('eye')
    eyecon.name = 'icon-eye'
    eyecon.rotateX(0.5 * Math.PI)
    eyecon.scale.multiplyScalar(0.03)
    eyecon.position.add(new Vector3(-0.02, 0.003, -0.024))
    eyecon.visible = false
    visualsRoot.add(eyecon)
  }

  if (isCharacter(card)) {
    for (const layer of [
      {
        style: textOptions.cardUnitAttackHealth,
        zo: 0.0002,
        yo: 0,
        effect: makeAttackHealthNumberEffect
      },
      {
        style: textOptions.cardUnitAttackHealthShadow,
        zo: 0,
        yo: -0.0015,
        effect: makeNullEffect
      }
    ]) {
      /// Attack
      const textPower = addDynamicText(
        visualsRoot,
        card.state.view,
        'power',
        layer.style,
        -0.0098,
        TEXT_DEPTH + layer.zo + UNDER_ICONS_DEPTH,
        0.0345 + layer.yo,
        layer.effect(
          (CardLibrary.get(card.base) || card.state.view).power as number
        )
      )
      textPower.name = 'textPower'

      /// Health
      const textHealth = addDynamicText(
        visualsRoot,
        card.state.view,
        'health',
        layer.style,
        0.0099,
        TEXT_DEPTH + layer.zo + UNDER_ICONS_DEPTH,
        0.0345 + layer.yo,
        layer.effect(
          (CardLibrary.get(card.base) || card.state.view).health as number
        )
      )
      textHealth.name = 'textHealth'
    }
  }

  const element = card.state.view.element
  if (element !== 'sky') {
    const cardType = card.state.view.type
    const elementString = i18n.t(`cardMeta:elements.uppercase.${element}`)
    const translatedTypeString = i18n.t(`cardMeta:type.${cardType}`)

    const labelString = `${elementSymbols[element] + elementString} ${
      cardTypeSymbols[cardType] + translatedTypeString
    }`

    const detailBannerLabel = addText(
      visualsRoot,
      labelString,
      textOptions.cardDetailLabel,
      0,
      TEXT_DEPTH,
      0.0055
    )
    detailBannerLabel.name = 'detailBannerLabel'
  } else {
    //TODO: add correct translated string
    const labelString = 'Hero Ability'

    const detailBannerLabel = addText(
      visualsRoot,
      labelString,
      textOptions.cardDetailLabel,
      0,
      TEXT_DEPTH,
      0.0055
    )
    detailBannerLabel.name = 'detailBannerLabel'
  }
  if (!isHeroAbility(card)) {
    const prisms = getPrismsForCard(card, owner)
    managePrismGems(visualsRoot, prisms)
  }

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

export const CommonCardAssemblage = () => {
  const components: Array<Component<any>> = [new OrderComponent(0)]

  const interactiveIndicatorsComponent = new InteractiveIndicatorsComponent()
  interactiveIndicatorsComponent.value.selectedState.easing = fancyPulseEase
  components.push(interactiveIndicatorsComponent)

  const transformComponent = new TransformComponent()
  components.push(transformComponent)

  components.push(new ZoneComponent())

  return components
}

const CardAssemblage = (card: RelaxedCardInstance | undefined) => {
  const components = CommonCardAssemblage()

  components.push(
    new CardComponent(),
    new FrameStyleComponent(card?.state.view.rarity || 'base')
  )

  if (card) {
    components.push(new CardInstanceComponent(card))
    if (isHero(card)) {
      components.push(new HeroComponent())
    } else {
      components.push(
        new ParallaxValueComponent(
          1,
          card?.state.view.rarity || 'base',
          card.state.view.type === 'spell'
        )
      )
    }
  }

  return components
}

const cardDataTextMesheNames = ['textCost', 'textPower', 'textHealth']

export const toggleCardBase = (
  entity: Entity<Components>,
  useBase: boolean
) => {
  const isACharacterLeavingField =
    entity.has('character') && entity.get('zone').current.cardStatus !== 'Field'

  if (
    entity.has('cardInstance') &&
    entity.has('mesh') &&
    !isACharacterLeavingField
  ) {
    const card = entity.get('cardInstance')
    const visualsRoot = entity.get('mesh')
    const base = CardLibrary.get(card.base)
    visualsRoot.traverse(child => {
      if (
        cardDataTextMesheNames.includes(child.name) &&
        child instanceof TextMesh
      ) {
        child.changeLiveProp(
          useBase ? base || card.state.view : card.state.view
        )
      }
    })
  }
}

export default CardAssemblage

function cardTextOrDefault(
  cardDescription: string,
  getCardName: (cardId: string) => string,
  t: (typeof i18n)['t']
): CardDescriptionTextSegment[] {
  try {
    return getTextSegmentsFromDescription(
      getParsedCardDescription(cardDescription, getCardName, t)
    )
  } catch (err) {
    return [
      {
        text: 'invalid card text\n',
        color: 'red'
      },
      {
        text: cardDescription,
        color: 'white'
      }
    ]
  }
}
