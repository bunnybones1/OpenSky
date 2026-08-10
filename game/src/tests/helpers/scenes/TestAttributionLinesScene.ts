import {
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  SphereBufferGeometry,
  Vector3
} from 'three'
import { randFloatSpread } from 'three/src/math/MathUtils'

import { makeAttributionBlueLine } from '~/helpers/makeAttributionLine'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

import { BaseTestScene } from './BaseTestScene'

class TestAttributionLinesScene extends BaseTestScene {
  constructor() {
    super()
    this.scene.add(new HemisphereLight(0x7f9fff, 0x7f4f3f, 1.4))
    const geo = new SphereBufferGeometry(0.05, 32, 16)
    const mat = new MeshStandardMaterial()
    const total = 10
    const balls = Array.from(Array(total).keys()).map(i => {
      const ball = new Mesh(geo, mat)
      this.scene.add(ball)
      const ratio = i / total
      const angle = ratio * Math.PI * 2
      ball.position.set(Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2)
      ball.userData.originalPosition = ball.position.clone()
      return ball
    })

    setInterval(() => {
      const ball = balls[~~(Math.random() * total)]
      const target = (ball.userData.originalPosition as Vector3).clone()
      target.x += randFloatSpread(0.05)
      target.y += randFloatSpread(0.05)
      target.z += randFloatSpread(0.05)
      simpleTweener.to({
        description: 'random motion',
        target: ball.position,
        propertyGoals: { x: target.x, y: target.y, z: target.z },
        easing: Easing.Quadratic.InOut,
        duration: 500
      })
    }, 200)

    setInterval(() => {
      const ball = balls[~~(Math.random() * total)]
      const ball2 = balls[~~(Math.random() * total)]
      if (ball !== ball2) {
        const t = makeAttributionBlueLine(ball, 0, 0.045, 0, ball2, 0, 0.045)
        setTimeout(() => {
          if (t) {
            t.animOut()
          }
        }, 1000)
      }
    }, 1000)
  }
}

export const scene = TestAttributionLinesScene
