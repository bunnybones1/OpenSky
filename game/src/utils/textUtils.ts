import { Euler, Object3D } from 'three'

import TextMesh, { TextValue } from '../systems/text/TextMesh'
import { TextMeshEffect } from '../systems/text/textMeshEffects'
import { TextOptions } from '../systems/text/TextOptions'

export function addDynamicText<
  K extends string,
  T extends { [I in K]: TextValue }
>(
  parent: Object3D,
  obj: T,
  propName: K,
  options: TextOptions,
  x: number,
  y: number,
  z: number,
  textMeshEffect?: TextMeshEffect,
  optimizeRenderOrder?: boolean
) {
  return addText(
    parent,
    obj[propName],
    options,
    x,
    y,
    z,
    obj,
    propName,
    textMeshEffect,
    optimizeRenderOrder
  )
}

const ANGLE_UP = new Euler(Math.PI * -0.5, 0, 0)

export function addText(
  parent: Object3D,
  text: TextValue,
  options: TextOptions,
  x: number,
  y: number,
  z: number,
  obj?: any,
  propName?: string,
  textMeshEffect?: TextMeshEffect,
  optimizeRenderOrder?: boolean,
  onMeasurementsUpdated?: (mesh: TextMesh) => void
) {
  const t = new TextMesh(
    text,
    options,
    obj,
    propName,
    textMeshEffect,
    onMeasurementsUpdated,
    optimizeRenderOrder
  )
  t.position.set(x, y, z)
  t.rotation.copy(ANGLE_UP)
  parent.add(t)
  return t
}
