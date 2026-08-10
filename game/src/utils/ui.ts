import { i18n, TFuncKey } from '@opensky/language-manager'
import { TextureAssetName } from '@opensky/shared/assets'
import { Color, Material, Mesh, Object3D, ShaderMaterial } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_WHITE } from '~/colors/colorLibrary'
import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  END_TURN_BUTTON_WIDTH,
  PALETTE_ROW
} from '~/constants'
import { debuggables } from '~/debug/debugRegistry'
import { ButtonShape } from '~/helpers/buttonTypeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import {
  ButtonHighlightStyle,
  ButtonState
} from '~/scenes/ui/components/BaseButton'
import {
  default as Button,
  default as PaletteMappedButton
} from '~/scenes/ui/components/Button'
import Modal, { GemType } from '~/scenes/ui/components/Modal'
import PinnedButton from '~/scenes/ui/components/PinnedButton'
import {
  continueToNextTutorial,
  restartThisTutorial
} from '~/scenes/ui/helpers'
import { makeTextContainerMinWidthCallback } from '~/scenes/ui/makeTextContainerMinWidthCallback'
import { storeHelper } from '~/state/index'
import { simpleTweener } from '~/systems/animation/tweeners'
import { underPointer } from '~/systems/input/input'
import keyboard, { KeyboardKey } from '~/systems/input/keyboard'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { globalAccess } from '~/utils/globalAccess'

import { toScreenX, toScreenY } from './camera'
import ColliderMesh from './ColliderMesh'
import { makeInteractive } from './makeInteractive'
import { removeFromParent, removeObject3DByName } from './threeUtils'
import { TrackableCollection } from './TrackableCollection'

function recurseOpacity(base: Object3D, opacity: number) {
  base.traverse(child => {
    if (child instanceof Mesh && child.material instanceof Material) {
      const mat = child.material
      const { userData } = mat

      const uniforms = mat instanceof ShaderMaterial ? mat.uniforms : undefined

      const u = uniforms && (uniforms.opacity || uniforms.uOpacity)
      if (userData.originalOpacity === undefined) {
        if (u) {
          const opacity = u.value
          userData.originalOpacity = opacity
        } else {
          userData.originalOpacity = mat.opacity
        }
      }

      if (u) {
        u.value = opacity * userData.originalOpacity
      } else {
        mat.opacity = opacity * userData.originalOpacity
      }
    }
  })
}

/**
 *
 * @param depth 1 is far plane, -1 is near plane.
 */
export const overlays = new TrackableCollection<RectangleMesh>(
  'HighlightMaterialComponent'
)
export function createOverlay(
  parent?: Object3D,
  onSelect?: () => void,
  rightClickFiresOnSelect: boolean = false,
  depth?: number
) {
  const overlay = new RectangleMesh(
    new RectangleMaterial({
      depth
    })
  )
  overlay.name = parent?.name + '-overlay'
  overlays.add(overlay)
  sortOverlays()
  setTimeout(sortOverlays, 100)
  overlay.matrix.setColor(new Color('black'), 0.5)
  overlay.matrix.setConstraints(
    new Pin(32 / 16, 10 / 8),
    ReadonlyPin.Center,
    ReadonlyPin.Center
  )
  if (parent) {
    parent.add(overlay)
  }
  makeInteractive(
    overlay,
    {
      onSelect,
      onRightPressEnd: rightClickFiresOnSelect ? onSelect : undefined,
      cursor: onSelect ? 'alias' : 'default'
    },
    undefined,
    overlay.material.depth
  )
  return overlay
}

function sortOverlays() {
  overlays.items.sort(
    (a, b) => b.material.getFinalDepth() - a.material.getFinalDepth()
  )
}
export function createGenericModal(
  topGem: GemType = 'dark',
  bottomGem: GemType = 'dark',
  alphaTextureAsset?: TextureAssetName
) {
  const modal = new Modal(topGem, bottomGem, alphaTextureAsset)
  makeInteractive(modal.mesh, { cursor: 'default' })
  return modal
}

