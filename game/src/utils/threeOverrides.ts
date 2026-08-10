import { Object3D } from 'three'

let matrixUpdates = 0
let worldMatrixUpdates = 0
let matrixWorldUpdates = 0
let matrixUpdatesConsidered = 0
let matrixWorldUpdatesConsidered = 0

export function resetMatrixReport() {
  matrixUpdates = 0
  worldMatrixUpdates = 0
  matrixWorldUpdates = 0
  matrixUpdatesConsidered = 0
  matrixWorldUpdatesConsidered = 0
}

export function getMatrixReport() {
  return `[update counters] uM:${matrixUpdates}/${matrixUpdatesConsidered} uMW: ${matrixWorldUpdates}/${matrixWorldUpdatesConsidered} uWM: ${worldMatrixUpdates}`
}

export function initCustomMatrixHandlingOverrides() {
  Object3D.prototype.updateWorldMatrix = function customUpdateWorldMatrix(
    updateParents: boolean,
    updateChildren?: boolean
  ) {
    if (!this.visible) {
      return
    }
    const parent = this.parent

    if (updateParents === true && parent !== null) {
      parent.updateWorldMatrix(true, false)
    }

    if (this.matrixAutoUpdate) {
      this.updateMatrix()
    }

    if (this.parent === null) {
      this.matrixWorld.copy(this.matrix)
    } else {
      this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)
    }

    // update children

    if (updateChildren === true) {
      const children = this.children

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].updateWorldMatrix(false, true)
      }
    }
    worldMatrixUpdates++
  }

  Object3D.prototype.updateMatrix = function customUpdateMatrix() {
    matrixUpdatesConsidered++
    if (this.visible) {
      this.matrix.compose(this.position, this.quaternion, this.scale)
      this.matrixWorldNeedsUpdate = true
      matrixUpdates++
    }
  }

  Object3D.prototype.updateMatrixWorld = function customUpdateMatrixWorld(
    force?: boolean
  ) {
    if (this.matrixAutoUpdate) {
      this.updateMatrix()
    }

    matrixWorldUpdatesConsidered++
    if (this.visible) {
      if (this.matrixWorldNeedsUpdate || force) {
        if (this.parent === null) {
          this.matrixWorld.copy(this.matrix)
        } else {
          this.matrixWorld.multiplyMatrices(
            this.parent.matrixWorld,
            this.matrix
          )
        }

        this.matrixWorldNeedsUpdate = false

        force = true

        matrixWorldUpdates++
      }

      // update children

      const children = this.children

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].updateMatrixWorld(force)
      }
    }
  }
}
