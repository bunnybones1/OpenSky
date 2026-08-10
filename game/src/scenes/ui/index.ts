import { attemptToReorderUiRoots } from '~/helpers/I2D'
import Object2D from '~/meshes/Object2D'
import { removeFromParent } from '~/utils/threeUtils'

import UIContainer from './components/UIContainer'
import UIManager from './components/UIManager'
import {
  getUIContainerOrder,
  SupportedUIContainerNames,
  UIContainerConstructors,
  UIContainerTypes
} from './containers/index'

export class UI {
  allContainersInOne = new Object2D(false)

  manager = new UIManager(this)
  private _containers: Partial<UIContainerTypes> = {}
  constructor() {
    const mwe = this.allContainersInOne.matrix.elements
    mwe[0] = 2
    mwe[1] = 2
    mwe[2] = -1
    mwe[3] = 1
    this.allContainersInOne.name = 'allContainersInOne'
    this.init()
  }

  getContainer<T extends SupportedUIContainerNames>(
    type: T
  ): UIContainerTypes[T] {
    return this._getContainerInternal(type)
  }
  disposeContainer<T extends SupportedUIContainerNames>(type: T) {
    if (this.hasContainer(type)) {
      const c = this.getContainer(type)
      removeFromParent(c)
      this.manager.containersByName.delete(c.name)
      delete this._containers[type]
    }
  }

  getActiveContainers(): UIContainer[] {
    return this.manager.containers.filter(c => c.active)
  }

  hasContainer(type: SupportedUIContainerNames): boolean {
    return !!this._containers[type]
  }

  isContainerActive(type: SupportedUIContainerNames): boolean {
    return !!this._containers[type]?.active
  }

  update(dt: number) {
    for (const container of this.manager.containers) {
      if (container.active) {
        container.update(dt)
      }
    }
    attemptToReorderUiRoots()
  }

  protected async init() {
    //
  }

  private _getContainerInternal<T extends SupportedUIContainerNames>(
    type: T
  ): UIContainerTypes[T] {
    if (this.hasContainer(type)) {
      return (this._containers as UIContainerTypes)[type]!
    } else {
      const constructable = UIContainerConstructors[type]
      const container = new constructable(
        this,
        getUIContainerOrder(constructable)
      ) as UIContainerTypes[T]
      this.allContainersInOne.children.sort(
        (a, b) =>
          getUIContainerOrder(a.constructor as any) -
          getUIContainerOrder(b.constructor as any)
      )
      this._setContainerInternal(type, container)
      return container
    }
  }

  private _setContainerInternal<T extends SupportedUIContainerNames>(
    type: T,
    container: UIContainerTypes[T]
  ) {
    const containers: UIContainerTypes = this._containers as any
    containers[type] = container
  }
}
