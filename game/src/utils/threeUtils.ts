import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  InterleavedBufferAttribute,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Scene,
  SphereBufferGeometry,
  Vector3
} from 'three'

import { I2D, markUIRootDirty } from '~/helpers/I2D'
import PrerenderKit from '~/helpers/PrerenderKit'
import { DepthMaterial2D } from '~/meshes/Mesh2D'

import { COLOR_WHITE } from '../colors/colorLibrary'
import Box3Helper from './helpers/Box3Helper'

export class FailedToFindObject3DByName extends Error {}

export const maybeFindObject3DByName = <T extends Object3D>(
  base: Object3D,
  name: string,
  findPossiblyNestedMesh = false
): T | undefined => {
  const result: T | undefined = base.getObjectByName(name) as T
  if (result) {
    if (!findPossiblyNestedMesh) {
      return result as T
    } else {
      if (result instanceof Mesh) {
        return result as T
      } else {
        const mesh = result.children.find(m => m instanceof Mesh)
        if (mesh) {
          return mesh as unknown as T
        } else {
          console.warn(
            `findPossiblyNestedMesh failed to find subMesh named ${name} in ${
              base as any
            }`
          )
          return result as T
        }
      }
    }
  } else {
    return
  }
}
export const findObject3DByName = <T extends Object3D>(
  base: Object3D,
  name: string,
  findPossiblyNestedMesh = false
): T => {
  const result: T | undefined = base.getObjectByName(name) as T
  if (result) {
    if (!findPossiblyNestedMesh) {
      return result as T
    } else {
      if (result instanceof Mesh) {
        return result as T
      } else {
        const mesh = result.children.find(m => m instanceof Mesh)
        if (mesh) {
          return mesh as unknown as T
        } else {
          console.warn(
            `findPossiblyNestedMesh failed to find subMesh named ${name} in ${base.constructor} ${base.name}`
          )
          return result as T
        }
      }
    }
  } else {
    throw new FailedToFindObject3DByName(
      `Child named ${name} not found in ${base.constructor} ${base.name}`
    )
  }
}

const findObject3DsByName = <T extends Object3D>(
  base: Object3D,
  name: string,
  findPossiblyNestedMesh = false
): T[] => {
  const results: T[] = []
  base.traverse(child => {
    if (child.name === name) {
      results.push(child as T)
    }
  })
  if (results.length > 0) {
    if (!findPossiblyNestedMesh) {
      return results as T[]
    } else {
      return results.map(result => {
        if (result instanceof Mesh) {
          return result as T
        } else if (result.children[0] instanceof Mesh) {
          return result.children[0] as unknown as T
        } else {
          console.warn(
            `findPossiblyNestedMesh failed to find subMesh named ${name} in ${base.constructor} ${base.name}`
          )
          return result as T
        }
      })
    }
  } else {
    throw new FailedToFindObject3DByName(
      `Child named ${name} not found in ${base.constructor} ${base.name}`
    )
  }
}

export const findObject3DsWhoseNamesInclude = <T extends Object3D>(
  base: Object3D,
  subName: string,
  findPossiblyNestedMesh = false
): T[] => {
  const results: T[] = []

  base.traverse(o => {
    if (o.name.includes(subName)) {
      if (!findPossiblyNestedMesh) {
        results.push(o as T)
      } else {
        if (o instanceof Mesh) {
          results.push(o as unknown as T)
        } else if (o.children[0] instanceof Mesh) {
          results.push(o.children[0] as unknown as T)
        } else {
          console.warn(
            `findPossiblyNestedMesh failed to find subMesh named ${subName} in ${base.constructor} ${base.name}`
          )
          results.push(o as T)
        }
      }
    }
  })

  return results
}

export const findAllMeshesUsingMaterial = (
  base: Object3D,
  material: Material
): Mesh[] => {
  const result: Mesh[] = []
  base.traverse(mesh => {
    if (
      mesh instanceof Mesh &&
      mesh.material instanceof Material &&
      mesh.material.name === material.name
    ) {
      result.push(mesh)
    }
  })
  return result
}

export const removeObject3DByName = (base: Object3D, name: string) => {
  const child = findObject3DByName(base, name)
  removeFromParent(child)
}

type Object3DCallback<T> = (obj: T) => any
export const modify3DObjects = <T extends Object3D>(
  base: Object3D,
  name: string | string[],
  modification: Object3DCallback<T>,
  findPossiblyNestedMesh = false
) => {
  if (name instanceof Array) {
    ;(name as string[]).forEach(name =>
      findObject3DsByName(base, name, findPossiblyNestedMesh).forEach(
        modification
      )
    )
  } else {
    findObject3DsByName(base, name, findPossiblyNestedMesh).forEach(
      modification
    )
  }
}

