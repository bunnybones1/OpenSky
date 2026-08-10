import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Object3D
} from 'three'

const defaultColor = new Color(0x007fff)

const THIN = 0.0005

let geometry: BufferGeometry

const getGeometry = (): BufferGeometry => {
  if (!geometry) {
    const indices = new Uint16Array([
      0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7
    ])
    const positions = [
      0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
      -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5
    ]
    geometry = new BufferGeometry()
    geometry.setIndex(new BufferAttribute(indices, 1))
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  }
  return geometry
}

export default class Box3Helper extends LineSegments {
  box: Box3
  constructor(box: Box3, color: Color = defaultColor) {
    super(getGeometry(), new LineBasicMaterial({ color }))
    this.box = box
    this.geometry.computeBoundingSphere()
  }
  updateMatrixWorld(force: boolean = false) {
    const box = this.box
    this.position.addVectors(box.min, box.max).multiplyScalar(0.5)
    const scale = this.scale
    scale.subVectors(box.max, box.min)

    //prevent 0 thinness, as it makes bad matrices
    if (scale.x === 0) {
      scale.x = THIN
    }
    if (scale.y === 0) {
      scale.y = THIN
    }
    if (scale.z === 0) {
      scale.z = THIN
    }

    Object3D.prototype.updateMatrixWorld.call(this, force)
  }
  clone() {
    return new Box3Helper(this.box) as this
  }
}