const defaultButtonSize = Pin.fromPixels(100, BUTTON_HEIGHT)
export function createButton(
  parent: Object3D,
  onClick: () => void,
  size = defaultButtonSize,
  anchor = ReadonlyPin.Center,
  offset = ReadonlyPin.Center,
  onHoldStart?: () => void,
  onHoldEnd?: () => void,
  shape?: ButtonShape,
  useFancyHighlight?: boolean,
  hasTurnTimer = false,
  buttonHighlightStyle: ButtonHighlightStyle = 'buttonBasic'
) {
  const button = new PinnedButton(
    onClick,
    size,
    anchor,
    offset,
    onHoldStart,
    onHoldEnd,
    shape,
    useFancyHighlight,
    hasTurnTimer,
    buttonHighlightStyle
  )

  parent.add(button.mesh)
  return button
}

export function makeButtonBindable(
  button: Button,
  title: TFuncKey,
  id: string,
  options?: {
    defaultBinding?: KeyboardKey | null
    onBindingChanged?: (
      id: string,
      key: KeyboardKey | null,
      cb: () => void
    ) => void
  }
) {
  let _key: KeyboardKey | null = null
  const pin = Pin.fromPixels(20, 20)
  const cb = () => button.onSelectEvenIfDisabled()
  const binderButton = createButton(
    button.mesh,
    () => {
      if (_key) {
        _key = null
      } else {
        const key = prompt(
          i18n.t('ui.bindKey', {
            action: i18n.t(title)
          })
        )
        if (!key) {
          return
        }
        if (key.length !== 1) {
          return alert(
            i18n.t('ui.bindKeyError', {
              key
            })
          )
        }
        _key = key as KeyboardKey
      }
      keyText.text = _key ?? ''
      pin.x.offset = _key ? 40 : 20
      options?.onBindingChanged?.(id, _key, cb)
    },
    pin,
    ReadonlyPin.Center,
    ReadonlyPin.TopRight
  )

  createButtonIcon(
    binderButton.mesh,
    'ui-icon-command',
    ReadonlyPin.Left.cloneOffset(10, 0)
  )
  const keyText = createButtonText(
    binderButton.mesh,
    '',
    { ...textOptions.optionsButtonText, align: 'right' },
    undefined,
    ReadonlyPin.Right.cloneOffset(-BUTTON_MARGINS / 2, 0)
  )

  if (options?.defaultBinding) {
    _key = options.defaultBinding
    keyboard.listenToKey(_key, cb)
    keyText.text = _key
    pin.x.offset = 40
  }
}

export function makeButtonDeletable(button: Button, onDelete: () => void) {
  const pin = Pin.fromPixels(20, 20)
  const deleterButton = createButton(
    button.mesh,
    onDelete,
    pin,
    ReadonlyPin.Center,
    ReadonlyPin.TopLeft
  )
  createButtonIcon(deleterButton.mesh, 'ui-icon-close')
}

const SKIP_BUTTON_NAME = 'skip-button-match-end'
export const CONTINUE_BUTTON_NAME = 'continue-button-match-end'