export const modify3DObjectsWhoseNamesInclude = <T extends Object3D>(
  base: Object3D,
  subName: string,
  modification: Object3DCallback<T>
) => {
  findObject3DsWhoseNamesInclude(base, subName).forEach(modification)
}

export function replaceObject3D<T extends Object3D>(
  oldObj: Object3D,
  newObj: T
) {
  if (oldObj.parent) {
    oldObj.parent.add(newObj)
    oldObj.parent.remove(oldObj)
  }
  newObj.position.copy(oldObj.position)
  newObj.rotation.copy(oldObj.rotation)
  newObj.quaternion.copy(oldObj.quaternion)
  newObj.scale.copy(oldObj.scale)
  newObj.matrix.copy(oldObj.matrix)
  newObj.matrixWorld.copy(oldObj.matrixWorld)
  for (let i = oldObj.children.length - 1; i >= 0; i--) {
    newObj.add(oldObj.children[i])
  }
  return newObj
}

export function findMaterialByName(
  base: Object3D,
  name: string
): Material | undefined {
  let mat: Material | undefined
  for (const child of base.children) {
    if (
      child instanceof Mesh &&
      child.material instanceof Material &&
      child.material.name === name
    ) {
      mat = child.material
      break
    }
  }
  if (mat) {
    return mat
  }
  for (const child of base.children) {
    mat = findMaterialByName(child, name)
    if (mat) {
      return mat
    }
  }
  return mat
}

export const getMaterialFromMesh = <T extends Material>(
  base: Object3D,
  name: string
): T => {
  let candidate = findObject3DByName<Mesh>(base, name).material
  if (!(candidate instanceof Material)) {
    console.warn(
      `Could not find a material on ${name}. Could be an array or null?`
    )
    candidate = new MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true
    })
  }
  return candidate as T
}

const replaceMaterial = (
  base: Object3D,
  oldMaterial: Material,
  newMaterial: Material
) => {
  base.traverse(obj => {
    if (
      obj instanceof Mesh &&
      obj.material instanceof Material &&
      obj.material.name === oldMaterial.name
    ) {
      obj.material = newMaterial
    }
  })
  newMaterial.name = oldMaterial.name
}

type MaterialTransformCallback<T extends Material, T2 extends Material> = (
  obj: T
) => T2
export const transformAllMaterialInstancesOfMesh = <
  T extends Material,
  T2 extends Material
>(
  base: Object3D,
  name: string,
  materialTransform: MaterialTransformCallback<T, T2>
) => {
  const oldMaterial: T = getMaterialFromMesh(base, name)
  const newMaterial = materialTransform(oldMaterial)
  replaceMaterial(base, oldMaterial, newMaterial)
}

type MeshTransformCallback = (base: Mesh) => void
export const transformAllMeshesSharingMaterial = (
  base: Object3D,
  name: string,
  meshTransform: MeshTransformCallback
) => {
  const sharedMaterial = getMaterialFromMesh(base, name)
  findAllMeshesUsingMaterial(base, sharedMaterial).forEach(meshTransform)
}

const DEFAULT_BB_DEPTH = 3
let firstDepth = true
function getDeepBoundingBox(node: Object3D, limit: number = DEFAULT_BB_DEPTH) {
  const root = firstDepth
  if (firstDepth) {
    firstDepth = false
  }
  node.updateMatrix()
  let bb: Box3 | undefined
  if (
    node instanceof Mesh &&
    node.visible &&
    (node.material as Material).visible
  ) {
    if (!node.geometry.boundingBox) {
      node.geometry.computeBoundingBox()
    }
    const tempBb = node.geometry.boundingBox
    //blank Text Meshes have bad bounding boxes. Hotfix
    if (
      !isNaN(tempBb.min.x) &&
      !isNaN(tempBb.max.x) &&
      !isNaN(tempBb.min.y) &&
      !isNaN(tempBb.max.y) &&
      !isNaN(tempBb.min.z) &&
      !isNaN(tempBb.max.z)
    ) {
      bb = tempBb.clone()
    }
  }
  if (!root && bb) {
    bb.applyMatrix4(node.matrix)
  }
  if (limit > 0) {
    node.children.forEach(child => {
      const childBb = getDeepBoundingBox(child, limit - 1)
      if (childBb) {
        if (!root) {
          childBb.applyMatrix4(node.matrix)
        }
        if (!bb) {
          bb = childBb
        } else {
          bb.union(childBb)
        }
      }
    })
  }
  if (root) {
    firstDepth = true
  }
  return bb
}
void getDeepBoundingBox

