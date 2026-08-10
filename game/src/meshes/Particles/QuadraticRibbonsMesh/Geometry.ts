import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { clamp, lerp } from '@opensky/shared/utils/math'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  Uint16BufferAttribute,
  Vector3
} from 'three'

import { timeUniformFactory, TimeUniformHelper } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'
import { taskTimer } from '~/utils/taskTimer'
import { RenderGroup, UpdateRange } from '~/utils/threeUtils'

import BeamEmitter from '../BeamEmitter'
import { BeamParticlePathMaker } from '../beamParticlePathMakerLib'
import { ColorMaker } from '../ColorMaker'
import Emitter from '../Emitter'
import GeometryEmitter from '../GeometryEmitter'
import { MissileParticlePathMaker } from '../missileParticlePathMakerLib'

const MAX_VERTS = 65536 / 2
// const MAX_VERTS = 65536

function __defaultWidthLookup(_ratio: number) {
  return 1
}

type RenderGroupMode = 'basic' | 'wrap'

const __tempPosition = new Vector3()
const __tempPositionHandle = new Vector3()
const __tempPosition2 = new Vector3()
const __tempColor = new Color()

function __defaultColorMaker(i: number, outColor: Color, side: number = 1) {
  outColor.setHSL(
    // Math.cos(i / 800) * 0.25 + (((iSnap + 1) % 4 > 1) ? 0.25 : -0.25) + (side > 0 ? 0.06125 : 0.0),
    lerp(Math.sin(i / 10), Math.sin(i / 400), 0.5) * 0.25 +
      (side > 0 ? 0.06125 : 0.0),
    0.7,
    0.6
  )
}

export interface QuadraticRibbonGeometryParameters {
  totalRibbons: number
  trianglesPerRibbonShared: number
  widthLookup: (ratio: number) => number
  quantizeVertsAlongTime: boolean
  speed: number
  colorMaker: ColorMaker
  jitColorMaker: boolean
}

const __defaultQuadraticRibbonGeometryParameters: QuadraticRibbonGeometryParameters =
  {
    totalRibbons: 10000,
    trianglesPerRibbonShared: 2,
    widthLookup: __defaultWidthLookup,
    quantizeVertsAlongTime: false,
    speed: 1,
    colorMaker: __defaultColorMaker,
    jitColorMaker: false
  }

