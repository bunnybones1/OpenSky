import {
  CuratedPointLayer,
  CuratedRibbonMeshLayer,
  pointSettingsLib,
  ribbonMeshSettingsLib
} from './particleSettingsLib'
import QuadraticPoints from './QuadraticPoints'
import QuadraticPointsGeometry from './QuadraticPoints/Geometry'
import QuadraticRibbonsMesh from './QuadraticRibbonsMesh'
import QuadraticRibbonsGeometry from './QuadraticRibbonsMesh/Geometry'

const __geometryRegistry: Array<
  QuadraticPointsGeometry | QuadraticRibbonsGeometry
> = []

const __ribbonLayerRegistry = new Map<
  CuratedRibbonMeshLayer,
  QuadraticRibbonsMesh
>()
export function getRibbonLayer(name: CuratedRibbonMeshLayer) {
  if (__ribbonLayerRegistry.has(name)) {
    return __ribbonLayerRegistry.get(name)!
  } else {
    const layer = new QuadraticRibbonsMesh(ribbonMeshSettingsLib[name])
    __geometryRegistry.push(layer.geometry)
    __ribbonLayerRegistry.set(name, layer)
    return layer
  }
}
const __pointLayerRegistry = new Map<CuratedPointLayer, QuadraticPoints>()
export function getPointLayer(name: CuratedPointLayer) {
  if (__pointLayerRegistry.has(name)) {
    return __pointLayerRegistry.get(name)!
  } else {
    const layer = new QuadraticPoints(pointSettingsLib[name])
    __geometryRegistry.push(layer.geometry)
    __pointLayerRegistry.set(name, layer)
    return layer
  }
}

export function updateParticleGeometries(dt: number) {
  for (const geometry of __geometryRegistry) {
    geometry.update(dt)
  }
}
