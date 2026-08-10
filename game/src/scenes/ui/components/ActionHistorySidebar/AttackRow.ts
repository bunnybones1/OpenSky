import device from '@opensky/shared/device'
import { CardInstance, Player, SkyWeaver } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Color } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import ActionHistoryComponent from '~/components/ActionHistoryComponent'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import { Components } from '~/components/index'
import PlayerComponent from '~/components/PlayerComponent'
import TransformComponent from '~/components/TransformComponent'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import { makeTriggerHolder2D } from '~/helpers/triggerHelpers'
import RowArtMeshMaterial from '~/materials/RowArtMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { store } from '~/state'
import { ActionHistoryEvent } from '~/state/ActionHistory'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import { makeInteractive } from '~/utils/makeInteractive'
import { world } from '~/world'

import { SidebarStatus } from '../SlideOutSidebar/constants'
import ActionHistorySidebar from '.'
import {
  GRAPHICAL_PIXEL_SIZE,
  HOVERED_BORDER_COLOR_MULTIPLIER,
  ROW_HEIGHT
} from './constants'
import Row from './Row'
import { getCardOwner, getPlayerColor, getThumbnail } from './rowUtils'

export default class AttackRow extends Row {
  attackerMesh: Mesh2D
  attackerMaterial: RowArtMeshMaterial
  attackerDefaultBorderColor: Color
  attackerHoveredBorderColor: Color
  defenderMesh: Mesh2D
  defenderMaterial: RowArtMeshMaterial
  defenderDefaultBorderColor: Color
  defenderHoveredBorderColor: Color
  attackerEntity: Entity<Components>
  defenderEntity: Entity<Components>

  constructor(
    sidebar: ActionHistorySidebar,
    playerId: Player,
    attacker: CardInstance<SkyWeaver>,
    defender: CardInstance<SkyWeaver>,
    attackerDied: boolean,
    defenderDied: boolean,
    public attachment: CardInstance<SkyWeaver> | undefined,
    public ev: ActionHistoryEvent
  ) {
    super(sidebar, ROW_HEIGHT * 2)
    this.attackerEntity = new Entity([new CardInstanceComponent(attacker)])
    this.defenderEntity = new Entity([new CardInstanceComponent(defender)])
    this.attackerEntity.toggle(PlayerComponent, store.player === playerId)
    this.defenderEntity.toggle(PlayerComponent, store.player === 1 - playerId)

    // create an unbound entity - not attached to world.
    this.entity = new Entity([
      new CardInstanceComponent(attacker),
      new ActionHistoryComponent(ev)
    ])
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

    const attackerThumbUrl = getThumbnail(attacker)
    const defenderThumbUrl = getThumbnail(defender)

    this.attackerDefaultBorderColor = getPlayerColor(playerId)
    this.attackerHoveredBorderColor = this.attackerDefaultBorderColor
      .clone()
      .multiplyScalar(HOVERED_BORDER_COLOR_MULTIPLIER)

    this.attackerMesh = setupRowArt(
      rowPrototype,
      attacker.state.view.element,
      attackerThumbUrl,
      this.attackerDefaultBorderColor,
      false,
      TextureType.SmallUI
    )
    this.attackerMesh.matrix.setConstraints(
      Pin.fromPixels(32 * 1.764, 32 * 1.764),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 5),
      GRAPHICAL_PIXEL_SIZE
    )

    // this.attackerMesh.scale.multiplyScalar(ROW_SCALE)
    // this.attackerMesh.position.set(-30, CELL_SIZE, -10)
    this.attackerMaterial = this.attackerMesh.material as RowArtMeshMaterial

    this.defenderDefaultBorderColor = getPlayerColor(getCardOwner(defender))
    this.defenderHoveredBorderColor = this.defenderDefaultBorderColor
      .clone()
      .multiplyScalar(HOVERED_BORDER_COLOR_MULTIPLIER)

    this.defenderMesh = setupRowArt(
      rowPrototype,
      defender.state.view.element,
      defenderThumbUrl,
      this.defenderDefaultBorderColor,
      false,
      TextureType.SmallUI
    )
    this.defenderMesh.matrix.setConstraints(
      Pin.fromPixels(32 * 1.764, 32 * 1.764),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -5),
      GRAPHICAL_PIXEL_SIZE
    )
    // this.defenderMesh.scale.multiplyScalar(ROW_SCALE)
    // this.defenderMesh.position.set(-30, 0, -10)
    this.defenderMaterial = this.defenderMesh.material as RowArtMeshMaterial

    this.add(this.attackerMesh)
    this.add(this.defenderMesh)

    const trigger = makeTriggerHolder2D('Attack')

    if (trigger) {
      trigger.matrix.setConstraintsPosition(ReadonlyPin.Center)
      this.add(trigger)
    }

    if (attackerDied) {
      const attackerDeathMesh = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        `preview-icon-death`
      )
      attackerDeathMesh.matrix.setConstraints(
        ReadonlyPin.EmptySize,
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      this.attackerMesh.add(attackerDeathMesh)
    }

    if (defenderDied) {
      const defenderDeathMesh = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        `preview-icon-death`
      )
      defenderDeathMesh.matrix.setConstraints(
        ReadonlyPin.EmptySize,
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      this.defenderMesh.add(defenderDeathMesh)
    }
  }

  onOver() {
    super.onOver()

    if (device.isDesktop) {
      this.attackerMaterial.decalColor = this.attackerHoveredBorderColor
      this.defenderMaterial.decalColor = this.defenderHoveredBorderColor
    }
  }

  onOut() {
    super.onOut()

    if (device.isDesktop) {
      this.attackerMaterial.decalColor = this.attackerDefaultBorderColor
      this.defenderMaterial.decalColor = this.defenderDefaultBorderColor
    }
  }
  onSelect() {
    if ((this.attackerEntity, this.defenderEntity)) {
      world
        .getSystem(CardFocusInspectionSystem)
        .setFocusedCard([this.attackerEntity, this.defenderEntity])
    }
  }
  onHoldStart() {
    super.onHoldStart()

    if (device.useTouch && this.sidebar.status === SidebarStatus.Revealed) {
      // this.attackerMaterial.decalColor = this.attackerHoveredBorderColor
      // this.defenderMaterial.decalColor = this.defenderHoveredBorderColor
    }
  }

  onHoldEnd() {
    super.onHoldEnd()

    if (device.useTouch) {
      // this.attackerMaterial.decalColor = this.attackerDefaultBorderColor
      // this.defenderMaterial.decalColor = this.defenderDefaultBorderColor
    }
  }
}
