import { BUTTON_MARGINS } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
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
import Modal, { TOP_BAR_HEIGHT } from '../components/Modal'
import UIContainer from '../components/UIContainer'

const leftButtonPin = [
  ReadonlyPin.TopRight,
  ReadonlyPin.Top.cloneOffset(-65, -BUTTON_MARGINS * 1.5)
] as const
const rightButtonPin = [
  ReadonlyPin.TopLeft,
  ReadonlyPin.Top.cloneOffset(65, -BUTTON_MARGINS * 1.5)
] as const

const centerButtonPin = [
  ReadonlyPin.Top,
  ReadonlyPin.Top.cloneOffset(0, -BUTTON_MARGINS)
] as const
export default class DialogContainer extends UIContainer {
  modalSize: Pin
  static async present(
    ui: UI,
    title: string,
    optionA: TextButtonOption,
    optionB?: TextButtonOption,
    bodyTexts?: string[]
  ) {
    DialogContainer.dialogCounter++
    const container = new DialogContainer(
      ui,
      1000,
      'dialog' + DialogContainer.dialogCounter
    )
    await container.ready
    DialogContainer.dialogs.push(container)
    await container.present(title, optionA, optionB, bodyTexts)
    DialogContainer.dialogs.pop()
  }

  private static dialogCounter = 0
  private static dialogs: DialogContainer[] = []
  complete: Resolvable<void>
  private _bodyTexts: UITextMesh[]
  private _titleText: UITextMesh
  leftOption: TextButtonKit
  rightOption: TextButtonKit
  modal: Modal
  constructor(ui: UI, priority: number, name = 'dialog') {
    super(ui, name, {
      priority,
      closeOnEscape: true
    })
  }

  static getTopDialog(): DialogContainer | void {
    return DialogContainer.dialogs[DialogContainer.dialogs.length - 1]
  }

  async present(
    title: string,
    optionA: TextButtonOption,
    optionB?: TextButtonOption,
    bodyTexts: string[] = []
  ) {
    this.complete = createResolvable()
    const modalHeight = bodyTexts.length > 0 ? 150 + bodyTexts.length * 30 : 150
    this._titleText.matrix.setConstraintsPosition(new Pin(0.5, 0, 0, 30))
    this.modalSize = Pin.fromPixels(500, modalHeight)
    this._titleText.text = title
    this._bodyTexts = []
    this.modal.mesh.matrix.setConstraints(this.modalSize)
    this.redressButton(this.leftOption, optionA)
    this.redressButton(this.rightOption, optionB)
    let cursor = 36 + TOP_BAR_HEIGHT
    if (bodyTexts) {
      for (const t of bodyTexts) {
        const text = new UITextMesh(t, textOptions.smallModalText)
        text.matrix.setConstraintsPosition(new Pin(0.5, 0, 0, cursor))
        this.modal.mesh.add(text)
        this._bodyTexts.push(text)
        cursor += 30
      }
    }
    for (const p of [leftButtonPin, centerButtonPin, rightButtonPin]) {
      p[1].y.offset = cursor
    }
    this.leftOption.button.mesh.matrix.setConstraints(
      this.leftOption.button.size,
      ...(optionB ? leftButtonPin : centerButtonPin)
    )
    this.fadeIn()
    await this.complete
    await this.fadeOut()
  }
  protected init() {
    this.modalSize = new Pin()
    createOverlay(this)
    const modal = createGenericModal('none', 'none')
    this.modal = modal
    this.add(modal.mesh)
    const title = new UITextMesh(
      '',
      textOptions.bigModalText,
      undefined,
      undefined,
      undefined,
      tm => {
        this.modalSize.x.offset = Math.max(tm.width + 64, 500)
      }
    )
    modal.mesh.add(title)
    this._titleText = title
    title.matrix.setConstraintsPosition(new Pin(0.5, 0.15))

    this.leftOption = createTextButtonKit(
      modal.mesh,
      NOOP,
      'testA',
      ...leftButtonPin
    )
    this.rightOption = createTextButtonKit(
      modal.mesh,
      NOOP,
      'testB',
      ...rightButtonPin
    )
  }

  private redressButton(kit: TextButtonKit, option?: TextButtonOption) {
    kit.button.mesh.visible = Boolean(option)
    if (!option) {
      return
    }
    kit.onSelect = () => {
      this.complete.resolve()
      this.leftOption.button.disabled = true
      this.rightOption.button.disabled = true
      option.onSelect()
    }
    kit.label.text = option.label
    kit.button.disabled = false
    if (
      option.useFancyHighlight !== undefined &&
      kit.button.mesh.material instanceof PaletteMappedVertexColorMeshMaterial
    ) {
      kit.button.mesh.material = kit.button.mesh.material.variant({
        useFancyHighlight: option.useFancyHighlight
      })
    }
    if (option.basePaletteRow !== undefined) {
      kit.button.basePaletteRow = option.basePaletteRow
    }
  }
}
