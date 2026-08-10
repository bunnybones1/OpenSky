import { Object3D, Vector3 } from 'three'

import { decorateMethodAfter } from '~/utils/jsUtils'

class WorldPositionCacheManager {
  private worldPositions: Vector3[] = []
  private nodes: Object3D[] = []
  private cleaners: Array<() => void> = []
  private registryCounts: number[] = []
  update() {
    return
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].getWorldPosition(this.worldPositions[i])
    }
  }
  register(node: Object3D) {
    if (!this.nodes.includes(node)) {
      const wPos = new Vector3()
      this.cleaners.push(
        decorateMethodAfter(node, 'updateMatrixWorld', () => {
          wPos.setFromMatrixPosition(node.matrixWorld)
        })
      )
      node.updateMatrixWorld()
      this.nodes.push(node)
      this.worldPositions.push(wPos)
      this.registryCounts.push(1)
      return wPos
    } else {
      const i = this.nodes.indexOf(node)
      this.registryCounts[i]++
      return this.worldPositions[i]
    }
  }
  once(node: Object3D) {
    if (this.nodes.includes(node)) {
      const pos = this.register(node)
      this.unregister(node)
      return pos
    } else {
      return node.getWorldPosition(new Vector3())
    }
  }
  unregister(node: Object3D) {
    const i = this.nodes.indexOf(node)
    if (i !== -1) {
      this.registryCounts[i]--
      if (this.registryCounts[i] === 0) {
        this.registryCounts.splice(i, 1)
        this.nodes.splice(i, 1)
        this.worldPositions.splice(i, 1)
        this.cleaners[i]()
        this.cleaners.splice(i, 1)
      }
    }
  }
}

const worldPositionCacheManager = new WorldPositionCacheManager()

export default worldPositionCacheManager
