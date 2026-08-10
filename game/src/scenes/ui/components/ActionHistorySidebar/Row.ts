import device from '@opensky/shared/device'
import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { Components } from '~/components'
import { setHoveredActionHistoryCardAsync } from '~/helpers/cardPopupHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import { get2DPositionAtDepth } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { world } from '~/world'

import { SidebarStatus } from '../SlideOutSidebar/constants'
import ActionHistorySidebar from '.'
import { ROW_HEIGHT, ROW_WIDTH } from './constants'

export default class Row extends Object2D implements IInteractive {
  entity: Entity<Components> | undefined
  attachment: CardInstance<SkyWeaver> | undefined
  cursor: CursorType = 'pointer'

  constructor(
    public sidebar: ActionHistorySidebar,
    scrollItemSize: number = ROW_HEIGHT
  ) {
    super()
    this.matrix.setConstraints(
      Pin.fromPixels(ROW_WIDTH, scrollItemSize),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
  }

  onOver() {
    if (device.isDesktop && this.entity) {
      if (!this.entity.has('transform')) {
        return
      }

      const transform = this.entity.get('transform')
      transform.position.copy(
        get2DPositionAtDepth(
          cameraShaker.camera,
          cameraShaker.cameraWorldPos,
          this.matrixWorld.clipSpacePosX +
            this.matrixWorld.clipSpaceSizeX -
            0.03,
          this.matrixWorld.clipSpacePosY +
            this.matrixWorld.clipSpaceSizeY -
            0.235
        )
      )
      setHoveredActionHistoryCardAsync(this.entity, this.attachment, 0, 'right')
    }
  }

  onOut() {
    if (device.isDesktop) {
      setHoveredActionHistoryCardAsync(undefined, undefined)
    }
  }

  onHoldStart() {
    if (device.useTouch && this.sidebar.status === SidebarStatus.Revealed) {
      // const transform = this.entity!.get('transform')

      // transform.position.copy(
      //   get2DPositionAtDepth(
      //     cameraShaker.camera,
      //     cameraShaker.cameraWorldPos,
      //     toClipX(ROW_WIDTH * uiScale.value),
      //     inputProvider.positionClipspace.y
      //   )
      // )
      setHoveredActionHistoryCardAsync(this.entity, this.attachment, 0, 'right')
    }
  }
  onSelect() {
    if (this.entity) {
      world.getSystem(CardFocusInspectionSystem).setFocusedCard(this.entity)
    }
  }

  onHoldEnd() {
    if (device.useTouch) {
      setHoveredActionHistoryCardAsync(undefined, undefined)
    }
  }
}
