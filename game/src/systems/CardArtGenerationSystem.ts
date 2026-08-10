import { isHero } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'
import { Mesh } from 'three'

import { getPrismsForCard } from '~/assemblages/getPrismsForCard'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import { foilContextFromStatus } from '~/foils/FoilKitTypeHelpers'
import { cardArtTypes, setupCardArt } from '~/helpers/cardArtHelpers'
import {
  visibleArtCards,
  visibleCardsHostingAttachment,
  visibleCardsNotHostingAttachment
} from '~/helpers/compoundCollections'
import { shouldBeBackless } from '~/helpers/shouldBeBackless'
import {
  getBGAtlasKey,
  getCardAssetString,
  getCardFgUrlFromAsset
} from '~/materials'
import { store } from '~/state/index'
import { useCustomHeroCards } from '~/tempDesignOptions'
import { cameraShaker } from '~/utils/cameraShaker'
import { changeFrameRarity } from '~/utils/changeFrameRarity'
import {
  findObject3DsWhoseNamesInclude,
  maybeFindObject3DByName
} from '~/utils/threeUtils'

import TextMesh from './text/TextMesh'

export default class CardArtGenerationSystem extends System<Components> {
  init() {
    visibleArtCards.listenForAdd(entity => {
      if (
        entity.has('zone') &&
        entity.get('zone').current.cardStatus === 'Dust'
      ) {
        return
      }
      const card = entity.get('cardInstance')
      const artType = cardArtTypes[card.state.view.type]
      const assetName = getCardAssetString(card)
      const bgUrl = `game/cards/art-full/bgs/${getBGAtlasKey(card)}.png`
      const hero = isHero(card)
      const owner = entity.has('player') ? store.player! : 1 - store.player!

      const fgUrl = getCardFgUrlFromAsset(assetName, card.state.view.type)

      //'agy' | 'hrt' | 'int' | 'str' | 'wis' | 'tok'
      let prism = getPrismsForCard(card, owner)[0]
      if (prism === 'tut') {
        prism = 'tok'
      }
      const hasAttachment =
        entity.has('hostingAttachment') || entity.has('fakeHasAttachment')
      const cardArtMeshName =
        hero && useCustomHeroCards.value
          ? 'card-hero-art'
          : `card-${artType}${hasAttachment ? '-with-attachment' : ''}${
              artType !== 'unit' && prism === 'tok' ? '-prismless' : ''
            }-art`
      const cardArt = maybeFindObject3DByName<Mesh>(
        getAssetsManager().getAsset('gamePiecesGraphical'),
        cardArtMeshName
      )
      if (!cardArt) {
        return
      }

      const mesh = entity.get('mesh')

      changeFrameRarity(
        mesh,
        card.state.view.rarity,
        entity.has('publicRarity'),
        prism !== 'tok',
        shouldBeBackless(entity)
      )

      const cardArtCopy = setupCardArt(
        cameraShaker.camera,
        cardArt,
        card.state.view.element,
        card.state.view.type,
        bgUrl,
        fgUrl,
        undefined,
        undefined,
        card.state.view.rarity,
        foilContextFromStatus(
          entity.has('zone') ? entity.get('zone').current.cardStatus : undefined
        )
      )
      cardArtCopy.scale.multiplyScalar(0.352)
      cardArtCopy.rotation.x = Math.PI * -0.5
      cardArtCopy.position.x += 0.00005
      cardArtCopy.position.y += 0.00075
      cardArtCopy.position.z += 0.0025

      cardArtCopy.userData.isFrontFacing = true

      mesh.userData.revealedArt = cardArtCopy

      mesh.add(cardArtCopy)
    })
    visibleArtCards.listenForRemove(entity => {
      if (entity.has('mesh')) {
        const mesh = entity.get('mesh')
        if (mesh.userData.revealedArt) {
          mesh.userData.revealedArt.parent!.remove(mesh.userData.revealedArt)
          mesh.userData.revealedArt = undefined
        }
      }
    })
    function onVisibleCardsHostingAttachmentChange(
      entity: Entity<Components>,
      type: 'add' | 'remove'
    ) {
      const hasAttachment = type === 'add'
      if (!entity.has('mesh')) {
        return
      }

      const mesh = entity.get('mesh')
      for (const title of findObject3DsWhoseNamesInclude(mesh, 'textName')) {
        const sizeToFill = hasAttachment ? 0.0265 : 0.044
        if (title instanceof TextMesh) {
          title.onMeasurementsUpdated = () => {
            const s = Math.min(1, sizeToFill / title.width)
            title.scale.set(s, s, 1)
            title.position.x = hasAttachment
              ? title.width * 0.5 * s - 0.0195
              : 0
          }
          title.onMeasurementsUpdated(title)
        }
      }
      for (const title of findObject3DsWhoseNamesInclude(
        mesh,
        'detailBannerLabel'
      )) {
        const sizeToFill = hasAttachment ? 0.0263 : 0.028
        if (title instanceof TextMesh) {
          title.onMeasurementsUpdated = () => {
            const s = Math.min(1, sizeToFill / title.width)
            title.scale.set(s, s, 1)
            title.position.x = hasAttachment ? title.width * 0.5 - 0.02 / s : 0
          }
          title.onMeasurementsUpdated(title)
        }
      }
    }
    visibleCardsHostingAttachment.listenForAdd(entity =>
      onVisibleCardsHostingAttachmentChange(entity, 'add')
    )
    visibleCardsNotHostingAttachment.listenForAdd(entity =>
      onVisibleCardsHostingAttachmentChange(entity, 'remove')
    )
  }
  update() {
    //nothing
  }
}
