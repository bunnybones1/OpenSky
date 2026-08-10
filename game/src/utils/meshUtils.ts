import { Box3, Matrix4, Mesh, Object3D } from 'three'

import { vec3HasNaN } from './threeMathUtils'

export function exchangeMesh(oldMesh: Mesh, newMesh: Mesh) {
  const p = oldMesh.parent
  if (!p) {
    throw new Error('Mesh is not a child of anything')
  }
  p.add(newMesh)
  p.remove(oldMesh)
  newMesh.name = oldMesh.name
  newMesh.frustumCulled = oldMesh.frustumCulled
  newMesh.position.copy(oldMesh.position)
  newMesh.rotation.copy(oldMesh.rotation)
  newMesh.scale.copy(oldMesh.scale)
  newMesh.matrix.copy(oldMesh.matrix)
  newMesh.matrixWorld.copy(oldMesh.matrixWorld)
}

const __bbTemp = new Box3()
export function getBounds(node: Object3D) {
  const bb = new Box3()
  node.traverse(n => {
    if (n instanceof Mesh) {
      __bbTemp.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld)
      bb.union(__bbTemp)
    }
  })
  return bb
}
export function getRelativeBounds(root: Object3D, recursive = true) {
  const bb = new Box3()
  const rootInvMatrixWorld = root.matrixWorld.clone().invert() //4 levels deep
  let once = false
  root.traverse(child => {
    if (!recursive) {
      if (once) {
        return
      }
      once = true
    }
    if (child instanceof Mesh) {
      if (
        vec3HasNaN(child.geometry.boundingBox.min) ||
        vec3HasNaN(child.geometry.boundingBox.max)
      ) {
        return
      }

      const relativeMatrix = rootInvMatrixWorld
        .clone()
        .multiply(child.matrixWorld)
      __bbTemp.copy(child.geometry.boundingBox).applyMatrix4(relativeMatrix)
      bb.union(__bbTemp)
    }
  })
  return bb
}

export function getRelativeBoundsSlow(root: Object3D, recursive = true) {
  const bb = new Box3()
  let once = false
  root.traverse(child => {
    if (!recursive) {
      if (once) {
        return
      }
      once = true
    }
    if (child instanceof Mesh) {
      if (
        vec3HasNaN(child.geometry.boundingBox.min) ||
        vec3HasNaN(child.geometry.boundingBox.max)
      ) {
        return
      }

      let parent: Object3D | null = child
      __bbTemp.copy(child.geometry.boundingBox)
      const mat = new Matrix4()
      while (parent && parent !== root) {
        mat.premultiply(parent.matrix)
        parent = parent.parent
      }

      __bbTemp.applyMatrix4(mat)
      bb.union(__bbTemp)
    }
  })
  return bb
}

export function ensureBoundsExist(node: Object3D) {
  node.traverse(n => {
    if (n instanceof Mesh && !n.geometry.boundingBox) {
      n.geometry.computeBoundingBox()
    }
  })
}
