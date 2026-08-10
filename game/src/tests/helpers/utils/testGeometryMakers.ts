import {
  BoxBufferGeometry,
  BufferGeometry,
  DodecahedronBufferGeometry,
  IcosahedronBufferGeometry,
  OctahedronBufferGeometry,
  SphereBufferGeometry,
  TetrahedronBufferGeometry,
  TorusBufferGeometry,
  TorusKnotBufferGeometry
} from 'three'

import LumpySphereBufferGeometry from '~/meshes/geometry/LumpySphereBufferGeometry'
import { getCachedChamferedBoxGeometry } from '~/utils/geometry'

const testGeometryMakers: Array<() => BufferGeometry> = [
  () => new SphereBufferGeometry(1, 32, 16),
  () => new TorusKnotBufferGeometry(1, 0.4, 64, 16),
  () => new TorusBufferGeometry(1, 0.5, 32, 16),
  () => new LumpySphereBufferGeometry(1, 32, 16, 8, 0.025),
  () => new LumpySphereBufferGeometry(1, 64, 32, 16, 0.05),
  () => new LumpySphereBufferGeometry(1, 64, 32, 8, 0.175),
  () => getCachedChamferedBoxGeometry(2, 2, 2, 0.15),
  () => getCachedChamferedBoxGeometry(2, 2, 2, 0.05),
  () => new BoxBufferGeometry(1.8, 1.8, 1.8, 1, 1, 1),
  () => new TetrahedronBufferGeometry(1.8, 0),
  () => new OctahedronBufferGeometry(1.8, 0),
  () => new IcosahedronBufferGeometry(1.8, 0),
  () => new DodecahedronBufferGeometry(1.8, 0)
]

const __cache: BufferGeometry[] = []
export const cachedTestGeometryMakers: Array<() => BufferGeometry> =
  testGeometryMakers.map((maker, i) => {
    return () => {
      if (!__cache[i]) {
        __cache[i] = maker()
      }
      return __cache[i]
    }
  })
