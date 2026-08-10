import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  InterleavedBufferAttribute,
  Mesh,
  PlaneBufferGeometry,
  Vector3
} from 'three'

import ChamferedBoxBufferGeometry from '../meshes/geometry/ChamferedBoxBufferGeometry'

const __cachedChamferedBoxGeometry = new Map<
  string,
  ChamferedBoxBufferGeometry
>()
export function getCachedChamferedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  chamfer = 0.005
) {
  const key = `${width};${height};${depth};${chamfer};`
  if (!__cachedChamferedBoxGeometry.has(key)) {
    __cachedChamferedBoxGeometry.set(
      key,
      new ChamferedBoxBufferGeometry(width, height, depth, chamfer)
    )
  }
  return __cachedChamferedBoxGeometry.get(key)!
}

export function __experimentalGltfCleanupGeometry(geometry: BufferGeometry) {
  const attrs = geometry.attributes
  const arrayLookup = new Map<
    BufferAttribute | InterleavedBufferAttribute,
    number[]
  >()
  const indexLookup = new Map<number, number>()
  let total = 0
  const attrKeys = Object.keys(attrs)
  for (const attrName of attrKeys) {
    const attr = attrs[attrName]
    arrayLookup.set(attr, [])
    total = attr.count
  }
  const cache = new Map<string, number>()
  let indexCounter = 0
  for (let i = 0; i < total; i++) {
    const keyNumbers: number[] = []
    for (const attrName of attrKeys) {
      const attr = attrs[attrName]
      const ioffset = i * attr.itemSize
      for (let j = 0; j < attr.itemSize; j++) {
        keyNumbers.push(attr.array[ioffset + j])
      }
    }
    const key = keyNumbers.join('-')
    if (cache.has(key)) {
      indexLookup.set(i, cache.get(key)!)
    } else {
      for (const attrName of attrKeys) {
        const attr = attrs[attrName]
        const newArr = arrayLookup.get(attr)!
        const ioffset = i * attr.itemSize
        total = attr.count
        for (let j = 0; j < attr.itemSize; j++) {
          newArr.push(attr.array[ioffset + j])
        }
      }
      indexLookup.set(i, indexCounter)
      cache.set(key, indexCounter)
      indexCounter++
    }
  }
  const oldIndexArr = geometry.index!.array as number[]
  const newIndex = oldIndexArr.map(v => indexLookup.get(v)!)

  for (const attrName of attrKeys) {
    const oldAttr = attrs[attrName]
    const newArr = arrayLookup.get(oldAttr)!
    console.log(
      `Geo clean ${attrName} ${oldAttr.array.length} => ${newArr.length}`
    )
    attrs[attrName] = new Float32BufferAttribute(
      new Float32Array(newArr),
      oldAttr.itemSize,
      oldAttr.normalized
    )
  }
  geometry.setIndex(new BufferAttribute(new Uint16Array(newIndex), 1))
  // attrs.position.array = attrs.position.array.map(v => v + Math.random() * 0.0004)
}

let spriteSheetMeshProtoype: Mesh | null = null

export function getSpriteSheetMesh() {
  if (!spriteSheetMeshProtoype) {
    spriteSheetMeshProtoype = new Mesh(getSharedPlaneBufferGeometry())
    spriteSheetMeshProtoype.scale.multiplyScalar(0.0635)
    spriteSheetMeshProtoype.frustumCulled = false
    spriteSheetMeshProtoype.castShadow = false
    spriteSheetMeshProtoype.rotation.x = Math.PI * -0.5
  }

  return spriteSheetMeshProtoype.clone()
}
const __sharedPlaneBufferGeometries = new Map<string, PlaneBufferGeometry>()
export function getSharedPlaneBufferGeometry(
  uniqueUvs = false,
  backside = false,
  offset?: Vector3,
  size = 1
) {
  const key = `${
    offset ? `${offset.x};${offset.y};${offset.z}` : 'default'
  };${size}`
  if (!__sharedPlaneBufferGeometries.has(key)) {
    const geo = new PlaneBufferGeometry(size, size, 1, 1)
    if (offset) {
      const posArr = geo.attributes.position.array as Float32Array
      for (let i = 0; i < posArr.length; i += 3) {
        posArr[i] += offset.x
        posArr[i + 1] += offset.y
        posArr[i + 2] += offset.z
      }
    }
    if (backside) {
      const faceArr = geo.index!.array as Uint32Array
      for (let i = 0; i < faceArr.length; i += 3) {
        const temp = faceArr[i]
        faceArr[i] = faceArr[i + 1]
        faceArr[i + 1] = temp
      }
    }
    __sharedPlaneBufferGeometries.set(key, geo)
  }
  const geo = __sharedPlaneBufferGeometries.get(key)!
  if (!uniqueUvs) {
    return geo
  } else {
    const clone = geo!.clone()
    clone.attributes.position = geo.attributes.position
    clone.attributes.normal = geo.attributes.normal
    return clone
  }
}

const __sharedRectangle2DBufferGeometry = new Map<number, PlaneBufferGeometry>()
export function getSharedRectangle2DBufferGeometry(yRatio = 1) {
  if (!__sharedRectangle2DBufferGeometry.has(yRatio)) {
    const geo = new PlaneBufferGeometry(1, 1, 1, 1)
    const posAttr = geo.attributes.position
    const posArr = posAttr.array as Float32Array
    const uvAttr = geo.attributes.uv
    const uvArr = uvAttr.array as Float32Array
    geo.attributes.uv2 = geo.attributes.uv
    for (let i = 0; i < posAttr.count; i++) {
      const i2 = i * 2
      const i3 = i * 3
      posArr[i3] += 0.5
      posArr[i3] = 1 - posArr[i3]
      posArr[i3 + 1] += 0.5

      posArr[i3] *= 36
      posArr[i3 + 1] *= -36 * yRatio

      uvArr[i2] = 1 - uvArr[i2]
      uvArr[i2 + 1] *= yRatio
    }
    delete geo.attributes.normal
    __sharedRectangle2DBufferGeometry.set(yRatio, geo)
  }
  return __sharedRectangle2DBufferGeometry.get(yRatio)!
}

export function migrateAttributeFromMorph(
  geo: BufferGeometry,
  index: number,
  attrName: string
) {
  if (geo.morphAttributes.position) {
    if (geo.morphAttributes.position.length > index) {
      const attr = geo.morphAttributes.position[index]
      geo.setAttribute(attrName, attr)
    }
  } else {
    throw new Error('Geometry does not have expected morph targets')
  }
}
