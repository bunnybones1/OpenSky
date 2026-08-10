import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { uiScale } from '@opensky/shared/userSettings'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Vector2 } from 'three'

import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import keyboard from '~/systems/input/keyboard'
import { animationDelay } from '~/utils/asyncUtils'

import { UI } from '..'

interface UIContainerOptions {
  onActivate: () => void
  onDeactivate: () => void
  closeOnEscape?: boolean
  priority: number
}

export default class UIContainer extends Object2D {
  shouldRenderAsGroup = true
  useLayoutHelper = false
  get active() {
    return this._active
  }

  set active(value: boolean) {
    if (this._active === value) {
      return
    }
    if (!this.initd) {
      throw new Error('Not initd yet')
    }
    this._active = value
    this.visible = value

    if (this._active) {
      this.options.onActivate()
    } else {
      this.options.onDeactivate()
    }
  }

  get opacity() {
    return this.opacity
  }

  set opacity(value: number) {
    this.matrix.opacity = value
  }
  static index: number = 0
  ready: Promise<this>
  initd = false
  priority = 0

  options: UIContainerOptions = {
    onActivate: () => undefined,
    onDeactivate: () => undefined,
    closeOnEscape: false,
    priority: 0
  }

  //depth: number

  protected _targetOpacity: number = 0
  private _active = false

  constructor(
    protected ui: UI,
    name: string,
    options: Partial<UIContainerOptions> = {}
  ) {
    super(false)

    this.matrix.anchor = ReadonlyPin.TopLeft
    this.matrix.offset = ReadonlyPin.TopLeft
    this.matrix.size = ReadonlyPin.FullSize
    this.matrix.prescale = new Vector2(1 / 1920, 1 / 1080)

    const onResize = () => this._handleResize()
    uiScale.listen(onResize)
    listenToProperty(renderMetrics, 'uiWidth', onResize)
    listenToProperty(renderMetrics, 'uiHeight', onResize)
    renderMetrics.uiHeight

    Object.assign(this.options, options)

    this.name = name

    this.priority = this.options.priority || 0
    this.ui.allContainersInOne.add(this)

    this.ready = Promise.resolve(this.init()).then(() => {
      this.ui.manager.addContainer(this)
      this.initd = true
      return this
    })

    this.visible = false
    this.opacity = 0

    if (this.options.closeOnEscape) {
      keyboard.listenToKey('Escape', () => {
        if (this._active) {
          this.fadeOut()
        }
      })
    }
  }

  update(dt: number) {
    void dt
    //override this as needed
  }

  toggle(value: boolean) {
    this.active = value
  }

  show() {
    this.active = true
    this.opacity = 1
    this._targetOpacity = 1
  }

  hide() {
    this.active = false
    this.opacity = 0
    this._targetOpacity = 0
  }

  async fadeIn(duration: number = 300) {
    this.active = true
    this.visible = true
    await this._animateOpacity(1, duration)
    this.active = true
    this.visible = true
  }

  async fadeOut(duration: number = 400) {
    await this._animateOpacity(0, duration)
    this.active = false
    this.visible = false
  }

  async fadeInOut(
    durIn: number = 400,
    durStay: number = 750,
    durOut: number = 400
  ) {
    await this.fadeIn(durIn)
    await animationDelay(durStay)
    await this.fadeOut(durOut)
  }

  protected _handleResize() {
    const w = renderMetrics.uiWidth
    const h = renderMetrics.uiHeight
    this.matrix.prescale.x = 2 / w
    this.matrix.prescale.y = 2 / h
  }

  protected init(): void | Promise<void> {
    throw new Error('Not implemented. Please override.')
  }
  protected _animateOpacity(opacity: number, duration: number) {
    if (this._targetOpacity === opacity) {
      return
    }
    this._targetOpacity = opacity
    const anim = simpleTweener.to({
      description: 'UI container opacity',
      target: this.matrix,
      duration,
      propertyGoals: { opacity },
      easing: Easing.Quartic.InOut
    })
    return anim.finished
  }
}

export const SCALE_CONSTANT = device.isMobile ? 0.75 : 1
export const makeMobileScaleingSubContainer = (parent: UIContainer) => {
  const container = new Object2D()
  container.matrix.prescale = new Vector2(SCALE_CONSTANT, SCALE_CONSTANT)
  parent.add(container)
  return container
}
