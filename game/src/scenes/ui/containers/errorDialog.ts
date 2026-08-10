import { i18n } from '@opensky/language-manager'

import { getAssetsManager } from '~/assets'
import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  ERROR_MODAL_WIDTH,
  PALETTE_ROW
} from '~/constants'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { createResolvable, Resolvable } from '~/utils/asyncUtils'
import { NOOP } from '~/utils/jsUtils'
import {
  createGenericModal,
  createOverlay,
  createTextButtonKit,
  TextButtonKit,
  TextButtonOption
} from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class ErrorDialogContainer extends UIContainer {
  static async present(
    ui: UI,
    description: string,
    optionA: TextButtonOption,
    optionB?: TextButtonOption
  ) {
    ErrorDialogContainer.dialogCounter++

    const container = new ErrorDialogContainer(
      ui,
      1000,
      'errorDialog' + ErrorDialogContainer.dialogCounter,
      description,
      optionA,
      optionB
    )
    ui.allContainersInOne.add(container)
    await container.ready
    ErrorDialogContainer.allErrors.push(container)
    await container.present()
  }

  static dismissAll() {
    ErrorDialogContainer.allErrors.forEach(err => err.hide())
  }

  // we only ever show 1 anyways, safe to leak them here.
  private static allErrors: ErrorDialogContainer[] = []
  private static dialogCounter = 0
  complete: Resolvable<void>
  private _description: string
  private _optionA: TextButtonOption
  private _optionB?: TextButtonOption
  private _buttonKitA: TextButtonKit
  private _buttonKitB?: TextButtonKit
  constructor(
    ui: UI,
    priority: number,
    name = 'errorDialog',
    _description: string,
    _optionA: TextButtonOption,
    _optionB?: TextButtonOption
  ) {
    super(ui, name, {
      priority
    })
    this._description = _description
    this._optionA = _optionA
    this._optionB = _optionB
  }

  async present() {
    this.fadeIn()
    await this.complete
    await this.fadeOut()
  }
  protected async init() {
    createOverlay(this)
    const modal = createGenericModal('none', 'none')
    modal.mesh.matrix.setConstraints(Pin.fromPixels(ERROR_MODAL_WIDTH, 150))
    this.add(modal.mesh)

    const MUSHROOM_TOP_PADDING = -115
    const TOP_PADDING = 190
    const INTER_PADDING = 20
    const BOTTOM_PADDING = 40

    await getAssetsManager().loadAsset('errorMushroom')
    const mushrooms = new RectangleMesh(
      new RectangleMaterial({
        map: getAssetsManager().getAsset('errorMushroom'),
        forceTransparent: true
      })
    )
    mushrooms.matrix.setConstraints(
      new SizePin(0.75, 1, 1.57432432432, 'fit'),
      new Pin(0.5, 0),
      new Pin(0.5, 0, 0, MUSHROOM_TOP_PADDING)
    )
    modal.mesh.add(mushrooms)

    const middlePin = new Pin(0.5, 0)
    const descriptionPin = new Pin(0, 0, 20)
    const sizes: {
      header?: UITextMesh
      middle?: UITextMesh
      description?: UITextMesh
    } = {}

    const recomputeModalSize = () => {
      const headerHeight = sizes.header?.height ?? 0
      const middleHeight = sizes.middle?.height ?? 0
      const descriptionHeight = sizes.description?.height ?? 0
      modal.mesh.matrix.size.y.offset =
        TOP_PADDING +
        headerHeight +
        INTER_PADDING +
        middleHeight +
        INTER_PADDING +
        descriptionHeight +
        INTER_PADDING +
        BOTTOM_PADDING +
        BUTTON_HEIGHT

      middlePin.y.offset = TOP_PADDING + headerHeight + INTER_PADDING
      descriptionPin.y.offset =
        middlePin.y.offset + middleHeight + INTER_PADDING
    }

    sizes.header = new UITextMesh(
      i18n.t('ui.error.header'),
      textOptions.errorTitle,
      undefined,
      undefined,
      undefined,
      recomputeModalSize
    )
    sizes.header.matrix.setConstraintsPosition(new Pin(0.5, 0, 0, TOP_PADDING))

    sizes.middle = new UITextMesh(
      i18n.t('ui.error.middle'),
      textOptions.errorMiddle,
      undefined,
      undefined,
      undefined,
      recomputeModalSize
    )
    sizes.middle.matrix.setConstraintsPosition(middlePin)

    sizes.description = new UITextMesh(
      this._description,
      textOptions.errorBody,
      undefined,
      undefined,
      undefined,
      recomputeModalSize
    )
    sizes.description.matrix.setConstraintsPosition(descriptionPin)

    modal.mesh.add(sizes.header)
    modal.mesh.add(sizes.middle)
    modal.mesh.add(sizes.description)

    recomputeModalSize()

    this.complete = createResolvable()

    this._buttonKitA = createTextButtonKit(
      modal.mesh,
      NOOP,
      i18n.t('ui.error.buttonQuit'),
      this._optionB ? ReadonlyPin.BottomRight : ReadonlyPin.Bottom,
      this._optionB
        ? ReadonlyPin.Bottom.cloneOffset(
            -BUTTON_MARGINS / 2,
            -BUTTON_MARGINS - BOTTOM_PADDING / 2 + BUTTON_HEIGHT / 2
          )
        : ReadonlyPin.Bottom.cloneOffset(
            0,
            -BUTTON_MARGINS - BOTTOM_PADDING / 2 + BUTTON_HEIGHT / 2
          )
    )
    this.redressButton(this._buttonKitA, this._optionA)

    if (this._optionB) {
      this._buttonKitB = createTextButtonKit(
        modal.mesh,
        NOOP,
        i18n.t('ui.error.buttonReload'),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.Bottom.cloneOffset(
          BUTTON_MARGINS / 2,
          -BUTTON_MARGINS - BOTTOM_PADDING / 2 + BUTTON_HEIGHT / 2
        )
      )
      this.redressButton(this._buttonKitB, this._optionB)
    }
  }

  private redressButton(kit: TextButtonKit, option: TextButtonOption) {
    kit.onSelect = () => {
      this.complete.resolve()
      this._buttonKitA.button.disabled = true

      if (this._buttonKitB) {
        this._buttonKitB.button.disabled = true
      }
      option.onSelect()
    }
    kit.button.mesh.material
    kit.label.text = option.label
    kit.button.basePaletteRow = PALETTE_ROW.PURPLE
  }
}
