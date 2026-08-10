import { CardLibrary, Player } from '@skyweaver/state-metadata'
import { Component } from 'gg'
import { Box3, Vector3 } from 'three'

import { COLOR_PLAYABLE_GREEN } from '~/colors/colorLibrary'
import CardInstanceComponent, {
  RelaxedCardInstance
} from '~/components/CardInstanceComponent'
import FakeHasAttachmentComponent from '~/components/FakeHasAttachmentComponent'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import HighlightMaterialComponent from '~/components/HighlightMaterialComponent'
import MeshComponent from '~/components/MeshComponent'
import PlayerComponent from '~/components/PlayerComponent'
import TransformComponent from '~/components/TransformComponent'
import ZoneComponent from '~/components/ZoneComponent'
import { tryAttachBakedAttachedSpell } from '~/helpers/fakeAttachedSpellHelper'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import queryParams from '~/queryParams'
import { storeHelper } from '~/state/index'
import { makeBox3Helper, removeFromParent } from '~/utils/threeUtils'

import { createCardFrontInteractives } from './CardAssemblage'

const CardPopupAssemblage = (
  card: RelaxedCardInstance,
  owner: Player,
  attachment?: RelaxedCardInstance,
  isFake?: boolean,
  shouldGlow?: boolean
) => {
  const { visualsRoot, highlight } = createCardFrontInteractives(card, owner)

  const tc = new TransformComponent()

  const didAttachSpell =
    (attachment || isFake) &&
    tryAttachBakedAttachedSpell(
      card,
      attachment || 'fake',
      tc.value,
      visualsRoot,
      owner
    )

  const artProtector = makeBox3Helper(
    new Box3(
      new Vector3(-0.0125, -0.001, -0.04),
      new Vector3(0.0125, 0.001, -0.015)
    )
  )
  artProtector.userData.protector = true
  artProtector.visible = queryParams.debugScreenspace
  visualsRoot.add(artProtector)

  const bottomProtector = makeBox3Helper(
    new Box3(
      new Vector3(-0.0125, -0.001, 0.04),
      new Vector3(0.0125, 0.001, 0.015)
    )
  )
  bottomProtector.userData.protector = true
  bottomProtector.visible = queryParams.debugScreenspace
  visualsRoot.add(bottomProtector)

  const baseAttach = CardLibrary.get(card.base)?.attachment

  const components: Component<any>[] = [
    tc,
    new CardInstanceComponent(card),
    new FrameStyleComponent(card.state.view.rarity),
    new MeshComponent(visualsRoot),
    new ZoneComponent(),
    ...((isFake && baseAttach) || didAttachSpell
      ? [new FakeHasAttachmentComponent()]
      : []),
    new FrontFacesVisibleComponent(),
    ...(storeHelper.getPlayer() === owner ? [new PlayerComponent()] : [])
  ]
  if (highlight) {
    if (!shouldGlow) {
      removeFromParent(highlight)
    } else {
      const mat = highlight.material as MagicFireHighlightMeshMaterial
      mat.color.copy(COLOR_PLAYABLE_GREEN)
      mat.opacity *= 0.7
      components.push(
        new HighlightMaterialComponent({
          materials: [mat],
          mesh: highlight
        })
      )
    }
  }
  return components
}

export default CardPopupAssemblage