export function getHierarchicalMatrix(stopParent: Object3D, cursor: Object3D) {
  const mat = new Matrix4()
  while (cursor && cursor.parent && cursor !== stopParent) {
    mat.premultiply(cursor.matrix)
    cursor = cursor.parent
  }
  if (cursor !== stopParent) {
    throw new Error(
      'The provided cursor is not a child or subchild of the provided stopParent'
    )
  }
  return mat
}

export function isOrHasChild(stopParent: Object3D, cursor: Object3D) {
  while (cursor && cursor.parent && cursor !== stopParent) {
    cursor = cursor.parent
  }
  return cursor === stopParent
}

export const makeBox3Helper = (bb: Box3, color?: Color) => {
  return new Box3Helper(bb, color)
}

export function isDecendantOf(node: Object3D, ancestor: Object3D): boolean {
  while (node) {
    if (node === ancestor) {
      return true
    }
    node = node.parent!
  }
  return false
}

export const findContainingScene = (obj: Object3D) => {
  let cursor = obj
  while (!(cursor instanceof Scene) && cursor.parent) {
    cursor = cursor.parent
  }
  if (cursor instanceof Scene) {
    return cursor as Scene
  } else {
    return undefined
  }
}

export const isDeeplyVisible = (obj: Object3D) => {
  let cursor = obj
  while (cursor.parent) {
    if (!cursor.visible) {
      return false
    }
    cursor = cursor.parent
  }
  return true
}

let ballHelperGeo: SphereBufferGeometry | undefined
export function makeBallHelper(radius: number, color: Color = COLOR_WHITE) {
  if (!ballHelperGeo) {
    ballHelperGeo = new SphereBufferGeometry(1, 16, 12)
  }
  const mesh = new Mesh(
    ballHelperGeo,
    new MeshBasicMaterial({
      color,
      depthTest: true,
      depthWrite: true,
      transparent: true,
      opacity: 1,
      fog: false
    })
  )
  mesh.scale.set(radius, radius, radius)
  mesh.renderOrder = 10000
  return mesh
}

const __tempNormal = new Vector3()
const onceRegistry = new Set<BufferGeometry>()
export function intensifyNormals(mesh: Mesh, strength: number, once = true) {
  if (once) {
    if (!onceRegistry.has(mesh.geometry)) {
      onceRegistry.add(mesh.geometry)
    } else {
      return
    }
  }
  const normalAttr = (mesh.geometry as BufferGeometry).attributes.normal
  const arr = normalAttr.array as Float32Array
  if (normalAttr instanceof BufferAttribute) {
    for (let i = 0; i < normalAttr.count; i++) {
      const i3 = i * 3
      __tempNormal.fromBufferAttribute(normalAttr, i)
      __tempNormal.y /= strength
      __tempNormal.normalize()
      __tempNormal.toArray(arr, i3)
    }
  } else if (normalAttr instanceof InterleavedBufferAttribute) {
    const normalAttrData = normalAttr.data
    const stride = normalAttrData.stride
    for (
      let i = 0, i2 = normalAttr.offset;
      i < normalAttr.count;
      i++, i2 += stride
    ) {
      __tempNormal.fromArray(normalAttrData.array, i2)
      __tempNormal.y /= strength
      __tempNormal.normalize()
      __tempNormal.toArray(arr, i2)
    }
  }
}

let __prerenderKit: PrerenderKit
export function getPrerenderKit() {
  if (!__prerenderKit) {
    __prerenderKit = new PrerenderKit()
  }
  return __prerenderKit
}

export interface RenderGroup {
  start: number
  count: number
  materialIndex?: number | undefined
}

export interface UpdateRange {
  offset: number
  count: number
}

export function maybeFindMeshByName(parent: Object3D, name: string) {
  for (const c of parent.children) {
    if (c.name === name && c instanceof Mesh) {
      return c
    }
  }
  return undefined
}

export function removeFromParent(target: Object3D) {
  if (target.parent) {
    target.parent.remove(target)
  }
}

export function traverseVisible(base: Object3D, cb: (obj: Object3D) => void) {
  if (base.visible) {
    cb(base)
    for (const child of base.children) {
      traverseVisible(child, cb)
    }
  }
}

export function recursivelySetDepth(base: Object3D & I2D, depth: number) {
  base.traverse(m => {
    if (m instanceof Mesh) {
      ;(m.material as DepthMaterial2D).depth = depth
    }
  })
  markUIRootDirty(base)
}

// export function logTree(obj: Object3D, logger: (obj: Object3D) => string) {
//   const trav = (obj: Object3D) => {
//     console.group(logger(obj))
//     obj.children.forEach(trav)
//     console.groupEnd()
//   }
//   trav(obj)
// }
