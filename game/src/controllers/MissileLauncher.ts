import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { delayPromise } from '@opensky/shared/utils/async'
import { lerp, rand } from '@opensky/shared/utils/math'
import { Object3D, Scene, Vector3 } from 'three'

import QuadraticBezierCurveHelper from '~/helpers/QuadraticBezierCurveHelper'
import { playSound } from '~/helpers/soundHelpers'
import { getYadaYadaDuration } from '~/helpers/yadaYadaDurationHelper'
import { MissileParticlePathMaker } from '~/meshes/Particles/missileParticlePathMakerLib'
import {
  LayeredParticleLauncher,
  MissileAssembly,
  ParticleRenderObject
} from '~/meshes/Particles/particleHelpers'
import queryParams from '~/queryParams'
import { simpleTweener } from '~/systems/animation/tweeners'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { copyDefaults } from '~/utils/jsUtils'
import { inlineCloneFirstMeshMaterial } from '~/utils/materials'
import { taskTimer } from '~/utils/taskTimer'
import { getQuatFromEuler } from '~/utils/threeMathUtils'

export class MissileParticleWriter {
  constructor(
    public particleRenderObject: ParticleRenderObject,
    public pathMaker: MissileParticlePathMaker,
    public particlesPerMeter: number
  ) {
    //
  }
}

const __defaultAssemblyParameters: Partial<MissileAssembly> = {
  chargeUpDuration: 500,
  distanceToDuration: (distance: number) => 200 + 1000 * distance,
  explosionDuration: 500
}

