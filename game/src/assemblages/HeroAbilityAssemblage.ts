import { i18n, TFunction, translate } from '@opensky/language-manager'
import {
  CardDescriptionTextSegment,
  getParsedCardDescription,
  getTextSegmentsFromDescription
} from '@opensky/parse-card-description'
import { DeckClass } from '@opensky/proto'
import { getDeckClassByAbilityBaseCard } from '@opensky/shared/constants'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { lerp } from '@opensky/shared/utils/math'
import { BaseCard, CardLibrary, Rarity } from '@skyweaver/state-metadata'
import { DoubleSide, Material, Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_HERO_ABILITY } from '~/colors/colorLibrary'
import { manaCostCompositeNudge, RENDER_ORDERS } from '~/constants'
import { setupCardArt } from '~/helpers/cardArtHelpers'
import { checkForHijackedCardText } from '~/helpers/cardTextHijacker'
import { createSyntheticHeroAbilityChargesData } from '~/helpers/createSyntheticHeroAbilityChargesData'
import { createSyntheticHeroAbilityCountersData } from '~/helpers/createSyntheticHeroAbilityCountersData'
import { getAdditiveFillerMaterial } from '~/helpers/getAdditiveFillerMaterial'
import { getHeroAbilityMeta } from '~/helpers/getHeroAbilityMeta'
import {
  getHeroAbilityAccentColor,
  getHeroAbilityAccentColorPrealphad
} from '~/helpers/heroAbilityAccentColorsLib'
import { makeTraitBadgeHolder } from '~/helpers/traitHelpers'
import { getCardAssetString } from '~/materials'
import InteractiveObject3D from '~/meshes/InteractiveObject3D'
import queryParams from '~/queryParams'
import { store } from '~/state'
import TextMesh from '~/systems/text/TextMesh'
import {
  makeCostNumberEffect,
  makeCostNumberShadowEffect,
  makeNullEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import { cameraShaker } from '~/utils/cameraShaker'
import { shouldShowManaGem } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import {
  Interactives,
  InteractivesFactoryMethod
} from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { addDynamicText, addText } from '~/utils/textUtils'
import { findObject3DByName, modify3DObjects } from '~/utils/threeUtils'
import { copyTransform } from '~/utils/transformUtils'

const TEXT_DEPTH = 0.0008
const NUDGE_UP = -0.0015
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

function createHeroAbilityBackInteractives(): Interactives {
  const visualsRoot = new InteractiveObject3D(
    getAssetsManager().fetchMeshDeepClone('gamePiecesPhysical', 'hero-ability')
  )

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

  return { visualsRoot, highlight, collider }
}

export const createHeroAbilityFrontInteractives: InteractivesFactoryMethod = (
  card,
  owner
) => {
  const { visualsRoot, highlight, collider } =
    createHeroAbilityBackInteractives()

  const cardView = card.state.view

  const heroAbilityMeta = getHeroAbilityMeta(cardView)

  const tags: string[] = []
  if (heroAbilityMeta.hasCounters) {
    tags.push('footer')
  }
  if (heroAbilityMeta.hasCharges) {
    tags.push('charges')
  }

  const graphicalAssetName = `card-hero-ability${
    tags.length > 0 ? '-with-' + tags.join('-and-') : ''
  }-art`

  const heroAbilityWithCountersPrototype = findObject3DByName<Mesh>(
    getAssetsManager().getAsset('gamePiecesGraphical'),
    graphicalAssetName
  )

  const heroAbilityFillerPrototype = findObject3DByName<Mesh>(
    getAssetsManager().getAsset('gamePiecesGraphical'),
    `card-hero-ability-filler${
      heroAbilityMeta.hasCharges ? '-with-charges' : ''
    }`
  )
  const frontFace: Mesh = heroAbilityWithCountersPrototype.clone(true)
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

  const name = hijackedText ? hijackedText[0] : translate.card.name(card.base)

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

  if (globalAccess.compositeMode === 'streamer') {
    textName.parent?.remove(textName)
    textNameShadow.parent?.remove(textNameShadow)
  }

  if (shouldShowManaGem(card)) {
    /// Mana Cost
    for (const layer of textCostLayerParams) {
      const effect = layer.effect((CardLibrary.get(card.base) || cardView).cost)
      const textCost = addDynamicText(
        visualsRoot,
        cardView,
        'cost',
        layer.style,
        -0.02285 + manaCostCompositeNudge.x + 0.0035,
        0.0021 + layer.zo,
        -0.0326 + layer.yo + manaCostCompositeNudge.y + 0.00275,
        effect
      )
      textCost.name = 'textCost'

      if (globalAccess.compositeMode === 'streamer') {
        textCost.parent?.remove(textCost)
      }
    }
  } else {
    modify3DObjects<Mesh>(visualsRoot, 'hero-ability-mana-gem', mesh => {
      mesh.parent!.remove(mesh)
    })
  }
  const segments = hijackedText
    ? [
        {
          text: hijackedText[1],
          color: 'white'
        }
      ]
    : cardTextOrDefault(
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

  if (heroAbilityMeta.hasCharges) {
    /// Charges
    const heroAbilityCharges = createSyntheticHeroAbilityChargesData(
      visualsRoot,
      cardView
    )

    for (const layer of [
      {
        style: textOptions.heroAbilityCounter,
        zo: 0.0002,
        yo: 0,
        effect: makeNullEffect
      },
      {
        style: textOptions.heroAbilityCounterShadow,
        zo: 0,
        yo: -0.001,
        effect: makeNullEffect
      }
    ]) {
      const textCharges = addDynamicText(
        visualsRoot,
        heroAbilityCharges,
        'summary',
        layer.style,
        0.00895 + 0.01,
        0.001 + layer.zo,
        -0.00575 + layer.yo - 0.0235,
        layer.effect()
      )
      const originalX = textCharges.position.x
      const budge = () => {
        textCharges.position.x =
          originalX + (textCharges.text === '⧁' ? 0.0004 : 0)
      }
      textCharges.onMeasurementsUpdated = budge
      budge()
      textCharges.name = 'textCharges'
    }
  }

  if (heroAbilityMeta.hasCounters) {
    /// Counters
    const heroAbilityCounters = createSyntheticHeroAbilityCountersData(
      visualsRoot,
      cardView
    )

    for (const layer of [
      {
        style: textOptions.heroAbilityCounter,
        zo: 0.0002,
        yo: 0,
        effect: makeNullEffect
      },
      {
        style: textOptions.heroAbilityCounterShadow,
        zo: 0,
        yo: -0.001,
        effect: makeNullEffect
      }
    ]) {
      const textCounters = addDynamicText(
        visualsRoot,
        heroAbilityCounters,
        'summary',
        layer.style,
        0,
        0.001 + layer.zo,
        0.0077 + layer.yo + 0.021,
        layer.effect()
      )
      textCounters.name = 'textCounters'
    }
  }

  let labelString = ''

  const ownerPrisms = store.state?.state.players[owner].prisms
  const fallbackDeckClass = getDeckClassByAbilityBaseCard(card.base) //for outside of games, like cardCompositor
  //Ruffian, for Gerry the Goon
  if (card.base === '25005') {
    labelString = i18n.t(`cardMeta:heroAbilityCardLabel.GERRY`)
  } else if (ownerPrisms) {
    const deckClass = prismsToDeckClass(ownerPrisms)
    const heroName = DECKCLASS_HEROES[deckClass]
    labelString = i18n.t(`cardMeta:heroAbilityCardLabel.${heroName}`)
  } else if (fallbackDeckClass !== DeckClass.UNKNOWN_CLASS) {
    const heroName = DECKCLASS_HEROES[fallbackDeckClass]
    labelString = i18n.t(`cardMeta:heroAbilityCardLabel.${heroName}`)
  } else {
    labelString = i18n.t('cardMeta:heroAbilityCardLabel.UNKNOWN')
  }

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

function cardTextOrDefault(
  cardDescription: string,
  getCardName: (cardId: string) => string,
  t: TFunction
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
