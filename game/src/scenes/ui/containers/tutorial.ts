import { renderMetrics } from '@opensky/shared/renderMetrics'
import { MessageStep, Target } from '@opensky/shared/tutorialConfig'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import { getAssetsManager } from '~/assets'
import { COLOR_DARK_BLUE_GRADIENT } from '~/colors/colorLibrary'
import TransformComponent from '~/components/TransformComponent'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { setupDone } from '~/helpers/setupHelper'
import HighlightOverlayMaterial from '~/materials/HighlightOverlayMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { scene } from '~/scenes/arena/scene'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import HelperCube, {
  getTargetProps,
  onBaseTargetAnimationTick
} from '~/tutorial/HelperCube'
import { getUVSpace } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import { waitForNextFrame } from '~/utils/onNextFrame'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

const { camera } = cameraShaker

const SPEECHBUBBLE_FADE_DURATION = 200
const __twoArr = [0, 1] as const
const textWidth = 224
const bubbleMargin = 10
export default class TutorialContainer extends UIContainer {
  helperCube: HelperCube
  currentHighlightResizeCallbacks: Array<() => void> = []
  helperCubeReady: Promise<void>

  constructor(ui: UI, priority: number) {
    super(ui, 'tutorial', {
      priority
    })
  }

  async show() {
    super.show()
    await setupDone
    this.helperCube.start()
  }

  protected async init() {
    let onHelperCubeReady: (() => void) | undefined
    this.helperCubeReady = new Promise<void>(resolve => {
      onHelperCubeReady = resolve
    })
    await new Promise<void>(resolve => {
      listenToProperty(TransformComponent, 'defaultScene', v => {
        if (v) {
          resolve()
        }
      })
    })

    const cube = getAssetsManager().loadAsset('tutorialCube')
    await onGlobalUiAccessReady
    const actionHistoryContainer =
      globalAccess.ui!.getContainer('actionHistory')
    actionHistoryContainer.sidebar.onAnimate(() => {
      this.currentHighlightResizeCallbacks.forEach(cb => cb())
    })

    renderMetrics.onSizeChange(() => {
      this.currentHighlightResizeCallbacks.forEach(cb => cb())
    })
    await cube
    await getAssetsManager().loadAsset('audioFxTutorial')
    this.helperCube = new HelperCube()
    onHelperCubeReady!()

    scene.add(this.helperCube.container)
    this.helperCube.container.updateMatrix()
    this.helperCube.container.updateMatrixWorld(true)

    const highlightOverlayMaterial = new HighlightOverlayMaterial({})
    const highlightOverlay = new RectangleMesh(highlightOverlayMaterial)
    highlightOverlay.matrix.setColor(COLOR_DARK_BLUE_GRADIENT, 0.5)
    highlightOverlay.matrix.opacity = 0
    highlightOverlay.matrix.setConstraints(
      new Pin(1, 1),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    highlightOverlay.visible = false

    this.add(highlightOverlay)

    const highlightTargets: Array<Target | undefined> = []
    this.helperCube.onHighlight(targets => {
      if (targets.length) {
        highlightOverlay.visible = true
        simpleTweener.to({
          description: 'show overlay',
          target: highlightOverlay.matrix,
          propertyGoals: {
            opacity: 1
          },
          duration: 400
        })

        highlightOverlayMaterial.clearHighlights()
        this.currentHighlightResizeCallbacks = []

        for (const i of __twoArr) {
          if (targets[i]) {
            const target = targets[0]
            const { radius } = getTargetProps(target)
            const updatePosition = () => {
              const { position, radius, skew } = getTargetProps(target)
              const uvPosition = getUVSpace(camera, position)
              highlightOverlayMaterial[`setHighlight${i}` as const](
                uvPosition,
                radius,
                skew
              )
            }
            this.currentHighlightResizeCallbacks.push(updatePosition)
            onBaseTargetAnimationTick(target, () =>
              this.currentHighlightResizeCallbacks.forEach(c => c())
            )
            if (highlightTargets[i] !== target) {
              highlightTargets[i] = target
              highlightOverlayMaterial.uniforms[
                `highlight${i}` as const
              ].value.z = 1
              simpleTweener.to({
                description: 'fade out highlight',
                target:
                  highlightOverlayMaterial.uniforms[`highlight${i}` as const]
                    .value,
                propertyGoals: {
                  z: radius
                },
                duration: 400
              })
            }
          } else {
            highlightTargets[i] = undefined
          }
        }
      } else {
        highlightTargets.length = 0
        simpleTweener.to({
          description: 'fade out highlight',
          target: highlightOverlayMaterial,
          propertyGoals: {
            opacity: 0
          },
          duration: 400,
          onComplete() {
            highlightOverlay.visible = false
          }
        })
      }
    })
  }
  async showSpeechBubble(
    message: MessageStep,
    pin: Pin,
    animationCharactersPerSecond?: number
  ) {
    const container = new Object2D()
    container.matrix.setConstraints(
      new SizePin(0.1, 0.1, 1, 'y', -10, -10),
      ReadonlyPin.Center,
      pin
    )
    this.add(container)
    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box',
      true,
      true
    )
    listenToProperty(pin.x, 'offset', v => {
      const leftSide = v < renderMetrics.uiWidth * 0.75
      bg.matrix.setConstraints(
        undefined,
        leftSide ? ReadonlyPin.Left : ReadonlyPin.Right,
        leftSide ? ReadonlyPin.Right : ReadonlyPin.Left
      )
    })
    container.add(bg)

    const textMesh = new UITextMesh(
      [{ text: message.text, color: 0xc5b4f5 }],
      {
        ...textOptions.infoFlyoutBody,
        size: 22,
        vAlign: 'center',
        width: textWidth
      },
      undefined,
      undefined,
      undefined,
      textMesh => {
        const width = textWidth + bubbleMargin * 2
        const height = textMesh.height + bubbleMargin * 2

        bg.matrix.setConstraints(Pin.fromPixels(width, height))
      },
      undefined,
      animationCharactersPerSecond
    )
    textMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(bubbleMargin, 0)
    )
    bg.add(textMesh)
    bg.matrix.opacity = 0

    await waitForNextFrame()
    // Fade in Speech bubble
    await Promise.all([
      simpleTweener.to({
        description: 'speech bubble bg in',
        target: bg.matrix,
        propertyGoals: {
          opacity: 1
        },
        duration: SPEECHBUBBLE_FADE_DURATION,
        easing: Easing.Quartic.Out
      }).finished
    ])
    return container
  }

  async closeSpeechBubble(bubble: Object2D) {
    // Fade out speech bubble
    await simpleTweener.to({
      description: 'speech bubble bg out',
      target: bubble.matrix,
      propertyGoals: {
        opacity: 0
      },
      duration: SPEECHBUBBLE_FADE_DURATION,
      easing: Easing.Quartic.Out
    }).finished
    this.remove(bubble)
  }
}
