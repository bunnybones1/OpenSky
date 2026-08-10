import { BufferGeometry, Color, Float32BufferAttribute } from 'three'

export default class RenderDebugPointsGeometry extends BufferGeometry {
  constructor(commandColors: Color[][][], wrapWidth = 200, minHeight = 60) {
    super()

    const total = commandColors.reduce(function (a, b) {
      return (a = a + b.length)
    }, 0)

    // buffers
    const positions = new Float32Array(total * 2)
    const colorsTL = new Float32Array(total * 3)
    const colorsTR = new Float32Array(total * 3)
    const colorsBL = new Float32Array(total * 3)
    const colorsBR = new Float32Array(total * 3)

    let index = 0
    let y = 0
    let xMax = 0
    for (const block of commandColors) {
      let x = 0
      for (const color of block) {
        if (x > wrapWidth) {
          x = 0
          y++
        }
        color[0].toArray(colorsTL, index * 3)
        color[1].toArray(colorsTR, index * 3)
        color[2].toArray(colorsBL, index * 3)
        color[3].toArray(colorsBR, index * 3)
        positions[index * 2] = x
        positions[index * 2 + 1] = y
        index++
        x++
      }
      y += 2
      xMax = Math.max(xMax, x)
    }

    const h = Math.max(y, minHeight)
    const pLen = positions.length
    for (let i2 = 0; i2 < pLen; i2 += 2) {
      positions[i2] =
        (((positions[i2] % wrapWidth) + 0.5) / wrapWidth) * 1.5 - 0.9
      positions[i2 + 1] = ((positions[i2 + 1] + 0.5) / h) * 1.8 - 0.9
    }

    // build geometry

    this.setAttribute('position', new Float32BufferAttribute(positions, 2))
    this.setAttribute('color', new Float32BufferAttribute(colorsTL, 3))
    this.setAttribute('colorTR', new Float32BufferAttribute(colorsTR, 3))
    this.setAttribute('colorBL', new Float32BufferAttribute(colorsBL, 3))
    this.setAttribute('colorBR', new Float32BufferAttribute(colorsBR, 3))
  }
}
