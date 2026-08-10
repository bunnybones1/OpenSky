import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { delayPromise } from '@opensky/shared/utils/async'
import { getUrlInt } from '@opensky/shared/utils/location'
import { rand } from '@opensky/shared/utils/math'
import { Material, Mesh, Object3D, Scene, Vector3 } from 'three'

import { isI2D } from '~/helpers/I2D'
import QuadraticBezierCurveHelper from '~/helpers/QuadraticBezierCurveHelper'
import { playSound } from '~/helpers/soundHelpers'
import { getYadaYadaDuration } from '~/helpers/yadaYadaDurationHelper'
import { BeamParticlePathMaker } from '~/meshes/Particles/beamParticlePathMakerLib'
import { ColorMaker } from '~/meshes/Particles/ColorMaker'
import Emitter from '~/meshes/Particles/Emitter'
import GeometryEmitter from '~/meshes/Particles/GeometryEmitter'
import {
  BeamAssembly,
  LayeredParticleLauncher,
  ParticleRenderObject
} from '~/meshes/Particles/particleHelpers'
import { simpleTweener } from '~/systems/animation/tweeners'
import UpdateManager from '~/systems/UpdateManager'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { copyDefaults } from '~/utils/jsUtils'
import { getFastRandomNumber } from '~/utils/mathThree'
import { taskTimer } from '~/utils/taskTimer'
import { getQuatFromEuler } from '~/utils/threeMathUtils'
import { removeFromParent } from '~/utils/threeUtils'

const __maxVollies = getUrlInt('maxVollies', 4)
export class BeamParticleWriter {
  constructor(
    public particleRenderObject: ParticleRenderObject,
    public pathMaker: BeamParticlePathMaker,
    public particlesPerMeter: number,
    public particlesPerSecond = 0,
    public durationRatio = 1,
    public energyLimit = Infinity,
    public particlesPerSecondTimeDistribution = (v: number) => 1 - v
  ) {
    //
  }
}

const __defaultAssemblyParameters: Partial<BeamAssembly> = {
  chargeUpDuration: 500,
  mainDuration: 1000,
  explosionDuration: 500,
  shake: 0
}

const __frontLines = [-0.3, 0.1]
const __frontLineWidths = [0.4, 0.1]
const __up = getQuatFromEuler(Math.PI * -0.5, 0, 0)

const __defaultFlareEndUpdate = (flareEnd: Object3D, progress: number) => {
  flareEnd.scale.x =
    Math.pow(Math.random(), progress * 4) * (1 - progress * 0.5)
}

