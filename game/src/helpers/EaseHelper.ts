import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleBufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial
} from 'three'

import { makeHSL } from '~/colors/utils'
import Line2DMaterial from '~/materials/Line2DMaterial'
import RectangleMaterial from '~/materials/RectangleMaterial'
import { Line2D } from '~/meshes/Line2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Ease } from '~/systems/animation/Easing'

export default class EaseHelper extends RectangleMesh {
  constructor(ease: Ease | Ease[]) {
    super(new RectangleMaterial({}))
    this.matrix.setColor(new Color(0x000000), 0.5)
    const eases = ease instanceof Array ? ease : [ease]

    for (let i = 0; i < eases.length; i++) {
      const ease = eases[i]
      const lineGeo = new BufferGeometry()
      const totalVerts = 800
      const posArr = new Float32Array(totalVerts * 3)
      for (let i = 0, i3 = 0; i <= totalVerts; i++, i3 += 3) {
        const ratio = i / (totalVerts - 1)
        posArr[i3] = ratio
        posArr[i3 + 1] = 1 - ease(ratio)
        posArr[i3 + 2] = 0
      }
      lineGeo.setAttribute('position', new BufferAttribute(posArr, 3, false))
      const lineMesh = new Line2D(
        lineGeo,
        new Line2DMaterial({
          color: makeHSL((3 - i) / Math.max(6, eases.length), 1, 0.6)
        })
      )
      this.add(lineMesh)
      // TODO fix this UI vvvvv
      // lineMesh.matrix.setConstraints(
      //   new Pin(1, 1, -2, -2),
      //   ReadonlyPin.TopLeft,
      //   ReadonlyPin.TopLeft
      // )
    }

    const fastForwardTargetMesh = new Mesh(
      new CircleBufferGeometry(12, 32),
      new MeshBasicMaterial({ color: new Color(0x7fff7f), side: BackSide })
    )
    fastForwardTargetMesh.position.z = -1
  }
}
