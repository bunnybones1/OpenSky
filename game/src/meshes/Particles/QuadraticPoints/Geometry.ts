import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { clamp, lerp } from '@opensky/shared/utils/math'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  Vector3
} from 'three'

import { Easing } from '~/systems/animation/Easing'
import { timeUniformFactory, TimeUniformHelper } from '~/timeUniforms'
import { buildParameters, copyDefaults } from '~/utils/jsUtils'
import { taskTimer } from '~/utils/taskTimer'
import { RenderGroup, UpdateRange } from '~/utils/threeUtils'

import BeamEmitter from '../BeamEmitter'
import { BeamParticlePathMaker } from '../beamParticlePathMakerLib'
import { ColorMaker } from '../ColorMaker'
import Emitter from '../Emitter'
import GeometryEmitter from '../GeometryEmitter'
import { MissileParticlePathMaker } from '../missileParticlePathMakerLib'

const MAX_POINTS = 65536 / 16

type RenderGroupMode = 'basic' | 'wrap'

const __tempPosition = new Vector3()
const __tempPositionHandle = new Vector3()
const __tempPosition2 = new Vector3()
const __tempColor = new Color()

function __defaultColorMaker(i: number, outColor: Color) {
  outColor.setHSL(
    // Math.cos(i / 800) * 0.25 + (((iSnap + 1) % 4 > 1) ? 0.25 : -0.25) + (side > 0 ? 0.06125 : 0.0),
    lerp(Math.sin(i / 10), Math.sin(i / 400), 0.5) * 0.25,
    0.7,
    0.6
  )
}

export interface QuadraticPointGeometryParameters {
  total: number
  sizeMin: number
  sizeMax: number
  speed: number
  colorMaker: ColorMaker
  jitColorMaker: boolean
}

const __defaultQuadraticPointGeometryParameters: QuadraticPointGeometryParameters =
  {
    total: MAX_POINTS,
    sizeMin: 2,
    sizeMax: 7,
    speed: 1,
    colorMaker: __defaultColorMaker,
    jitColorMaker: false
  }