const __frontLines = [-0.3, 0.1]
const __up = getQuatFromEuler(Math.PI * -0.5, 0, 0)
export default class MissileLauncher implements LayeredParticleLauncher {
  private _launchCount = 0
  constructor(
    private _scene: Scene,
    private _missileAssembly: MissileAssembly
  ) {
    copyDefaults(_missileAssembly, __defaultAssemblyParameters)
  }
  startTestVolley(interval = 2000) {
    if (queryParams.isolate) {
      interval *= 2
    }
    const intervalSeconds = interval * 0.001
    const repeat = async () => {
      this._launchCount++
      for (let i = rand(1, queryParams.volleyMax); i > 0; i--) {
        if (Math.random() > 0.5) {
          await delayPromise(200)
        }
        const halfWidthRange = 0.4
        const start = new Vector3(
          rand(-halfWidthRange, halfWidthRange),
          0.05,
          getFromArrayWrapped(__frontLines, this._launchCount)
        )
        const end = new Vector3(
          queryParams.isolate ? 0 : rand(-halfWidthRange, halfWidthRange),
          0.05,
          getFromArrayWrapped(__frontLines, this._launchCount + 1)
        )

        this.launch(start, end)
      }
      taskTimer.add(repeat, intervalSeconds)
    }
    taskTimer.add(repeat, 1)
  }
  async launch(start: Vector3, end: Vector3) {
    if (this._missileAssembly.chargeUpSoundID) {
      playSound('audioFxCommon', this._missileAssembly.chargeUpSoundID)
    }
    const distance = end.distanceTo(start)

    const mainDuration = this._missileAssembly.distanceToDuration!(distance)
    const chargeUpDuration = this._missileAssembly.chargeUpDuration || 0

    const chargeDurScale = getYadaYadaDuration(
      this._missileAssembly.chargeGatlingTag
    )
    const mainDurScale = getYadaYadaDuration(
      this._missileAssembly.mainGatlingTag
    )

    const adjustedMainDuration = mainDuration * mainDurScale
    const adjustedChargeUpDuration = chargeUpDuration * chargeDurScale

    const peak = start.clone().lerp(end, 0.5)
    peak.y += start.distanceTo(end) * 0.25

    const curve = new QuadraticBezierCurveHelper(start, peak, end)
    const missile = this._missileAssembly.missileBody
      ? this._missileAssembly.missileBody.clone(true)
      : new Object3D()
    missile.position.copy(start)
    const missileMat = inlineCloneFirstMeshMaterial(missile)
    this._scene.add(missile)
    const originalOpacity = missileMat ? missileMat.opacity : 0
    const originalBulletScale = missile.scale.x
    if (missileMat) {
      missileMat.opacity = 0
      missile.scale.multiplyScalar(5)
    }

    const chargeUpAnimValue = { value: 1 }
    const chargeUpEmitterLayers = this._missileAssembly.chargeUpWriters.map(
      writer => {
        return {
          writer,
          emitter: writer.particleRenderObject.geometry.createEmitter(
            missile.position,
            writer.pathMaker
          )
        }
      }
    )
    const projectedPoint = curve.sample(1.1)
    projectedPoint.y += (missile.position.y - projectedPoint.y) * 2
    simpleTweener.to({
      description: 'missile launcher',
      target: chargeUpAnimValue,
      duration: adjustedChargeUpDuration,
      propertyGoals: {
        value: 0
      },
      onUpdate: () => {
        const amt = chargeUpAnimValue.value
        const easeOutAmt = 1 - Math.pow(1 - amt, 2)
        const s = lerp(originalBulletScale, originalBulletScale * 5, easeOutAmt)
        missile.scale.set(s, s, s)
        if (missileMat) {
          missileMat.opacity = lerp(originalOpacity, 0, easeOutAmt)
        }
        for (const elayer of chargeUpEmitterLayers) {
          elayer.emitter.update(
            missile.position,
            missile.quaternion,
            0,
            elayer.writer.particlesPerMeter * amt
          )
        }
      },
      onComplete: () => {
        for (const elayer of chargeUpEmitterLayers) {
          elayer.writer.particleRenderObject.geometry.destroyEmitter(
            elayer.emitter
          )
        }
      }
    })
    const missileAnimValue = { value: 0 }
    const missileEmitterLayers = this._missileAssembly.mainWriters.map(
      writer => {
        return {
          writer,
          emitter: writer.particleRenderObject.geometry.createEmitter(
            missile.position,
            writer.pathMaker
          )
        }
      }
    )

    if (this._missileAssembly.mainSoundID) {
      const soundID = this._missileAssembly.mainSoundID
      taskTimer.add(() => {
        playSound('audioFxCommon', soundID)
      }, adjustedChargeUpDuration * 0.001)
    }

    // timeWarp.add(0.1)
    // cameraShaker.add(0.005)
    simpleTweener.to({
      description: 'missile launcher2',
      delay: adjustedChargeUpDuration,
      target: missileAnimValue,
      duration: adjustedMainDuration,
      propertyGoals: {
        value: 1
      },
      onUpdate: () => {
        const oldPos = missile.position.clone()
        missile.position.copy(curve.sample(missileAnimValue.value))
        missile.lookAt(oldPos)
        for (const elayer of missileEmitterLayers) {
          elayer.emitter.update(
            missile.position,
            missile.quaternion,
            elayer.writer.particlesPerMeter,
            0
          )
        }
      },
      onComplete: () => {
        for (const elayer of missileEmitterLayers) {
          elayer.writer.particleRenderObject.geometry.destroyEmitter(
            elayer.emitter
          )
        }

        if (this._missileAssembly.explosionSoundID) {
          playSound('audioFxCommon', this._missileAssembly.explosionSoundID)
        }
        const explosionAnimValue = { value: 1 }
        const explosionEmitterLayers =
          this._missileAssembly.explosionWriters.map(writer => {
            return {
              writer,
              emitter: writer.particleRenderObject.geometry.createEmitter(
                missile.position,
                writer.pathMaker
              )
            }
          })
        const projectedPoint = curve.sample(1.1)
        projectedPoint.y += (missile.position.y - projectedPoint.y) * 2
        missile.lookAt(projectedPoint)
        missile.quaternion.slerp(__up, 0.25)
        missile.parent?.remove(missile)
        simpleTweener.to({
          description: 'missile launcher 3',
          target: explosionAnimValue,
          duration: this._missileAssembly.explosionDuration,
          propertyGoals: {
            value: 0
          },
          onUpdate: () => {
            for (const elayer of explosionEmitterLayers) {
              elayer.emitter.update(
                missile.position,
                missile.quaternion,
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
        if (this._missileAssembly.shake) {
          cameraShaker.add(this._missileAssembly.shake)
        }
      }
    })

    const blockingChargeDur = Math.min(
      this._missileAssembly.blockingDuration,
      chargeUpDuration
    )
    const blockingMainDur = Math.max(
      0.0,
      this._missileAssembly.blockingDuration - blockingChargeDur
    )
    await animationDelay(
      blockingChargeDur * chargeDurScale + blockingMainDur * mainDurScale
    )
  }
}
