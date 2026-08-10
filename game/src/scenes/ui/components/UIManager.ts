import { removeFromArray } from '@opensky/shared/utils/arrayUtils'

import IInteractive from '~/systems/input/IInteractive'
import input, { underPointer } from '~/systems/input/input'
import { setNextMouseCursor } from '~/utils/cursorUtils'

import { UI } from '..'
import UIContainer from './UIContainer'
export default class UIManager {
  containersByName: Map<string, UIContainer> = new Map()
  containers: UIContainer[] = []
  _currentHover: IInteractive | undefined = undefined

  constructor(private _ui: UI) {
    underPointer.addRoot2D(this._ui.allContainersInOne)
    input.onSelect.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button) {
        if (button.onSelect) {
          button.onSelect(x, y)
        }
        this.setCurrentHover(x, y, button)
      }
    })
    input.onPressStart.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button) {
        if (button.onDown) {
          button.onDown(x, y)
        }
        this.setCurrentHover(x, y, button)
      }
    })
    input.onPressEnd.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button && button.onUp) {
        button.onUp(x, y)
      }
    })
    input.onHoldStart.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button && button.onHoldStart) {
        button.onHoldStart(x, y)
      }
    })
    input.onHoldEnd.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button && button.onHoldEnd) {
        button.onHoldEnd(x, y)
      }
    })
    input.onRightPressEnd.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button && button.onRightPressEnd) {
        button.onRightPressEnd(x, y)
      }
    })
    input.onDragStart.addListener((x, y) => {
      const button = underPointer.collider2D?.interactions
      if (button && button.onDragStart) {
        button.onDragStart(x, y)
      }
    })
    input.onMove.addListener((x, y) => {
      const interactions = underPointer.collider2D?.interactions
      this.setCurrentHover(x, y, interactions)
      if (interactions) {
        setNextMouseCursor(
          interactions.disabled ? 'default' : interactions.cursor
        )
      }
    })
  }

  hasContainer(name: string) {
    return this.containersByName.has(name)
  }

  getContainer(name: string) {
    return this.containersByName.get(name)
  }

  addContainer(container: UIContainer) {
    if (!this.containersByName.has(container.name)) {
      this.containersByName.set(container.name, container)
      this.containers.push(container)
      this.containers.sort((a, b) => a.priority - b.priority)
    } else {
      throw new Error(
        `UIManager: A UIContainer with this name '${container.name} already exists!`
      )
    }
  }
  removeContainer(container: UIContainer) {
    if (this.containersByName.has(container.name)) {
      this.containersByName.delete(container.name)
      removeFromArray(this.containers, container)
      this.containers.sort((a, b) => a.priority - b.priority)
    } else {
      throw new Error(
        `UIManager: A UIContainer with this name '${container.name} doesn't exist!`
      )
    }
  }

  setCurrentHover(x: number, y: number, button: IInteractive | undefined) {
    if (this._currentHover === button) {
      return
    }
    if (this._currentHover) {
      if (this._currentHover.onOut) {
        this._currentHover.onOut(x, y)
      }
    }
    if (button) {
      if (button.onOver) {
        button.onOver(x, y)
      }
    }
    this._currentHover = button
  }
}
