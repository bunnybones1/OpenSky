import device from '@opensky/shared/device'
import { CardInstance, Player, SkyWeaver } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Color } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import PlayerComponent from '~/components/PlayerComponent'
import TransformComponent from '~/components/TransformComponent'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import RowArtMeshMaterial from '~/materials/RowArtMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
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

export default class IconRow extends Row {
  mesh: Mesh2D
  material: RowArtMeshMaterial
  defaultBorderColor: Color
  hoveredBorderColor: Color

  constructor(
    sidebar: ActionHistorySidebar,
    playerId: Player,
    card: CardInstance<SkyWeaver>,
    icon: Object2D
  ) {
    super(sidebar)

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
    this.mesh.matrix.setConstraints(
      Pin.fromPixels(32 * 1.764, 32 * 1.764),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -5),
      GRAPHICAL_PIXEL_SIZE
    )
    this.material = this.mesh.material as RowArtMeshMaterial
    this.mesh.add(icon)
    this.add(this.mesh)
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
