import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { isInNormalizedSpace, lerp } from '@opensky/shared/utils/math'
import { LessDepth, Material, Object3D, Scene } from 'three'

import Matrix2DUI from '~/meshes/Matrix2DUI'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'

const UI_DEPTH_WIGGLE_ROOM = 0.0005
export const UI_DEFAULT_DEPTH = -1 + UI_DEPTH_WIGGLE_ROOM

export interface I2D extends Object3D {
  matrix: Matrix2DUI
  matrixWorld: Matrix2DUI
  modelViewMatrix: Matrix2DUI
  isI2D: true
  shouldRenderAsGroup: boolean
  isOpaque: boolean
}
export function isI2D(x: Object3D): x is I2D {
  return (x as any).isI2D
}

const __uiRootsThatNeedReordering = new Set<Object3D>()

let renderOrder = 0
const renderOrderJump = 0.01
const renderOrderSubJump = 0.0001

function __reorderNaive() {
  for (const root of __uiRootsThatNeedReordering) {
    root.traverse(obj => {
      if (isI2D(obj)) {
        obj.renderOrder = renderOrder + (obj.isOpaque ? -10000 : 0)
        renderOrder += renderOrderJump
      }
    })
  }
}

function __reorderGroupsFlat() {
  for (const root of __uiRootsThatNeedReordering) {
    const nodes: Object3D[] = [root]
    let lastChildOfRow: Object3D = root
    for (const node of nodes) {
      if ((node as any).shouldRenderAsGroup) {
        renderOrder += renderOrderJump
      }
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if ((child as any).isI2D && (child as any).isVisual) {
          child.renderOrder = renderOrder + i * renderOrderSubJump
        }
        if ((child as any).isOpaque) {
          child.renderOrder -= 10000
        }
        nodes.push(child)
      }
      if (node === lastChildOfRow) {
        renderOrder += renderOrderJump
        lastChildOfRow = nodes[nodes.length - 1]
      }
    }
  }
}

let groupIndex: number = 0
let maxRenderOrder = 0
function recurse(
  node: Object3D | Object2D | Mesh2D,
  layerIndex: number,
  siblingIndex: number
) {
  let renderOrder = -1
  if ('isVisual' in node) {
    renderOrder = layerIndex + siblingIndex * renderOrderSubJump + groupIndex
    if (node.isOpaque) {
      node.renderOrder = -100000 - renderOrder
    } else {
      node.renderOrder = renderOrder
    }
    maxRenderOrder = Math.max(renderOrder, maxRenderOrder)
    node.renderOrder -= node.material.depth * 10
  }

  layerIndex += renderOrderJump

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if ((child as any).shouldRenderAsGroup) {
      groupIndex++
    }
    recurse(child, layerIndex, i)
  }
  if ('isVisual' in node) {
    node.material.depthOffset = lerp(
      0,
      -UI_DEPTH_WIGGLE_ROOM,
      renderOrder / maxRenderOrder
    )
  }
}

function __reorderRecursive() {
  groupIndex = 0
  for (const root of __uiRootsThatNeedReordering) {
    recurse(root, 0, 0)
  }
}

const reorderAlgos = [__reorderNaive, __reorderGroupsFlat, __reorderRecursive]
const reorderAlgo = reorderAlgos[2]

const __tabs = '                                                        '

export function attemptToReorderUiRoots() {
  renderOrder = 0
  if (__uiRootsThatNeedReordering.size > 0) {
    reorderAlgo()

    if (queryParams.debugRenderOrder) {
      for (const root of __uiRootsThatNeedReordering) {
        root.traverse(obj => {
          let status = ''
          status += (obj as any).isI2D ? '2D' : '3D'
          status += (obj as any).shouldRenderAsGroup ? '-g' : ''
          status += (obj as any).isVisual ? '-v' : ''
          let depth = 0
          let cursor: Object3D | null = obj
          while (cursor) {
            depth++
            cursor = cursor.parent
          }
          console.log(
            __tabs.slice(0, depth) +
              status +
              '   ' +
              obj.renderOrder +
              '   ' +
              obj.name
          )
        })
      }
    }
    __uiRootsThatNeedReordering.clear()
  }
}

export function markUIRootDirty(cursor: Object3D) {
  while (cursor.parent) {
    cursor = cursor.parent
  }
  if (cursor instanceof Scene) {
    __uiRootsThatNeedReordering.add(cursor)
  }
}

export function proto2DOnAdd(this: I2D) {
  if (!this.parent) {
    return
  }
  markUIRootDirty(this)
}

/**
 *
 * @param thisArg The object to remove from.
 * @param objects The object to to remove. ONLY EVER PASS ONE OBJECT.
 */
export function proto2DRemove(this: I2D) {
  markUIRootDirty(this)
}

export function proto2DAdd(...object: Object3D[]) {
  if (!(arguments.length > 1)) {
    if (!isI2D(object[0])) {
      console.error('Object2D.add: object being added is not 2D.')
    }
  } else {
    console.error(
      'Object2D.add does not support multiple children at once yet.'
    )
  }
}

export function putChildAtBottom(child: I2D) {
  if (child.parent) {
    removeFromArray(child.parent.children, child)
    child.parent.children.unshift(child)
    markUIRootDirty(child.parent)
  }
}
export function isClipCoordWithinObject(
  clipX: number,
  clipY: number,
  obj: I2D
) {
  const matEls = obj.matrixWorld.elements
  const cx = (clipX - matEls[2]) / matEls[0]
  const cy = (clipY - matEls[3]) / -matEls[1]
  return isInNormalizedSpace(cx, cy)
}

export function makeSuperOpaque(node: Mesh2D) {
  node.isOpaque = true
  if (node.material instanceof Material) {
    node.material.transparent = false
    node.material.depthWrite = true
    node.material.depthTest = true
    node.material.depthFunc = LessDepth
  }
}
