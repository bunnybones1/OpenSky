import device from '@opensky/shared/device'
import {
  CardInstance,
  EffectType,
  Player,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Color } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import PlayerComponent from '~/components/PlayerComponent'
import TransformComponent from '~/components/TransformComponent'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import { makeTriggerHolder2D } from '~/helpers/triggerHelpers'
import RowArtMeshMaterial from '~/materials/RowArtMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { store } from '~/state'
import { makeInteractive } from '~/utils/makeInteractive'

import { SidebarStatus } from '../SlideOutSidebar/constants'
import ActionHistorySidebar from '.'
import {
  GRAPHICAL_PIXEL_SIZE,
  HOVERED_BORDER_COLOR_MULTIPLIER
} from './constants'
import Row from './Row'
import { getPlayerColor, getThumbnail } from './rowUtils'

export default class TriggerRow extends Row {
  mesh: Mesh2D
  material: RowArtMeshMaterial
  defaultBorderColor: Color
  hoveredBorderColor: Color

  constructor(
    sidebar: ActionHistorySidebar,
    playerId: Player,
    card: CardInstance<SkyWeaver>,
    public attachment: CardInstance<SkyWeaver> | undefined,
    effect: EffectType
  ) {
    super(sidebar)

    // this.scrollItemSize = ROW_HEIGHT

    // create an unbound entity - not attached to world.
    this.entity = new Entity([new CardInstanceComponent(card)])
    this.entity.toggle(PlayerComponent, store.player === playerId)

    // XXX Timing issue regarding TransformComponent and the defaultScene
    setTimeout(() => {
      this.entity!.add(new TransformComponent())
    }, 1)

    makeInteractive(this, this)

    const cardArtObjs = getAssetsManager().getAsset(
      'gamePiecesGraphical'
    ).children

    function getChildrenNamedLike(str: string) {
      return cardArtObjs.filter(m => m.name.includes(str))
    }

    const rowPrototype = getChildrenNamedLike('row-mini')[0] as Mesh2D
    // const row = new Object3D()

    // row.userData.width = ROW_WIDTH
    // row.userData.height = ROW_HEIGHT
    // row.position.set(-30, 30, -10)

    const unitThumbnail = getThumbnail(card)

    this.defaultBorderColor = getPlayerColor(playerId)
    this.hoveredBorderColor = this.defaultBorderColor
      .clone()
      .multiplyScalar(HOVERED_BORDER_COLOR_MULTIPLIER)

    this.mesh = setupRowArt(
      rowPrototype,
      card.state.view.element,
      unitThumbnail,
      this.defaultBorderColor,
      false,
      TextureType.SmallUI
    )
    // this.mesh.scale.multiplyScalar(ROW_SCALE)
    this.mesh.matrix.setConstraints(
      Pin.fromPixels(32 * 1.764, 32 * 1.764),
      ReadonlyPin.Center,
      ReadonlyPin.Center.clone(),
      GRAPHICAL_PIXEL_SIZE
    )
    this.material = this.mesh.material as RowArtMeshMaterial
    this.add(this.mesh)

    const trigger = makeTriggerHolder2D(effect)

    if (trigger) {
      trigger.matrix.setConstraintsPosition(
        ReadonlyPin.Bottom.cloneOffset(0, -20)
      )
      this.add(trigger)
    }
  }

  onOver() {
    super.onOver()

    if (device.isDesktop) {
      this.material.decalColor = this.hoveredBorderColor
    }
  }

  onOut() {
    super.onOut()

    if (device.isDesktop) {
      this.material.decalColor = this.defaultBorderColor
    }
  }

  onHoldStart() {
    super.onHoldStart()

    if (device.useTouch && this.sidebar.status === SidebarStatus.Revealed) {
      this.material.decalColor = this.hoveredBorderColor
    }
  }

  onHoldEnd() {
    super.onHoldEnd()

    if (device.useTouch) {
      this.material.decalColor = this.defaultBorderColor
    }
  }
}
