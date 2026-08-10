import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { CardLibrary } from '@skyweaver/state-metadata'
import { Material, Mesh, Texture } from 'three'

import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import queryParams from '~/queryParams'
import { getAttachedManaGemOffset } from '~/systems/AttachmentSystem'
import {
  makeCostNumberEffect,
  makeCostNumberShadowEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import { shouldShowManaGem } from '~/utils/card'
import { InteractivesFactoryMethod } from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { addDynamicText } from '~/utils/textUtils'
import { findObject3DByName, modify3DObjects } from '~/utils/threeUtils'

import { getAssetsManager } from '../assets'
import { RENDER_ORDERS, SIZE_RATIO_CARD_TO_ATTACHMENT } from '../constants'
import { getCardAssetString } from '../materials'

let spellPrototype: Mesh

function getSpellPrototype() {
  if (spellPrototype === undefined) {
    spellPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesPhysical'),
      'attached-spell'
    )
  }
  return spellPrototype
}

let enchantmentPrototype: Mesh
function getEnchantmentPrototype() {
  if (enchantmentPrototype === undefined) {
    enchantmentPrototype = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gamePiecesPhysical'),
      'attached-enchantment'
    )
  }
  return enchantmentPrototype
}

export const createAttachedSpellInteractives: InteractivesFactoryMethod =
  card => {
    const isEnchant = CardLibrary.get(card.base)?.type === 'enchant'
    const prefix = isEnchant ? 'enchantment' : 'spell'
    const visualsRoot = (
      isEnchant ? getEnchantmentPrototype : getSpellPrototype
    )().clone(true)

    registerMeshesToLCMaterials(visualsRoot)

    visualsRoot.userData.isFrontFacing = true

    const collider: Mesh = findObject3DByName(visualsRoot, prefix + '-collider')
    collider.userData.isFrontFacing = true
    const frontFace: Mesh = findObject3DByName(visualsRoot, prefix + '-art')
    frontFace.renderOrder = RENDER_ORDERS.cardArt
    const assetName = getCardAssetString(card)
    const assetUrl = assetName.startsWith('blob:')
      ? assetName
      : `game/cards/art-full/spells/${assetName}.png`
    const material = new BasicMapMeshMaterial({ map: getTempTexture() })
    frontFace.material = material
    async function loadRealArt() {
      await getAssetsManager()
        .loadAsset('spellLoading')
        .then(() => {
          const texture = getAssetsManager().getAsset('spellLoading')
          material.texture = texture
        })

      material.texture = (await getAssetsManager().load(
        'textureSmall',
        assetUrl
      )) as Texture
      safelyResetFlipY(material.texture)
    }
    loadRealArt()

    if (shouldShowManaGem(card)) {
      const manaGem = findObject3DByName(visualsRoot, prefix + '-mana-gem')
      manaGem.position.copy(
        getAttachedManaGemOffset(isEnchant ? 'enchant' : 'spell', 'topLeft')
      )
      const s = 1 / manaGem.scale.x
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
          0,
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
    } else {
      modify3DObjects<Mesh>(visualsRoot, prefix + '-mana-gem', mesh => {
        mesh.parent!.remove(mesh)
      })
    }

    const highlight: Mesh = findObject3DByName(
      visualsRoot,
      prefix + '-highlight'
    )
    if (highlight.material instanceof Material) {
      highlight.material = highlight.material.clone()
    }

    highlight.renderOrder = RENDER_ORDERS.traits + 1

    if (queryParams.attachmentShadows) {
      const shadowMesh = getAssetsManager().fetchMeshDeepClone(
        'gamePiecesGraphical',
        'zShadow-circle',
        undefined,
        true
      ) as Mesh
      if (shadowMesh.material instanceof Material) {
        shadowMesh.material = shadowMesh.material.clone()
      }
      // shadowMesh.position.copy(damageText.position)
      const s = 1
      shadowMesh.scale.set(s, s, s)
      shadowMesh.frustumCulled = false
      shadowMesh.renderOrder = highlight.renderOrder = RENDER_ORDERS.traits - 1
      visualsRoot.add(shadowMesh)
    }

    visualsRoot.traverse(obj => {
      if (obj.userData.isFrontFacing) {
        obj.visible = false
      }
    })
    visualsRoot.scale.multiplyScalar(SIZE_RATIO_CARD_TO_ATTACHMENT)

    return { visualsRoot, highlight, collider }
  }
