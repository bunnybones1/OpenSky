import { Mesh, MeshBasicMaterial, SphereBufferGeometry } from 'three'

import { emitParticlesFromGeometry } from '~/systems/animation/emitParticlesFromGeometry'

import { BaseTestScene } from './BaseTestScene'

export class TestGeometryEmitterBaseScene extends BaseTestScene {
  constructor() {
    super()
    const mesh = new Mesh(
      new SphereBufferGeometry(0.1, 16, 8, 0, Math.PI),
      new MeshBasicMaterial({ wireframe: true })
    )
    mesh.scale.setScalar(0.5)
    mesh.position.set(0, 0, 0.1)
    mesh.rotation.set(Math.PI * -0.5, 0, 0)
    this.scene.add(mesh)
    emitParticlesFromGeometry(mesh, 'simpleRibbons', 1)
  }
}
export const scene = TestGeometryEmitterBaseScene