export default class QuadraticPointsGeometry extends BufferGeometry {
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
  wrappedLastFrame: boolean
  totalIndices: number
  renderStartWrapped: number
  renderEndWrapped: number
  visible: boolean
  updateRange: UpdateRange
  total: number
  private _drawGroupsDirty: boolean
  private cursorIndex = 0
  private _renderGroup1: RenderGroup
  private _renderGroup2: RenderGroup
  private _renderGroups: { [K in RenderGroupMode]: RenderGroup[] }
  private _renderGroupMode: RenderGroupMode
  private _emitters: Emitter[] = []
  private _geometryEmitters: GeometryEmitter[] = []
  private _particleDuration: number
  private _timeUniformHelper: TimeUniformHelper
  private _parameters: QuadraticPointGeometryParameters
  private _startIndex = 0
  private _endIndex = 0
  private _startIndexWrapped = 0
  private _endIndexWrapped = 0
  constructor(options: Partial<QuadraticPointGeometryParameters>) {
    super()
    this._parameters = buildParameters(
      __defaultQuadraticPointGeometryParameters,
      options
    )
    copyDefaults(options, __defaultQuadraticPointGeometryParameters)
    const total = (options.total = clamp(~~options.total!, 1, 65536))
    this._timeUniformHelper = timeUniformFactory.getUniformHelper(
      options.speed!
    )
    this._particleDuration = 1 / this._parameters.speed

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

    const positions = new Float32Array(total * 3)
    const positionsHandles = new Float32Array(total * 3)
    const positions2 = new Float32Array(total * 3)
    const colors = new Float32Array(total * 3)
    const sizes = new Float32Array(total)
    const timeOffsets = new Float32Array(total)

    const tempColor = new Color()

    const { sizeMin, sizeMax, colorMaker, jitColorMaker } = this._parameters

    if (!jitColorMaker) {
      for (let i = 0; i < total; i++) {
        colorMaker(i, tempColor)
        tempColor.toArray(colors, i * 3)
      }
    }
    for (let i = 0; i < total; i++) {
      sizes[i] = lerp(
        sizeMin,
        sizeMax,
        Easing.Exponential.In(Easing.Exponential.In(Math.random()))
      )
    }
    // build geometry from buffers

    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute(
      'positionHandle',
      new Float32BufferAttribute(positionsHandles, 3)
    )
    this.setAttribute('position2', new Float32BufferAttribute(positions2, 3))
    this.setAttribute('color', new Float32BufferAttribute(colors, 3))
    this.setAttribute('size', new Float32BufferAttribute(sizes, 1))
    const timeAttr = new Float32BufferAttribute(timeOffsets, 1)
    this.setAttribute('timeOffset', timeAttr)
    this.clearGroups()
    this.addGroup(0, 1, 0)
    this.updateRange = timeAttr.updateRange
    this.total = total
    this.totalIndices = total
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
    let cursorIndex = this.cursorIndex
    let cursorIndexWrapped = cursorIndex % this.total

    const posAttr = this.attributes.position as BufferAttribute
    const posUpdateRange = posAttr.updateRange

    const posHandleAttr = this.attributes.positionHandle as BufferAttribute
    const posHandleUpdateRange = posHandleAttr.updateRange

    const pos2Attr = this.attributes.position2 as BufferAttribute
    const pos2UpdateRange = pos2Attr.updateRange

    const timeAttr = this.attributes.timeOffset as BufferAttribute
    const timeUpdateRange = timeAttr.updateRange

    const colorAttr = this.attributes.color as BufferAttribute
    const colorUpdateRange = colorAttr.updateRange

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
        precount += steps
      }
    }
    for (const emitter of this._geometryEmitters) {
      const timeParticleCount = emitter.particlesPerSecond * dt
      const rawEnergy = Math.min(
        emitter.energyLimit,
        timeParticleCount + emitter.cursorEnergy
      )
      const steps = ~~rawEnergy
      precount += steps
    }
    if (cursorIndexWrapped + precount > this.totalIndices) {
      cursorIndex = Math.ceil(cursorIndex / this.total) * this.total
      cursorIndexWrapped = 0
    }
    for (const emitter of this._emitters) {
      const colorMaker = emitter.colorMaker || this._colorMaker
      const ppm = emitter.particlePathMaker
      const cursorPosition = emitter.cursorPosition
      const cursorDirectionOrPos2 = emitter.cursorDirectionOrPos2
      const cursorOrientation = emitter.cursorOrientation

      for (let j = 0; j < emitter.backlogCount; j++) {
        if (!emitter.visible) {
          cursorPosition.copy(emitter.backlogPositions[j])
          if (emitter instanceof BeamEmitter) {
            cursorDirectionOrPos2.copy(emitter.backlogPositions2[j])
          }
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
          if (emitter instanceof BeamEmitter) {
            cursorDirectionOrPos2.copy(emitter.backlogPositions2[j])
          }
          cursorOrientation.copy(emitter.backlogOrientations[j])
          emitter.cursorTime = emitter.backlogTimes[j]
          continue
        }

        // if (steps > this.total - cursorIndexWrapped) {
        //   cursorIndexWrapped = 0
        //   cursorIndex = this.total * (~~(this.cursorIndex / this.total) + 1)
        // }

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

          const i3 = cursorIndexWrapped * 3
          __tempPosition.toArray(posAttr.array, i3)
          __tempPositionHandle.toArray(posHandleAttr.array, i3)
          __tempPosition2.toArray(pos2Attr.array, i3)
          if (this._jitColorMaker) {
            colorMaker(cursorIndex, __tempColor)
            __tempColor.toArray(colorAttr.array, i3)
          }
          ;(timeAttr.array as Float32Array)[cursorIndexWrapped] =
            this._timeUniformHelper.realTimeToAttribute(
              this._timeUniformHelper.time,
              (dt * i) / steps
            )

          if (!attributesMarkedForUpdateThisFrame) {
            attributesMarkedForUpdateThisFrame = true
            timeUpdateRange.offset = cursorIndexWrapped
            timeUpdateRange.count = 1
            timeAttr.needsUpdate = true
            posUpdateRange.offset = i3
            posUpdateRange.count = 3
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
            timeUpdateRange.count += 1
            posUpdateRange.count += 3
            posHandleUpdateRange.count += 3
            pos2UpdateRange.count += 3
            if (this._jitColorMaker) {
              colorAttr.count += 3
            }
          }
          cursorIndex++
          cursorIndexWrapped = cursorIndex % this.total
        }
        emitter.cursorTime = emitter.backlogTimes[j]
      }
      emitter.backlogCount = 0
      if (this.wrappedLastFrame) {
        this.wrappedLastFrame = false
        timeUpdateRange.count += timeUpdateRange.offset
        timeUpdateRange.offset = 0
        posUpdateRange.count += posUpdateRange.offset
        posUpdateRange.offset = 0
        posHandleUpdateRange.count += posHandleUpdateRange.offset
        posHandleUpdateRange.offset = 0
        pos2UpdateRange.count += pos2UpdateRange.offset
        pos2UpdateRange.offset = 0
      }
      if (timeUpdateRange.count + timeUpdateRange.offset > this.total) {
        timeUpdateRange.count = this.total - timeUpdateRange.offset
        const t3 = this.total * 3
        posUpdateRange.count = t3 - posUpdateRange.offset
        posHandleUpdateRange.count = t3 - posHandleUpdateRange.offset
        pos2UpdateRange.count = t3 - pos2UpdateRange.offset
        this.wrappedLastFrame = true
      }
    }

    for (const emitter of this._geometryEmitters) {
      const ppm = emitter.particlePathMaker
      const timeParticleCount = emitter.particlesPerSecond * dt

      const rawEnergy = Math.min(
        emitter.energyLimit,
        timeParticleCount + emitter.cursorEnergy
      )
      const steps = ~~rawEnergy
      emitter.energyLimit -= steps
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

        const i3 = cursorIndexWrapped * 3
        __tempPosition.toArray(posAttr.array, i3)
        __tempPositionHandle.toArray(posHandleAttr.array, i3)
        __tempPosition2.toArray(pos2Attr.array, i3)
        ;(timeAttr.array as Float32Array)[cursorIndexWrapped] =
          this._timeUniformHelper.realTimeToAttribute(
            this._timeUniformHelper.time,
            (dt * i) / steps
          )

        if (!attributesMarkedForUpdateThisFrame) {
          attributesMarkedForUpdateThisFrame = true
          timeUpdateRange.offset = cursorIndexWrapped
          timeUpdateRange.count = 1
          timeAttr.needsUpdate = true
          posUpdateRange.offset = i3
          posUpdateRange.count = 3
          posAttr.needsUpdate = true
          posHandleUpdateRange.offset = i3
          posHandleUpdateRange.count = 3
          posHandleAttr.needsUpdate = true
          pos2UpdateRange.offset = i3
          pos2UpdateRange.count = 3
          pos2Attr.needsUpdate = true
        } else {
          timeUpdateRange.count += 1
          posUpdateRange.count += 3
          posHandleUpdateRange.count += 3
          pos2UpdateRange.count += 3
        }

        cursorIndex++
        cursorIndexWrapped = cursorIndex % this.total
      }
    }
    if (this.cursorIndex !== cursorIndex) {
      this.endIndex = cursorIndex
      taskTimer.add(() => {
        this.startIndex = cursorIndex
      }, this._particleDuration + 0.01667)
      this.cursorIndex = cursorIndex
    }
    if (this._drawGroupsDirty) {
      this._drawGroupsDirty = false

      this.visible = this._startIndex !== this._endIndex
      if (!this.visible) {
        this.cursorIndex = 0
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