export default class RibbonsGeometry extends BufferGeometry {
  private _jitColorMaker: boolean
  private _colorMaker: ColorMaker
  private set renderGroupMode(mode: RenderGroupMode) {
    if (mode !== this._renderGroupMode) {
      this._renderGroupMode = mode
      this.groups = this._renderGroups[mode]
    }
  }
  private set startIndex(val: number) {
    if (this._startIndex !== val) {
      this._startIndex = val
      this._startIndexWrapped = val % this.totalIndices
      this._drawGroupsDirty = true
    }
  }
  private set endIndex(val: number) {
    if (this._endIndex !== val) {
      this._endIndex = val
      this._endIndexWrapped = val % this.totalIndices
      this._drawGroupsDirty = true
    }
  }
  _timeAttr: Float32BufferAttribute
  totalRibbons: number
  renderStartWrapped: number
  renderEndWrapped: number
  visible: boolean
  updateRange: UpdateRange
  total: number
  totalTriangles: number
  totalIndices: number
  private _drawGroupsDirty: boolean
  private cursorVIndex = 0
  private cursorIIndex = 0
  private _renderGroup1: RenderGroup
  private _renderGroup2: RenderGroup
  private _renderGroups: { [K in RenderGroupMode]: RenderGroup[] }
  private _renderGroupMode: RenderGroupMode
  private _emitters: Emitter[] = []
  private _geometryEmitters: GeometryEmitter[] = []
  private _verticesPerRibbon: number
  private _particleDuration: number
  private _timeUniformHelper: TimeUniformHelper
  private _parameters: QuadraticRibbonGeometryParameters
  private _trianglesPerRibbonShared: number
  private _startIndex = 0
  private _endIndex = 0
  private _startIndexWrapped = 0
  private _endIndexWrapped = 0
  mesh: Mesh | undefined
  constructor(options: Partial<QuadraticRibbonGeometryParameters>) {
    super()

    this._parameters = buildParameters(
      __defaultQuadraticRibbonGeometryParameters,
      options
    )
    const { trianglesPerRibbonShared, speed, colorMaker, jitColorMaker } =
      this._parameters
    let widthLookup = this._parameters.widthLookup
    const totalRibbons = clamp(
      ~~this._parameters.totalRibbons,
      1,
      ~~(MAX_VERTS / (2 + trianglesPerRibbonShared))
    )
    this.totalRibbons = totalRibbons

    this._timeUniformHelper = timeUniformFactory.getUniformHelper(speed)
    this._particleDuration = 1 / speed

    if (this._parameters.quantizeVertsAlongTime) {
      widthLookup = __defaultWidthLookup
    }
    const verticesPerRibbon = trianglesPerRibbonShared + 2
    this._verticesPerRibbon = verticesPerRibbon
    const totalVerts = verticesPerRibbon * totalRibbons
    const totalIndices = totalRibbons * trianglesPerRibbonShared * 3
    this.total = totalVerts
    this.totalTriangles = totalRibbons * trianglesPerRibbonShared
    this.totalIndices = totalIndices

    //prepare rendergroups for wrapped buffer rendering ahead of time, and recycle them

    this.addGroup(0, 1)
    this.addGroup(0, 1)
    const renderGroup1: RenderGroup = this.groups[0]
    const renderGroup2: RenderGroup = this.groups[1]

    this._renderGroups = {
      basic: [renderGroup1],
      wrap: [renderGroup1, renderGroup2]
    }

    this._renderGroup1 = renderGroup1
    this._renderGroup2 = renderGroup2

    //build buffers

    const positions = new Float32Array(totalVerts * 4)
    const uvs = new Float32Array(totalVerts * 2)
    const positionsHandles = new Float32Array(totalVerts * 3)
    const positions2 = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 3)
    const timeOffsets = new Float32Array(totalVerts * 2)
    const indices = new Float32Array(totalIndices)

    const last = verticesPerRibbon - 1
    const corrector = verticesPerRibbon / last
    const color = new Color()

    for (let i = 0; i < totalVerts; i++) {
      const iSnap = 2 * Math.round(i * 0.5)
      const i2 = i * 2
      // const i3 = i * 3
      const i4 = i * 4
      const side = (i % 2) * 2 - 1
      const ratio = ((iSnap / verticesPerRibbon) % 1) * corrector
      const width = widthLookup(ratio)
      switch (i % verticesPerRibbon) {
        case 0:
          uvs[i2] = 1
          uvs[i2 + 1] = 1
          break
        case last:
          uvs[i2] = 0
          uvs[i2 + 1] = 0
          break
        default:
          if (side <= 0) {
            uvs[i2] = 0.5 + width * 0.5
            uvs[i2 + 1] = 0.5 - width * 0.5
          } else {
            uvs[i2] = 0.5 - width * 0.5
            uvs[i2 + 1] = 0.5 + width * 0.5
          }
      }
      // uvs[i2] = side * 0.5 + 0.5
      // uvs[i2+1] = ratio
      positions[i4 + 3] = side * width
    }

    if (!jitColorMaker) {
      for (let i = 0; i < totalVerts; i++) {
        const i3 = i * 3
        const side = (i % 2) * 2 - 1
        colorMaker(i, color, side)
        color.toArray(colors, i3)
      }
    }

    let counter = 0
    for (let i = 0; i < totalRibbons; i++) {
      const index = i * this._verticesPerRibbon
      for (let j = 0; j < trianglesPerRibbonShared; j++) {
        indices[counter] = index + j
        indices[counter + 1] = index + j + 1
        indices[counter + 2] = index + j + 2
        counter += 3
      }
    }

    // build geometry from buffers