export type SkipButton = {
  button: PinnedButton
  onSkip: Promise<void>
  skip: () => void
}
export function createSkipButton(
  parent: Object3D,
  onClick?: () => void,
  isNextTutorialButton?: boolean,
  text: string = i18n.t('ui.endTurnButton.continue')
): SkipButton {
  let skipButton: PinnedButton | undefined
  let skip: (() => void) | undefined
  const promise = new Promise<void>(resolve => {
    const anim = { value: 0 }
    skip = async function skip() {
      if (skipButton!.disabled) {
        return
      }
      skipButton!.disabled = true
      simpleTweener.to({
        description: 'skip match end',
        target: anim,
        propertyGoals: { value: 0 },
        duration: 200,
        onUpdate,
        onComplete() {
          resolve()
          removeFromParent(skipButton!.mesh)
        }
      })
      if (onClick) {
        onClick()
      }
      if (isNextTutorialButton) {
        const playerLost = (await storeHelper.getMatchEndType()) === 'defeat'
        if (playerLost) {
          restartThisTutorial()
        } else {
          continueToNextTutorial()
        }
      }
    }
    const skipButtonSize = Pin.fromPixels(
      END_TURN_BUTTON_WIDTH,
      END_TURN_BUTTON_HEIGHT
    )
    skipButton = createButton(
      parent,
      skip,
      skipButtonSize,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-3, -3),
      undefined,
      undefined,
      'button-end-turn',
      true
    )
    function onUpdate() {
      recurseOpacity(skipButton!.mesh, anim.value)
    }
    simpleTweener.to({
      description: 'skip match end',
      target: anim,
      propertyGoals: { value: 1 },
      duration: 200,
      onUpdate
    })
    skipButton.basePaletteRow = isNextTutorialButton
      ? PALETTE_ROW.GREEN
      : PALETTE_ROW.PURPLE
    if (!isNextTutorialButton) {
      skipButton.mesh.matrix.setColor(new Color(3, 2.2, 2.2))
    }
    skipButton.mesh.material.setFancyHighlightColor(COLOR_WHITE)
    skipButton.mesh.name = SKIP_BUTTON_NAME
    createButtonText(
      skipButton.mesh,
      text,
      {
        ...textOptions.endTurnButtonText,
        size: isNextTutorialButton ? 26 : textOptions.endTurnButtonText.size
      },
      makeTextContainerMinWidthCallback(skipButtonSize),
      ReadonlyPin.Center.cloneOffset(0, -2)
    )
    giveButtonKeyboardShortcut(skipButton, ' ')
  })
  return {
    button: skipButton!,
    onSkip: promise,
    skip: skip!
  }
}

export function nukeSkipButtons() {
  globalAccess.ui?.getActiveContainers().forEach(container => {
    try {
      removeObject3DByName(container, SKIP_BUTTON_NAME)
    } catch (e) {
      // console.warn('Could not find object3D to remove it')
      // no worries
    }
  })
}

export function findActiveSkipOrContinueButton():
  | PaletteMappedButton['mesh']
  | undefined {
  const l: Object3D[] = []
  for (const container of globalAccess.ui?.getActiveContainers() ?? []) {
    container.traverse(c => {
      const skip = c.getObjectByName(SKIP_BUTTON_NAME)
      if (skip) {
        l.push(skip)
      }
      const cont = c.getObjectByName(CONTINUE_BUTTON_NAME)
      if (cont) {
        l.push(cont)
      }
    })
  }
  return l.find(b => {
    let invis = false
    b.traverseAncestors(a => (invis = invis || !a.visible))
    return !invis
  }) as PaletteMappedButton['mesh'] | undefined
}

function createButtonText2(
  parent: Object2D | Mesh2D,
  text: string,
  textParams: textOptions.TextOptions = textOptions.buttonText,
  onMeasurementsUpdated?: (textMesh: TextMesh) => void,
  pin: Pin = ReadonlyPin.Center
) {
  const textMesh = new UITextMesh(
    text,
    textParams,
    undefined,
    undefined,
    undefined,
    onMeasurementsUpdated
  )
  textMesh.matrix.anchor = pin
  textMesh.matrix.offset = pin
  parent.add(textMesh)
  return textMesh
}

export function createButtonText(
  parent: Object3D,
  text: string,
  textParams: textOptions.TextOptions = textOptions.optionsButtonText,
  onMeasurementsUpdated?: (textMesh: TextMesh) => void,
  pin: Pin = ReadonlyPin.Center,
  animationCharactersPerSecond?: number
) {
  const textMesh = new UITextMesh(
    text,
    textParams,
    undefined,
    undefined,
    undefined,
    onMeasurementsUpdated,
    undefined,
    animationCharactersPerSecond
  )
  parent.name += `: ${text}`
  textMesh.matrix.setConstraintsPosition(pin.cloneOffset(0, -1))
  parent.add(textMesh)
  return textMesh
}

