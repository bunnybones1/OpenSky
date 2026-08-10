import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { CardLibrary, Rarity } from '@skyweaver/state-metadata'
import { Group, Material, Mesh } from 'three'

import { COLOR_HERO_ABILITY } from '~/colors/colorLibrary'
import { setupCardArt } from '~/helpers/cardArtHelpers'
import { createSyntheticHeroAbilityChargesData } from '~/helpers/createSyntheticHeroAbilityChargesData'
import { createSyntheticHeroAbilityCountersData } from '~/helpers/createSyntheticHeroAbilityCountersData'
import { getHeroAbilityMeta } from '~/helpers/getHeroAbilityMeta'
import { getHeroAbilityAccentColor } from '~/helpers/heroAbilityAccentColorsLib'
import BasicColorProgressBarMeshMaterial from '~/materials/BasicColorProgressBarMeshMaterial'
import queryParams from '~/queryParams'
import { getAttachedManaGemOffset } from '~/systems/AttachmentSystem'
import {
  makeCostNumberEffect,
  makeCostNumberShadowEffect,
  makeNullEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { cameraShaker } from '~/utils/cameraShaker'
import { shouldShowManaGem } from '~/utils/card'
import { InteractivesFactoryMethod } from '~/utils/helpers/InteractivesHelpers'
import { addDynamicText } from '~/utils/textUtils'
import { findObject3DByName } from '~/utils/threeUtils'
import { copyTransform } from '~/utils/transformUtils'

import { getAssetsManager } from '../assets'
import { RENDER_ORDERS, SIZE_RATIO_CARD_TO_ATTACHMENT } from '../constants'
import { getCardAssetString } from '../materials'

let heroAbilityPrototype: Mesh

function getHeroMiniAbilityPrototype() {
  if (heroAbilityPrototype === undefined) {
    heroAbilityPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesPhysical'),
      'hero-mini-ability'
    )
  }
  return heroAbilityPrototype
}

let progressBarPrototype: Mesh

function getHeroMiniAbilityProgressBarPrototype() {
  if (progressBarPrototype === undefined) {
    progressBarPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesGraphical'),
      'card-hero-ability-mini-progress-bar'
    )
  }
  return progressBarPrototype
}

