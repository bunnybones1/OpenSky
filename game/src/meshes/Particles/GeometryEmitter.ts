import {
  BufferGeometry,
  InterleavedBufferAttribute,
  Matrix4,
  Mesh,
  Vector3
} from 'three'

import { getFastRandomNumber } from '~/utils/mathThree'

import beamParticlePathMakerLib, {
  BeamParticlePathMaker
} from './beamParticlePathMakerLib'
import IEmitter from './IEmitter'

const __tempRotMat = new Matrix4()
const __tempVec3 = new Vector3()
export default class GeometryEmitter implements IEmitter {
  attrPositions: ArrayLike<number>
  attrNormals: ArrayLike<number>
  attrIndex: ArrayLike<number>
  vertexCount: number
  faceCount: number
  positionStride: number
  normalsStride: number
  refreshSample() {
    const i = ~~(Math.random() * this.faceCount)
    const i3 = i * 3
    const iAp = this.positionStride * this.attrIndex[i3]
    const iBp = this.positionStride * this.attrIndex[i3 + 1]
    const iCp = this.positionStride * this.attrIndex[i3 + 2]
    const iAn = this.normalsStride * this.attrIndex[i3]
    const iBn = this.normalsStride * this.attrIndex[i3 + 1]
    const iCn = this.normalsStride * this.attrIndex[i3 + 2]
    const a = getFastRandomNumber()
    const b = getFastRandomNumber() * getFastRandomNumber()
    this.positionSample.fromArray(this.attrPositions, iAp)
    __tempVec3.fromArray(this.attrPositions, iBp)
    this.positionSample.lerp(__tempVec3, a)
    __tempVec3.fromArray(this.attrPositions, iCp)
    this.positionSample.lerp(__tempVec3, b)
    this.positionSample.applyMatrix4(this.mesh.matrixWorld)

    this.position2Sample.fromArray(this.attrNormals, iAn)
    __tempVec3.fromArray(this.attrNormals, iBn)
    this.position2Sample.lerp(__tempVec3, a)
    __tempVec3.fromArray(this.attrNormals, iCn)
    this.position2Sample.lerp(__tempVec3, b)
    this.position2Sample.multiplyScalar(this._normalsScale)
    __tempRotMat.extractRotation(this.mesh.matrixWorld)
    this.position2Sample.applyMatrix4(__tempRotMat)
    this.position2Sample.add(this.positionSample)
  }
  positionSample: Vector3 = new Vector3()
  position2Sample: Vector3 = new Vector3()
  cursorEnergy: number = 0
  constructor(
    public mesh: Mesh,
    public particlePathMaker: BeamParticlePathMaker = beamParticlePathMakerLib.default,
    public particlesPerSecond: number = 1000,
    private _normalsScale = 1,
    public energyLimit = Infinity
  ) {
    if (mesh.geometry instanceof BufferGeometry) {
      const attrPositions = mesh.geometry.getAttribute('position')
      this.positionStride =
        attrPositions instanceof InterleavedBufferAttribute
          ? attrPositions.data.stride
          : 3
      this.attrPositions = attrPositions.array
      this.vertexCount = attrPositions.count
      const attrNormals = mesh.geometry.getAttribute('normal')
      this.attrNormals = attrNormals.array
      this.normalsStride =
        attrNormals instanceof InterleavedBufferAttribute
          ? attrNormals.data.stride
          : 3
      const attrIndex = mesh.geometry.getIndex()
      if (attrIndex) {
        this.attrIndex = attrIndex.array
        this.faceCount = attrIndex.count / 3
      } else {
        throw new Error('geometry needs indices')
      }
    } else {
      throw new Error('only BufferGeometry is supported')
    }
  }
  dispose() {
    throw new Error('WTF')
  }
}