export type EmitterAssembly = {
  boundEmitters: IBoundEmitter[]
  update(dt: number): void
  destroy: () => void
}
export type GeometryEmitterAssembly = {
  boundEmitters: IBoundGeometryEmitter[]
  update(dt: number): void
  destroy: () => void
}
type IBoundEmitter = {
  emitter: Emitter
  particlesPerMeter: number
  particlesPerSecond: number
}
type IBoundGeometryEmitter = {
  emitter: GeometryEmitter
  particlesPerMeter: number
  particlesPerSecond: number
}
export default class BeamLauncher implements LayeredParticleLauncher {
  startGeometryEmitter(mesh: Mesh, normalsScale = 1): GeometryEmitterAssembly {
    const writers = this.beamAssembly.mainWriters
    const boundEmitters: IBoundGeometryEmitter[] = writers.map(w => {
      const emitter = w.particleRenderObject.geometry.createGeometryEmitter(
        mesh,
        w.pathMaker,
        w.particlesPerSecond,
        normalsScale,
        w.energyLimit
      )
      return {
        emitter,
        particlesPerMeter: w.particlesPerMeter,
        particlesPerSecond: w.particlesPerSecond
      }
    })
    const assembly = {
      boundEmitters,
      update() {
        //
      },
      destroy() {
        for (let i = 0; i < writers.length; i++) {
          writers[i].particleRenderObject.geometry.destroyGeometryEmitter(
            boundEmitters[i].emitter
          )
          boundEmitters[i].emitter.dispose()
        }
        UpdateManager.unregister(assembly)
      }
    }
    UpdateManager.register(assembly)
    return assembly
  }
  startLineEmitter(
    p1: Object3D,
    p2: Object3D,
    colorMaker?: ColorMaker
  ): EmitterAssembly {
    const both = [p1, p2]
    let i = 0
    const writers = this.beamAssembly.mainWriters
    const boundEmitters: IBoundEmitter[] = writers.map(w => {
      const pos = new Vector3()
      if (isI2D(p1)) {
        pos.x = p1.matrixWorld.elements[2]
        pos.y = p1.matrixWorld.elements[3]
      } else {
        pos.applyMatrix4(p1.matrixWorld)
      }
      const emitter = w.particleRenderObject.geometry.createBeamEmitter(
        pos,
        w.pathMaker,
        colorMaker,
        w.energyLimit
      )
      return {
        emitter,
        particlesPerMeter: w.particlesPerMeter,
        particlesPerSecond: w.particlesPerSecond
      }
    })
    const posStart = new Vector3()
    const posTemp = new Vector3()
    const posEnd = new Vector3()
    const assembly = {
      boundEmitters,
      update() {
        i++
        const posObjA = both[i % 2]
        const posObjB = both[(i + 1) % 2]
        const matrixA = posObjA.matrixWorld
        const matrixB = posObjB.matrixWorld
        if (isI2D(p1)) {
          posStart.x = matrixA.elements[2]
          posStart.y = matrixA.elements[3]
          posEnd.x = matrixB.elements[2]
          posEnd.y = matrixB.elements[3]
        } else {
          posStart.set(0, 0, 0).applyMatrix4(matrixA)
          posEnd.set(0, 0, 0).applyMatrix4(matrixB)
        }
        posTemp.copy(posEnd)
        posEnd.lerp(posStart, getFastRandomNumber())
        posStart.lerp(posTemp, getFastRandomNumber())
        boundEmitters.forEach(e => {
          e.emitter.update2(
            posStart,
            posEnd,
            posObjA.quaternion,
            e.particlesPerMeter,
            e.particlesPerSecond
          )
        })
      },
      destroy() {
        for (let i = 0; i < writers.length; i++) {
          writers[i].particleRenderObject.geometry.destroyEmitter(
            boundEmitters[i].emitter
          )
          removeFromParent(boundEmitters[i].emitter)
        }
        UpdateManager.unregister(assembly)
      }
    }
    UpdateManager.register(assembly)
    return assembly
  }
  private _launchCount = 0
  constructor(
    private _scene: Scene,
    public beamAssembly: BeamAssembly
  ) {
    copyDefaults(beamAssembly, __defaultAssemblyParameters)
  }
  startTestVolley(interval = 2000) {
    const intervalSeconds = interval * 0.001
    const repeat = async () => {
      this._launchCount++
      console.log('volley')
      for (let i = rand(1, __maxVollies); i > 0; i--) {
        if (Math.random() > 0.5) {
          await delayPromise(200)
        }
        const halfWidthRange = getFromArrayWrapped(
          __frontLineWidths,
          this._launchCount
        )
        const start = new Vector3(
          rand(-halfWidthRange, halfWidthRange),
          0.05,
          getFromArrayWrapped(__frontLines, this._launchCount)
        )
        const halfWidthRange2 = getFromArrayWrapped(
          __frontLineWidths,
          this._launchCount + 1
        )
        const end = new Vector3(
          rand(-halfWidthRange2, halfWidthRange2),
          0.05,
          getFromArrayWrapped(__frontLines, this._launchCount + 1)
        )

        simpleTweener.to({
          description: 'test volley start pos move',
          target: start,
          propertyGoals: { x: start.x + 0.2 * rand(-0.1, 0.1) },
          duration: 500
        })
        simpleTweener.to({
          description: 'test volley end pos move',
          target: end,
          propertyGoals: { x: start.x + 0.2 * rand(-0.1, 0.1) },
          duration: 500
        })

        this.launch(start, end)
      }
      taskTimer.add(repeat, intervalSeconds)
    }
    taskTimer.add(repeat, 1)
  }
  async launch(start: Vector3, end: Vector3) {
    if (this.beamAssembly.chargeUpSoundID) {
      playSound('audioFxCommon', this.beamAssembly.chargeUpSoundID)
    }

    const mainDuration = this.beamAssembly.mainDuration || 0
    const chargeUpDuration = this.beamAssembly.chargeUpDuration || 0

    const chargeDurScale = getYadaYadaDuration(
      this.beamAssembly.chargeGatlingTag
    )
    const mainDurScale = getYadaYadaDuration(this.beamAssembly.mainGatlingTag)

    const adjustedMainDuration = mainDuration * mainDurScale
    const adjustedChargeUpDuration = chargeUpDuration * chargeDurScale

    const chargeUpAnimValue = { value: 1 }
    const chargeUpEmitterLayers = this.beamAssembly.chargeUpWriters.map(
      writer => {
        return {
          writer,
          emitter: writer.particleRenderObject.geometry.createBeamEmitter(
            start,
            writer.pathMaker,
            undefined,
            writer.energyLimit
          )
        }
      }
    )
    simpleTweener.to({
      description: 'beam launcher',
      target: chargeUpAnimValue,
      duration: adjustedChargeUpDuration,
      propertyGoals: {
        value: 0
      },
      onUpdate: () => {
        for (const elayer of chargeUpEmitterLayers) {
          elayer.emitter.update2(
            start,
            end,
            __up,
            0,
            elayer.writer.particlesPerSecond * chargeUpAnimValue.value
          )
        }
      },
      onComplete: () => {
        for (const elayer of chargeUpEmitterLayers) {
          elayer.writer.particleRenderObject.geometry.destroyEmitter(
            elayer.emitter
          )
        }
        if (this.beamAssembly.shake) {
          cameraShaker.add(this.beamAssembly.shake)
        }
      }
    })
    const peak = start.clone().lerp(end, 0.5)
    peak.y += start.distanceTo(end) * 0.25

    const curve = new QuadraticBezierCurveHelper(start, peak, end)
    const flareEnd = this.beamAssembly.flareEnd
      ? this.beamAssembly.flareEnd.clone()
      : new Object3D()
    if (this.beamAssembly.cloneFlareEndMaterial) {
      flareEnd.traverse(node => {
        if (node instanceof Mesh && node.material instanceof Material) {
          node.material = node.material.clone()
        }
      })
    }
    flareEnd.position.copy(end)
    this._scene.add(flareEnd)
    flareEnd.visible = false
    const flareEndUpdate =
      this.beamAssembly.flareEndUpdate || __defaultFlareEndUpdate
    const beamAnimValue = { value: 0 }
    const beamEmitterLayers = this.beamAssembly.mainWriters.map(writer => {
      return {
        writer,
        emitter: writer.particleRenderObject.geometry.createBeamEmitter(
          flareEnd.position,
          writer.pathMaker,
          undefined,
          writer.energyLimit
        )
      }
    })

    if (this.beamAssembly.mainSoundID) {
      const soundID = this.beamAssembly.mainSoundID
      taskTimer.add(() => {
        playSound('audioFxCommon', soundID)
      }, adjustedChargeUpDuration * 0.001)
    }

    // timeWarp.add(0.1)
    simpleTweener.to({
      description: 'beam launcher2',
      delay: adjustedChargeUpDuration,
      target: beamAnimValue,
      duration: adjustedMainDuration,
      propertyGoals: {
        value: 1
      },
      onUpdate: () => {
        for (const elayer of beamEmitterLayers) {
          if (beamAnimValue.value < elayer.writer.durationRatio) {
            elayer.emitter.update2(
              start,
              end,
              flareEnd.quaternion,
              0,
              elayer.writer.particlesPerSecond *
                elayer.writer.particlesPerSecondTimeDistribution(
                  beamAnimValue.value
                )
            )
          }
        }
        flareEnd.visible = true
        flareEndUpdate(flareEnd, beamAnimValue.value)
      },
      onComplete: () => {
        for (const elayer of beamEmitterLayers) {
          elayer.writer.particleRenderObject.geometry.destroyEmitter(
            elayer.emitter
          )
        }

        if (this.beamAssembly.explosionSoundID) {
          playSound('audioFxCommon', this.beamAssembly.explosionSoundID)
        }
        const explosionAnimValue = { value: 1 }
        const explosionEmitterLayers = this.beamAssembly.explosionWriters.map(
          writer => {
            return {
              writer,
              emitter: writer.particleRenderObject.geometry.createBeamEmitter(
                flareEnd.position,
                writer.pathMaker,
                undefined,
                writer.energyLimit
              )
            }
          }
        )
        const projectedPoint = curve.sample(1.1)
        projectedPoint.y += (flareEnd.position.y - projectedPoint.y) * 2
        flareEnd.lookAt(projectedPoint)
        flareEnd.quaternion.slerp(__up, 0.25)
        flareEnd.parent?.remove(flareEnd)
        simpleTweener.to({
          description: 'beam launcher3',
          target: explosionAnimValue,
          duration: this.beamAssembly.explosionDuration,
          propertyGoals: {
            value: 0
          },
          onUpdate: () => {
            for (const elayer of explosionEmitterLayers) {
              elayer.emitter.update2(
                start,
                end,
                flareEnd.quaternion,
                0,
                elayer.writer.particlesPerMeter * explosionAnimValue.value
              )
            }
          },
          onComplete: () => {
            for (const elayer of explosionEmitterLayers) {
              elayer.writer.particleRenderObject.geometry.destroyEmitter(
                elayer.emitter
              )
            }
          }
        })
        // timeWarp.add(0.075)
        // cameraShaker.add(0.4)
      }
    })
    const blockingChargeDur = Math.min(
      this.beamAssembly.blockingDuration,
      chargeUpDuration
    )
    const blockingMainDur = Math.max(
      0.0,
      this.beamAssembly.blockingDuration - blockingChargeDur
    )
    await animationDelay(
      blockingChargeDur * chargeDurScale + blockingMainDur * mainDurScale
    )
  }
}
