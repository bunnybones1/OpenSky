import { CardLibrary, Player } from '@skyweaver/state-metadata'
import { Mesh, Object3D } from 'three'

import { createAttachedSpellInteractives } from '~/assemblages/AttachedSpellAssemblage'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { ATTACHMENT_TRANSFORMS } from '~/data/AttachmentConstants'
import { getFakeCardTagView } from '~/utils/card'
import { changeFrameRarity } from '~/utils/changeFrameRarity'

export function tryAttachBakedAttachedSpell(
  card: RelaxedCardInstance,
  attachment: RelaxedCardInstance | 'fake',
  baseTransform: Object3D,
  baseMesh: Object3D,
  owner: Player
): boolean {
  if (attachment === 'fake') {
    const base = CardLibrary.get(card.base)
    if (!base) {
      return false
    }
    if (base.attachment === undefined) {
      return false
    }
  }
  const rarity =
    attachment === 'fake'
      ? card.state.view.rarity
      : attachment.state.view.rarity

  const attachedInteractives = createAttachedSpellInteractives(
    attachment === 'fake'
      ? getFakeCardTagView(CardLibrary.get(card.base)!.attachment!, rarity)
      : attachment,
    owner
  )

  const attachedVisuals = attachedInteractives.visualsRoot

  attachedVisuals.visible = true
  changeFrameRarity(attachedVisuals, rarity)
  // mangle all frame geometry names so frame style can no longer be changed
  attachedVisuals.traverse(m => {
    if (m instanceof Mesh) {
      if (m.name.includes('front') || m.name.includes('-frame-')) {
        m.name = m.name.replace('-frame-', '-mangled-')
      }
    }
  })
  if (attachedInteractives.highlight) {
    attachedVisuals.remove(attachedInteractives.highlight)
  }
  attachedVisuals.remove(attachedInteractives.collider)
  baseTransform.add(attachedVisuals)
  attachedVisuals.position.copy(ATTACHMENT_TRANSFORMS.spellHome.offset)
  attachedVisuals.scale.multiplyScalar(ATTACHMENT_TRANSFORMS.spellHome.scale)
  attachedVisuals.traverse(child => {
    if ((child as any).onAdd) {
      ;(child as any).onAdd()
    }
  })

  baseMesh.attach(attachedVisuals)

  return true
}