export function createButtonIcon(
  parent: Mesh2D | Object2D,
  icon: string,
  pin = ReadonlyPin.Center
) {
  const iconMesh = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    icon,
    true,
    true
  )
  iconMesh.matrix.setConstraintsPosition(pin)
  parent.add(iconMesh)
  return iconMesh
}

export function giveButtonKeyboardShortcut(
  button: Button,
  key: KeyboardKey,
  isShortcutEnabled?: () => boolean
) {
  if (key) {
    keyboard.listenToKey(key, () => {
      const isDisabled = button.state === ButtonState.Disabled
      if (isDisabled || (isShortcutEnabled && !isShortcutEnabled())) {
        return
      }
      const buttonPosition = getButtonScreenPosition(button.mesh)
      const hitButton = underPointer.testHit(buttonPosition.x, buttonPosition.y)

      if (
        !(hitButton.frontMost instanceof ColliderMesh) ||
        hitButton.frontMost.interactions !== button
      ) {
        return
      }

      button.onSelect()
    })
  }
}
export interface TextButtonKit {
  button: PinnedButton
  label: UITextMesh
  onSelect: () => void
}

export interface TextButtonOption {
  label: string
  onSelect: () => void
  basePaletteRow?: number
  useFancyHighlight?: boolean
}

export function createTextButtonKit(
  parent: Object3D,
  onSelect: () => void,
  text: string,
  anchor: Pin,
  offset: Pin
) {
  const button = createButton(
    parent,
    () => {
      kit.onSelect()
      button.disabled = true
    },
    Pin.fromPixels(130, BUTTON_HEIGHT),
    anchor,
    offset
  )
  const label = createButtonText(button.mesh, text)
  const kit = {
    button,
    label,
    onSelect
  }
  return kit
}

type ButtonLayoutMode = 'first' | 'hor' | 'vert'
const anchors: { [K in ButtonLayoutMode]: Pin } = {
  first: ReadonlyPin.TopLeft,
  hor: ReadonlyPin.Left,
  vert: ReadonlyPin.TopLeft
}

const offsets: { [K in ButtonLayoutMode]: Pin } = {
  first: ReadonlyPin.TopLeft.cloneOffset(BUTTON_MARGINS, BUTTON_MARGINS),
  hor: ReadonlyPin.Right.cloneOffset(BUTTON_MARGINS, 0),
  vert: ReadonlyPin.BottomLeft.cloneOffset(0, BUTTON_MARGINS)
}

export function createDebugButton(
  parent: Object3D,
  text: string,
  onSelect: () => void,
  mode: ButtonLayoutMode
) {
  const size = Pin.fromPixels(100, BUTTON_HEIGHT)
  const button = createButton(
    parent,
    onSelect,
    size,
    anchors[mode],
    offsets[mode]
  )
  const textMesh = createButtonText2(
    button.mesh,
    text,
    textOptions.debugText,
    textMesh => {
      size.x.offset = textMesh.width + 16
      size.y.offset = textMesh.height + 16
    }
  )
  textMesh.matrix.offset = textMesh.matrix.offset.cloneOffset(0, -2)
  return button
}

export function createCloseDebugOverlay(vis = false) {
  const overlay = createOverlay(undefined, () => debuggables.pop())
  overlay.visible = vis
  overlay.name = 'closeDebugOverlay'
  return overlay
}

export interface Position {
  x: number
  y: number
}

export function getButtonScreenPosition(b: PinnedButton['mesh']): Position {
  return {
    x: toScreenX(
      b.matrixWorld.clipSpacePosX + b.matrixWorld.clipSpaceSizeX / 2
    ),
    y: toScreenY(b.matrixWorld.clipSpacePosY - b.matrixWorld.clipSpaceSizeY / 2)
  }
}
