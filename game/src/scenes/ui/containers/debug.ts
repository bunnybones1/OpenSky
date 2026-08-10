import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { BUTTON_HEIGHT, BUTTON_MARGINS } from '~/constants'
import { debuggables } from '~/debug/debugRegistry'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { debugGuiState, toggleFPSCounter } from '~/userSettings'
import { masterFrameRateTracker } from '~/utils/frameRateTracker'
import { createDebugButton } from '~/utils/ui'

import { UI } from '..'
import BaseButton from '../components/BaseButton'
import UIContainer from '../components/UIContainer'

export default class DebugContainer extends UIContainer {
  private _baseBreadcrumb: Object2D
  private _freshestBreadcrumb: Object2D
  private _optionsPivot: Object2D
  private _freshestOption: Object2D
  private _cursor: BaseButton
  contents = new Object2D(false)
  updateCallbacks = new Set<(dt: number) => void>()
  constructor(ui: UI, priority: number) {
    super(ui, 'debug', {
      priority
    })
  }
  update(dt: number) {
    this.updateCallbacks.forEach(u => u(dt))
  }
  resetBreadcrumbButtons() {
    let currentBreadcrumb: Object3D = this._freshestBreadcrumb

    while (currentBreadcrumb !== this._baseBreadcrumb) {
      const drop = currentBreadcrumb
      currentBreadcrumb = currentBreadcrumb.parent!
      drop.parent!.remove(drop)
    }
    this._freshestBreadcrumb = this._baseBreadcrumb
  }
  createBreadcrumbButton(label: string, onClick: () => void) {
    this._freshestBreadcrumb = createDebugButton(
      this._freshestBreadcrumb,
      label,
      onClick,
      'hor'
    ).mesh
  }
  resetOptions() {
    let currentOption: Object3D = this._freshestOption
    while (currentOption !== this._optionsPivot) {
      const drop = currentOption
      currentOption = currentOption.parent!
      drop.parent!.remove(drop)
    }
    this._freshestOption = this._optionsPivot
  }
  addOption(label: string, onClick: () => void) {
    if (label === 'root') {
      return
    }
    this._freshestOption = createDebugButton(
      this._freshestOption,
      label,
      onClick,
      'hor'
    ).mesh
  }
  toggleMenu() {
    if (!debuggables.activeState) {
      debuggables.setActiveState(true)
      this._baseBreadcrumb.visible = true
      this._optionsPivot.visible = true
    } else {
      debuggables.setActiveState(false)
      this._baseBreadcrumb.visible = false
      this._optionsPivot.visible = false
    }
  }
  setOffset(offset: number) {
    for (const obj of this.children) {
      obj.position.x = offset
    }
  }
  protected async init() {
    await getAssetsManager().loadAsset('uiSmall')
    this.add(this.contents)
    this._cursor = createDebugButton(
      this,
      'x',
      () => (debugGuiState.value = false),
      'first'
    )

    let cursor = createDebugButton(
      this._cursor.mesh,
      '↺',
      () => location.reload(),
      'hor'
    )

    if (queryParams.mode) {
      cursor = createDebugButton(
        cursor.mesh,
        '⚓',
        () =>
          this.ui.getContainer('cheats').ready.then(c => {
            c.show()
            c.sidebar.open()
          }),
        'hor'
      )
    }
    cursor = createDebugButton(
      cursor.mesh,
      '⚒',
      () => this.toggleMenu(),
      'hor'
    )

    const fpsText = new UITextMesh('60', textOptions.fpsCounter)

    listenToProperty(masterFrameRateTracker, 'averageFps', v => {
      if (debugGuiState.value) {
        fpsText.text = Math.round(v).toString()
      }
    })

    fpsText.matrix.offset = ReadonlyPin.Bottom.cloneOffset(0, -3)
    cursor.mesh.add(fpsText)
    toggleFPSCounter.listen(v => (fpsText.visible = v))
    const breadcrumbPivot = new Object2D()
    // breadcrumbPivot.matrix.setConstraints(new Pin(0, 0), new Pin(0, 0), new Pin(0, 0))
    cursor.mesh.add(breadcrumbPivot)
    this._baseBreadcrumb = breadcrumbPivot
    this._freshestBreadcrumb = breadcrumbPivot
    const optionsPivot = new Object2D()
    optionsPivot.matrix.setConstraintsPosition(
      new Pin(0, 0, 0, BUTTON_HEIGHT * 1.75 + BUTTON_MARGINS)
    )
    this.add(optionsPivot)
    this._optionsPivot = optionsPivot
    this._freshestOption = optionsPivot
  }
  async fadeIn(duration?: number) {
    await super.fadeIn(duration)
    if (this.ui.hasContainer('deckSidebars')) {
      const cont = this.ui.getContainer('deckSidebars')
      cont.ready.then(() => cont.setupShiftingDebugMenu())
    }
  }
}
