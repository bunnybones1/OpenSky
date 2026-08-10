import { SphereBufferGeometry, Vector3 } from 'three'

export default class LumpySphereBufferGeometry extends SphereBufferGeometry {
  constructor(
    radius: number,
    widthSegments: number,
    heightSegments: number,
    frequency = 8,
    amplitude = 0.05,
    octaves = 2
  ) {
    super(radius, widthSegments, heightSegments)

    const octaveAmplitudes: number[] = new Array(octaves)
    for (let iOctave = 0; iOctave < octaves; iOctave++) {
      octaveAmplitudes[iOctave] = amplitude
      amplitude *= 0.5
    }

    const posArr = this.attributes.position.array as number[]
    const normalArr = this.attributes.normal.array as number[]
    const tempPos = new Vector3()
    const tempOffset = new Vector3()
    for (let i = 0; i < posArr.length; i += 3) {
      tempPos.fromArray(posArr, i)
      let offsetSize = 0
      let f = frequency
      for (let iOctave = 0; iOctave < octaves; iOctave++) {
        offsetSize +=
          (Math.sin(tempPos.x * f) +
            Math.sin(tempPos.y * f) +
            Math.sin(tempPos.z * f)) *
          octaveAmplitudes[iOctave]
        f *= 2
      }
      // const temp = Math.sin(seed)
      tempOffset.fromArray(normalArr, i).multiplyScalar(offsetSize)
      tempPos.add(tempOffset)
      tempPos.toArray(posArr, i)
    }
    this.computeVertexNormals()
  }
}
