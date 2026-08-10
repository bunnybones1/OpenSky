import { renderMetrics } from '@opensky/shared/renderMetrics'
import { clamp01, sqr, unlerp } from '@opensky/shared/utils/math'
import { Vector2, Vector3 } from 'three'

import { MOUSE_HIT_TEST_POINTS, TOUCH_HIT_TEST_POINTS } from '~/constants'
import { InputDeviceEventDispatcher } from '~/helpers/InputDeviceEventDispatcher'
import { aimAboveFingerTipAmt, useBigTouchTargets } from '~/userSettings'
import { get2DPositionAtDepth } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { resetNextCursor } from '~/utils/cursorUtils'

import { shouldPointerBeOffsetUp } from './shouldPointerBeOffsetUp'

export const MB_LEFT = 0
export const MB_RIGHT = 2
type MouseButton = typeof MB_LEFT | typeof MB_RIGHT
const MAX_DURATION_OF_SELECT = 500
const MAX_SQRDISTANCE_OF_HOLD_OR_SELECT = sqr(10)
const MIN_DURATION_OF_HOLD = 500

const camera = cameraShaker.camera
const cameraWorldPos = cameraShaker.cameraWorldPos

const __v2 = new Vector2()
export default class GeneralInput {
  isMovedSinceLastFrame = false
  inCanvas = false
  inScreen: boolean

  onAnything = new InputDeviceEventDispatcher()
  onPressStart = new InputDeviceEventDispatcher()
  onPressEnd = new InputDeviceEventDispatcher()
  onHoldStart = new InputDeviceEventDispatcher()
  onHoldEnd = new InputDeviceEventDispatcher()
  onDragStart = new InputDeviceEventDispatcher()
  onDrag = new InputDeviceEventDispatcher()
  onDragEnd = new InputDeviceEventDispatcher()
  onMove = new InputDeviceEventDispatcher()
  onSelect = new InputDeviceEventDispatcher()
  onRightPressStart = new InputDeviceEventDispatcher()
  onRightPressEnd = new InputDeviceEventDispatcher()
  onWheel = new InputDeviceEventDispatcher<
    [deltaX: number, deltaY: number, deltaZ: number, deltaMode: number]
  >()
  isPressed = false
  isRightPressed = false
  positionPixels = new Vector2()
  positionClipspace = new Vector2()
  raycastHitTestPoints: ReadonlyArray<readonly [number, number]> =
    MOUSE_HIT_TEST_POINTS
  private now: number = 0
  private positionPixelsLastFrame = new Vector2()

  private positionPixelsAtStartOfPress = new Vector2()
  private timeAtStartOfPress = 0
  private isHolding = false
  private isDragging = false

  get3DPosition(depth: number = 0): Vector3 {
    return get2DPositionAtDepth(
      camera,
      cameraWorldPos,
      this.positionClipspace.x,
      this.positionClipspace.y,
      depth
    )
  }

  movedEnough(x: number, y: number, distSqr: number) {
    __v2.set(x, y)
    return this.positionPixelsAtStartOfPress.distanceToSquared(__v2) > distSqr
  }

  stayedEnoughToHoldOrSelect(x: number, y: number) {
    return !this.movedEnough(x, y, MAX_SQRDISTANCE_OF_HOLD_OR_SELECT)
  }

  set isTouch(val: boolean) {
    this.raycastHitTestPoints =
      val && useBigTouchTargets.value
        ? TOUCH_HIT_TEST_POINTS
        : MOUSE_HIT_TEST_POINTS
  }

  processWheel(
    clientX: number,
    clientY: number,
    time: number,
    deltaX: number,
    deltaY: number,
    deltaZ: number,
    deltaMode: number,
    target: any
  ) {
    this.processPosition(clientX, clientY, time, false, undefined, target)
    this.onWheel.dispatch(deltaX, deltaY, deltaZ, deltaMode)
  }

  processPosition(
    x: number,
    y: number,
    time: number,
    pressed: boolean,
    button: MouseButton | undefined,
    target: any
  ) {
    if (
      this.isDragging &&
      shouldPointerBeOffsetUp.value &&
      aimAboveFingerTipAmt.value > 0
    ) {
      const h = window.innerHeight
      const percent = (aimAboveFingerTipAmt.value + 9) * 0.01
      y -= (1 - clamp01(unlerp(h * 0.8, h * 0.9, y))) * h * percent
    }
    // try {

    this.positionClipspace.set(
      (x / renderMetrics.width) * 2 - 1,
      -(y / renderMetrics.height) * 2 + 1
    )
    this.inCanvas = target instanceof Element && target.nodeName === 'CANVAS'

    this.onAnything.dispatch(x, y)

    if (button === MB_LEFT) {
      if (pressed) {
        if (!this.isPressed) {
          //press down
          this.timeAtStartOfPress = time
          this.positionPixelsAtStartOfPress.set(x, y)
          this.onPressStart.dispatch(x, y)
        }
        //
        if (!this.isDragging && !this.stayedEnoughToHoldOrSelect(x, y)) {
          if (this.isHolding) {
            this.onHoldEnd.dispatch(x, y)
            this.isHolding = false
          }
          this.isDragging = true
          this.onDragStart.dispatch(
            this.positionPixelsAtStartOfPress.x,
            this.positionPixelsAtStartOfPress.y
          )
        }
        if (this.isDragging) {
          this.onDrag.dispatch(x, y)
        }
      } else if (!pressed) {
        //release
        if (this.isHolding) {
          this.onHoldEnd.dispatch(x, y)
          this.isHolding = false
        }
        if (this.isDragging) {
          this.onDragEnd.dispatch(x, y)
          this.isDragging = false
        }
        if (this.isPressed) {
          if (
            time - this.timeAtStartOfPress < MAX_DURATION_OF_SELECT &&
            this.stayedEnoughToHoldOrSelect(x, y)
          ) {
            this.onSelect.dispatch(
              this.positionPixelsAtStartOfPress.x,
              this.positionPixelsAtStartOfPress.y
            )
          }
          this.onPressEnd.dispatch(x, y)
        }
      }
      this.isPressed = pressed
    } else if (button === MB_RIGHT) {
      // Right Click
      if (pressed) {
        if (!this.isRightPressed) {
          // press down
          this.onRightPressStart.dispatch(x, y)
        }
      } else if (!pressed) {
        //release
        if (this.isRightPressed) {
          this.onRightPressEnd.dispatch(x, y)
        }
      }
      this.isRightPressed = pressed
    }

    if (this.positionPixels.x !== x || this.positionPixels.y !== y) {
      resetNextCursor()
      this.onMove.dispatch(x, y)
    }
    this.positionPixels.set(x, y)

    this.now = time
    // } catch (err) {
    //   abort(err)
    // }
  }

  update(dt: number) {
    this.now += dt * 1000
    this.isMovedSinceLastFrame = !this.positionPixels.equals(
      this.positionPixelsLastFrame
    )
    this.positionPixelsLastFrame.copy(this.positionPixels)

    if (
      this.isPressed &&
      !this.isHolding &&
      !this.isDragging &&
      this.now - this.timeAtStartOfPress > MIN_DURATION_OF_HOLD &&
      this.stayedEnoughToHoldOrSelect(
        this.positionPixels.x,
        this.positionPixels.y
      )
    ) {
      this.isHolding = true
      this.onHoldStart.dispatch(
        this.positionPixelsAtStartOfPress.x,
        this.positionPixelsAtStartOfPress.y
      )
    }
  }
}
