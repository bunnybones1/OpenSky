import QuadraticRibbonGeometry from './Geometry'

const __geometryLib = {
  attributionLine: () =>
    new QuadraticRibbonGeometry({
      totalVerts: (16 + 1) * 2,
      widthLookup: v => {
        const iv = 1 - v
        return iv * iv + 0.1
      }
    }),
  funLine: () =>
    new QuadraticRibbonGeometry({
      totalVerts: 60,
      widthLookup: v => {
        const iv = 1 - v
        const i = iv * iv
        return i * (Math.sin(iv * 40) * 0.4 + 0.6) + 0.1
      }
    })
} as const

export type GeometryLibKeys = keyof typeof __geometryLib

const __geometryCache: Map<GeometryLibKeys, QuadraticRibbonGeometry> = new Map()

export function getGeometry(key: GeometryLibKeys) {
  if (!__geometryCache.has(key)) {
    __geometryCache.set(key, __geometryLib[key]())
  }
  return __geometryCache.get(key)!
}