export const createHeroMiniAbilityInteractives: InteractivesFactoryMethod =
  card => {
    const spellVisualsRoot = getHeroMiniAbilityPrototype().clone(true)
    spellVisualsRoot.userData.isFrontFacing = true
    const visualsRoot = new Group()
    const collider: Mesh = findObject3DByName(
      spellVisualsRoot,
      'hero-mini-ability-collider'
    )
    collider.userData.isFrontFacing = true
    visualsRoot.add(collider)

    const cardView = card.state.view
    const heroAbilityMeta = getHeroAbilityMeta(cardView)

    const tags: string[] = []
    if (heroAbilityMeta.hasCounters) {
      tags.push('footer')
    }
    if (heroAbilityMeta.hasCharges) {
      tags.push('charges')
    }

    const graphicalAssetName = `card-hero-ability-mini${
      tags.length > 0 ? '-with-' + tags.join('-and-') : ''
    }-art`

    const heroAbilityWithCountersPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesGraphical'),
      graphicalAssetName
    )
    const frontFace: Mesh = heroAbilityWithCountersPrototype.clone(true)
    frontFace.rotation.x -= Math.PI / 2
    frontFace.scale.multiplyScalar(0.7)

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
      card.state.view.type,
      assetBlurredUrl,
      assetUrl,
      undefined,
      undefined,
      queryParams.heroAbilityRarity as Rarity,
      'token',
      getHeroAbilityAccentColor(card.base)
    )
    cardArtCopy.scale.multiplyScalar(1 / 2.5)
    visualsRoot.add(cardArtCopy)

    if (shouldShowManaGem(card)) {
      const manaGem = findObject3DByName(
        spellVisualsRoot,
        'hero-mini-ability-mana-gem'
      )
      visualsRoot.add(manaGem)
      manaGem.position.copy(getAttachedManaGemOffset('heroAbility', 'topLeft'))
      const s = (1 / manaGem.scale.x) * 0.8
      const costTexts = [
        {
          style: textOptions.attachedSpellManaCost,
          yo: 0.0004,
          zo: 0.0001,
          effect: makeCostNumberEffect
        },
        {
          style: textOptions.attachedSpellManaCostShadow,
          yo: 0.0004,
          zo: -0.0008,
          effect: makeCostNumberShadowEffect
        }
      ].map(layer => {
        /// ManaCost

        const m = addDynamicText(
          manaGem,
          card.state.view,
          'cost',
          layer.style,
          0.0001,
          layer.yo * s,
          (-0.0007 + layer.zo) * s,
          layer.effect(
            (CardLibrary.get(card.base) || card.state.view).cost as number
          )
        )
        m.scale.setScalar(s)
        return m
        // m.rotation.x += Math.PI
      })
      costTexts[0].attach(costTexts[1])
      listenToProperty(card.state.view, 'cost', () => {
        const cost = (CardLibrary.get(card.base) || card.state.view).cost
        costTexts[0].scale.setScalar(s * (cost === 'X' ? 0.85 : 1))
      })
    }

    if (heroAbilityMeta.hasCharges) {
      /// Charges

      const heroAbilityCharges = createSyntheticHeroAbilityChargesData(
        visualsRoot,
        cardView
      )
      for (const layer of [
        {
          style: textOptions.heroAbilityMiniCounter,
          zo: 0.0002,
          yo: 0,
          effect: makeNullEffect
        },
        {
          style: textOptions.heroAbilityMiniCounterShadow,
          zo: 0,
          yo: -0.0007,
          effect: makeNullEffect
        }
      ]) {
        const textCharges = addDynamicText(
          visualsRoot,
          heroAbilityCharges,
          'summary',
          layer.style,
          0.00825,
          0.0001 + layer.zo,
          -0.0053 + layer.yo,
          layer.effect()
        )
        const originalX = textCharges.position.x
        const budge = () => {
          textCharges.position.x =
            originalX + (textCharges.text === '⧁' ? 0.00025 : 0)
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
          style: textOptions.heroAbilityMiniCounter,
          zo: 0.0002,
          yo: 0,
          effect: makeNullEffect
        },
        {
          style: textOptions.heroAbilityMiniCounterShadow,
          zo: 0,
          yo: -0.00075,
          effect: makeNullEffect
        }
      ]) {
        const textCounters = addDynamicText(
          visualsRoot,
          heroAbilityCounters,
          'summary',
          layer.style,
          0,
          0.0001 + layer.zo,
          0.0073 + layer.yo,
          layer.effect()
        )
        textCounters.name = 'textCounters'
      }

      const progressBar = getHeroMiniAbilityProgressBarPrototype().clone()
      const progMat = (progressBar.material as Material).clone()
      progressBar.material = progMat
      if (progMat instanceof BasicColorProgressBarMeshMaterial) {
        const animProg = new AnimatedNumber(v => (progMat.progress = v))
        listenToProperty(
          heroAbilityCounters,
          'progressRatio',
          v => (animProg.value = v)
        )
      }
      visualsRoot.add(progressBar)
      copyTransform(progressBar, cardArtCopy)
      progressBar.position.y += 0.00005
    }

    const highlight: Mesh = findObject3DByName(
      spellVisualsRoot,
      'hero-mini-ability-highlight'
    )
    visualsRoot.add(highlight)
    if (highlight.material instanceof Material) {
      highlight.material = highlight.material.clone()
    }

    highlight.renderOrder = RENDER_ORDERS.traits + 1

    // visualsRoot.traverse(obj => {
    //   if (obj.userData.isFrontFacing) {
    //     obj.visible = false
    //   }
    // })
    visualsRoot.scale.multiplyScalar(SIZE_RATIO_CARD_TO_ATTACHMENT)

    return { visualsRoot, highlight, collider }
  }