    this.setAttribute('position', new Float32BufferAttribute(positions, 4))
    this.setAttribute(
      'positionHandle',
      new Float32BufferAttribute(positionsHandles, 3)
    )
    this.setAttribute('position2', new Float32BufferAttribute(positions2, 3))
    this.setAttribute('color', new Float32BufferAttribute(colors, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    const timeAttr = new Float32BufferAttribute(timeOffsets, 2)
    this._timeAttr = timeAttr
    this.setAttribute('timeOffsets', timeAttr)
    this.setIndex(new Uint16BufferAttribute(indices, 1))
    this.clearGroups()
    this.addGroup(0, 1, 0)
    this.updateRange = timeAttr.updateRange
    this._trianglesPerRibbonShared = this._parameters.trianglesPerRibbonShared
    this._jitColorMaker = jitColorMaker
    this._colorMaker = colorMaker
  }
  createEmitter(
    pos: Vector3,
    particlePathMaker?: MissileParticlePathMaker,
    colorMaker?: ColorMaker,
    energyLimit = Infinity
  ) {
    const e = new Emitter(
      pos,
      particlePathMaker,
      this._timeUniformHelper,
      colorMaker,
      energyLimit
    )
    this._emitters.push(e)
    return e
  }
  createBeamEmitter(
    pos: Vector3,
    particlePathMaker?: BeamParticlePathMaker,
    colorMaker?: ColorMaker,
    energyLimit = Infinity
  ) {
    const e = new BeamEmitter(
      pos,
      particlePathMaker,
      this._timeUniformHelper,
      colorMaker,
      energyLimit
    )
    this._emitters.push(e)
    return e
  }
  createGeometryEmitter(
    mesh: Mesh,
    particlePathMaker?: BeamParticlePathMaker,
    particlesPerSecond = 60,
    normalsScale = 1,
    energyLimit = Infinity
  ) {
    const e = new GeometryEmitter(
      mesh,
      particlePathMaker,
      particlesPerSecond,
      normalsScale,
      energyLimit
    )
    this._geometryEmitters.push(e)
    return e
  }
  destroyEmitter(emitter: Emitter) {
    removeFromArray(this._emitters, emitter)
  }
  destroyGeometryEmitter(emitter: GeometryEmitter) {
    removeFromArray(this._geometryEmitters, emitter)
  }
  update(dt: number) {
    let cursorVIndex = this.cursorVIndex
    let cursorVIndexWrapped = cursorVIndex % this.total
    let cursorIIndex = this.cursorIIndex

    const posAttr = this.attributes.position as BufferAttribute
    const posUpdateRange = posAttr.updateRange

    const posHandleAttr = this.attributes.positionHandle as BufferAttribute
    const posHandleUpdateRange = posHandleAttr.updateRange

    const pos2Attr = this.attributes.position2 as BufferAttribute
    const pos2UpdateRange = pos2Attr.updateRange

    const timeAttr = this._timeAttr
    const timeArr = timeAttr.array as Float32Array
    const timeUpdateRange = timeAttr.updateRange

    const colorAttr = this.attributes.color as BufferAttribute
    const colorUpdateRange = colorAttr.updateRange

    const verticesPerRibbon = this._verticesPerRibbon
    let precount = 0

    let attributesMarkedForUpdateThisFrame = false

    for (const emitter of this._emitters) {
      const cursorPosition = emitter.cursorPosition
      for (let j = 0; j < emitter.backlogCount; j++) {
        if (!emitter.visible) {
          continue
        }
        const pos = emitter.backlogPositions[j]
        const distanceTo = cursorPosition.distanceTo(pos)
        const distanceParticleCount =
          distanceTo * emitter.backlogParticlesPerMeter[j]
        const timeParticleCount = emitter.backlogParticlesPerSecond[j] * dt
        const rawEnergy = Math.min(
          emitter.energyLimit,
          timeParticleCount + distanceParticleCount + emitter.cursorEnergy
        )

        const steps = ~~rawEnergy
        precount += steps * verticesPerRibbon
      }
    }
    for (const emitter of this._geometryEmitters) {
      const timeParticleCount = emitter.particlesPerSecond * dt
      const rawEnergy = Math.min(
        emitter.energyLimit,
        timeParticleCount + emitter.cursorEnergy
      )
      const steps = ~~rawEnergy
      precount += steps * verticesPerRibbon
    }
    if (cursorVIndexWrapped + precount > this.total) {
      cursorVIndex = Math.ceil(cursorVIndex / this.total) * this.total
      cursorVIndexWrapped = 0
      cursorIIndex =
        Math.ceil(cursorIIndex / this.totalIndices) * this.totalIndices
    }
    for (const emitter of this._emitters) {
      const colorMaker = emitter.colorMaker || this._colorMaker
      const ppm = emitter.particlePathMaker
      const cursorPosition = emitter.cursorPosition
      const cursorDirectionOrPos2 = emitter.cursorDirectionOrPos2
      const cursorOrientation = emitter.cursorOrientation
      // let alloc = precount * verticesPerRibbon
      for (let j = 0; j < emitter.backlogCount; j++) {
        if (!emitter.visible) {
          cursorPosition.copy(emitter.backlogPositions[j])
          cursorOrientation.copy(emitter.backlogOrientations[j])
          emitter.cursorTime = emitter.backlogTimes[j]
          emitter.cursorEnergy = 0
          continue
        }
        const pos = emitter.backlogPositions[j]
        const distanceTo = cursorPosition.distanceTo(pos)
        const distanceParticleCount =
          distanceTo * emitter.backlogParticlesPerMeter[j]
        const timeParticleCount = emitter.backlogParticlesPerSecond[j] * dt

        const rawEnergy = Math.min(
          emitter.energyLimit,
          timeParticleCount + distanceParticleCount + emitter.cursorEnergy
        )
        const steps = ~~rawEnergy
        emitter.cursorEnergy = rawEnergy - steps
        emitter.energyLimit -= steps

        emitter.initSteps(j, steps, dt)

        if (steps === 0) {
          cursorPosition.copy(emitter.backlogPositions[j])
          cursorOrientation.copy(emitter.backlogOrientations[j])
          emitter.cursorTime = emitter.backlogTimes[j]
          continue
        }

        for (let i = 0; i < steps; i++) {
          const amt = 1 / (steps - i)
          emitter.subStep(amt)
          ppm(
            cursorPosition,
            cursorDirectionOrPos2,
            cursorOrientation,
            __tempPosition,
            __tempPositionHandle,
            __tempPosition2
          )

          if (this._jitColorMaker) {
            colorMaker(cursorVIndex, __tempColor)
          }

          for (let vi = 0; vi < verticesPerRibbon; vi++) {
            const iSnap = 2 * ~~((vi + 1) * 0.5)

            const iTime = cursorVIndexWrapped * 2
            const i3 = cursorVIndexWrapped * 3
            const i4 = cursorVIndexWrapped * 4
            __tempPosition.toArray(posAttr.array, i4)
            __tempPositionHandle.toArray(posHandleAttr.array, i3)
            __tempPosition2.toArray(pos2Attr.array, i3)

            if (this._jitColorMaker) {
              __tempColor.toArray(colorAttr.array, i3)
            }

            timeArr[iTime] = iSnap / (verticesPerRibbon - 1)
            timeArr[iTime + 1] = this._timeUniformHelper.realTimeToAttribute(
              this._timeUniformHelper.time,
              (dt * i) / steps
            )

            if (!attributesMarkedForUpdateThisFrame) {
              attributesMarkedForUpdateThisFrame = true
              timeUpdateRange.offset = iTime
              timeUpdateRange.count = 2
              timeAttr.needsUpdate = true
              posUpdateRange.offset = i4
              posUpdateRange.count = 4
              posAttr.needsUpdate = true
              posHandleUpdateRange.offset = i3
              posHandleUpdateRange.count = 3
              posHandleAttr.needsUpdate = true
              pos2UpdateRange.offset = i3
              pos2UpdateRange.count = 3
              pos2Attr.needsUpdate = true
              if (this._jitColorMaker) {
                colorUpdateRange.offset = i3
                colorAttr.needsUpdate = true
                colorAttr.count = 3
              }
            } else {
              timeUpdateRange.count += 2
              posUpdateRange.count += 4
              posHandleUpdateRange.count += 3
              pos2UpdateRange.count += 3
              if (this._jitColorMaker) {
                colorAttr.count += 3
              }
            }

            cursorVIndex++
            cursorVIndexWrapped = cursorVIndex % this.total
          }
          cursorIIndex += this._trianglesPerRibbonShared * 3
        }
        emitter.cursorTime = emitter.backlogTimes[j]
      }
      emitter.backlogCount = 0
    }
    for (const emitter of this._geometryEmitters) {
      const ppm = emitter.particlePathMaker
      const timeParticleCount = emitter.particlesPerSecond * dt
      const rawEnergy = timeParticleCount + emitter.cursorEnergy
      const steps = ~~rawEnergy
      emitter.cursorEnergy = rawEnergy - steps

      for (let i = 0; i < steps; i++) {
        emitter.refreshSample()
        ppm(
          emitter.positionSample,
          emitter.position2Sample,
          emitter.mesh.quaternion,
          __tempPosition,
          __tempPositionHandle,
          __tempPosition2
        )

        for (let vi = 0; vi < verticesPerRibbon; vi++) {
          const iSnap = 2 * ~~((vi + 1) * 0.5)

          const iTime = cursorVIndexWrapped * 2
          const i3 = cursorVIndexWrapped * 3
          const i4 = cursorVIndexWrapped * 4
          __tempPosition.toArray(posAttr.array, i4)
          __tempPositionHandle.toArray(posHandleAttr.array, i3)
          __tempPosition2.toArray(pos2Attr.array, i3)

          timeArr[iTime] = iSnap / (verticesPerRibbon - 1)
          timeArr[iTime + 1] = this._timeUniformHelper.realTimeToAttribute(
            this._timeUniformHelper.time,
            (dt * i) / steps
          )

          if (!attributesMarkedForUpdateThisFrame) {
            attributesMarkedForUpdateThisFrame = true
            timeUpdateRange.offset = iTime
            timeUpdateRange.count = 2
            timeAttr.needsUpdate = true
            posUpdateRange.offset = i4
            posUpdateRange.count = 4
            posAttr.needsUpdate = true
            posHandleUpdateRange.offset = i3
            posHandleUpdateRange.count = 3
            posHandleAttr.needsUpdate = true
            pos2UpdateRange.offset = i3
            pos2UpdateRange.count = 3
            pos2Attr.needsUpdate = true
            if (this._jitColorMaker) {
              colorUpdateRange.offset = i3
              colorAttr.needsUpdate = true
              colorAttr.count = 3
            }
          } else {
            timeUpdateRange.count += 2
            posUpdateRange.count += 4
            posHandleUpdateRange.count += 3
            pos2UpdateRange.count += 3
            if (this._jitColorMaker) {
              colorAttr.count += 3
            }
          }

          cursorVIndex++
          cursorVIndexWrapped = cursorVIndex % this.total
        }
        cursorIIndex += this._trianglesPerRibbonShared * 3
      }
    }
    if (this.cursorIIndex !== cursorIIndex) {
      this.endIndex = cursorIIndex
      taskTimer.add(() => {
        this.startIndex = cursorIIndex
      }, this._particleDuration + 0.01667)
      this.cursorIIndex = cursorIIndex
      this.cursorVIndex = cursorVIndex
    }
    if (this._drawGroupsDirty) {
      this._drawGroupsDirty = false
      this.visible = this._startIndex !== this._endIndex
      if (!this.visible) {
        this.cursorIIndex = 0
        this.cursorVIndex = 0
        this._startIndex = 0
        this._startIndexWrapped = 0
        this._endIndex = 0
        this._endIndexWrapped = 0
        return
      }
      if (this._endIndex - this._startIndex >= this.totalIndices) {
        this.renderGroupMode = 'basic'
        this._renderGroup1.start = 0
        this._renderGroup1.count = this.totalIndices
        this.renderStartWrapped = 0
        this.renderEndWrapped = this.totalIndices
      } else if (this._startIndexWrapped < this._endIndexWrapped) {
        this.renderGroupMode = 'basic'
        this._renderGroup1.start = this._startIndexWrapped
        this._renderGroup1.count =
          this._endIndexWrapped - this._startIndexWrapped
        this.renderStartWrapped = this._startIndexWrapped
        this.renderEndWrapped = this._endIndexWrapped
      } else {
        this.renderGroupMode = 'wrap'
        this._renderGroup1.start = this._startIndexWrapped
        this._renderGroup1.count = this.totalIndices - this._startIndexWrapped
        this._renderGroup2.start = 0
        this._renderGroup2.count = this._endIndexWrapped
        this.renderStartWrapped = this._startIndexWrapped
        this.renderEndWrapped = this._endIndexWrapped
      }
    }
  }
}
