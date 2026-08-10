import { unlerpClamped } from '@opensky/shared/utils/math'
import { Entity, System } from 'gg'
import { Mesh, PerspectiveCamera, Scene, Vector3 } from 'three'

import { Components } from '~/components'
import CollidableComponent from '~/components/CollidableComponent'
import { playRandomSoundVariation } from '~/helpers/soundHelpers'
import { createWorldEntity } from '~/helpers/worldHelpers'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { TrackableCollection } from '~/utils/TrackableCollection'

import GeneralInput from './input/GeneralInput'
import { underPointer } from './input/input'

type E = Entity<Components>
const __fireflyLastBurst = new Vector3()
const __fireflyBurst = new Vector3()

const funPokeColliderEntities = new TrackableCollection<Entity<Components>>(
  'funPokeColliderEntities'
)

export default class FunPokeSystem extends System<Components> {
  private _dirtEntity: E
  private _grassEntity: E
  private _stoneEntity: E
  constructor(
    scene: Scene,
    private _camera: PerspectiveCamera,
    _inputProvider: GeneralInput,
    dirtColliderMesh: Mesh,
    grassColliderMesh: Mesh,
    stoneColliderMesh: Mesh
  ) {
    super()
    const dirtEntity = createWorldEntity([
      new CollidableComponent(dirtColliderMesh, dirtColliderMesh)
    ])
    const grassEntity = createWorldEntity([
      new CollidableComponent(grassColliderMesh, grassColliderMesh)
    ])
    const stoneEntity = createWorldEntity([
      new CollidableComponent(stoneColliderMesh, stoneColliderMesh)
    ])
    this._dirtEntity = dirtEntity
    this._grassEntity = grassEntity
    this._stoneEntity = stoneEntity
    funPokeColliderEntities.add(dirtEntity)
    funPokeColliderEntities.add(grassEntity)
    funPokeColliderEntities.add(stoneEntity)
    underPointer.addRoot3D(funPokeColliderEntities)
    const onPressStart = () => {
      if (!this.enabled) {
        return
      }
      if (funPokeColliderEntities.items.includes(underPointer.entity as any)) {
        __vec3.copy(underPointer.worldPos)
        __vec3.lerp(
          this._camera.position,
          0.0175 / __vec3.distanceTo(this._camera.position)
        )
        __vec3.y += 0.005

        if (underPointer.entity === this._dirtEntity) {
          getBeamLauncher('dustPuffs', scene).launch(__vec3, __vec3)
          playRandomSoundVariation('audioFxCommonVariations', 'IslandTapDirt')
        } else if (underPointer.entity === this._grassEntity) {
          const position2 = __vec3.clone()

          __fireflyBurst.x = __vec3.x * 0.5
          __fireflyBurst.y = __vec3.z * 0.5
          __fireflyBurst.z = performance.now() * 0.001 * 0.01
          const fireflyThrottle =
            0.2 +
            0.8 *
              unlerpClamped(
                0,
                0.05,
                __fireflyBurst.distanceTo(__fireflyLastBurst)
              )
          __fireflyLastBurst.copy(__fireflyBurst)
          position2.y += 0.02
          const launcher = getBeamLauncher('grassFireflies', scene)
          launcher.beamAssembly.chargeUpDuration = 150 * fireflyThrottle
          launcher.launch(__vec3, position2)
          playRandomSoundVariation('audioFxCommonVariations', 'IslandTapGrass')
        } else if (underPointer.entity === this._stoneEntity) {
          getBeamLauncher('flintSplash', scene).launch(__vec3, __vec3)
          playRandomSoundVariation('audioFxCommonVariations', 'IslandTapStone')
        }
      }
    }
    _inputProvider.onRightPressStart.addListener(onPressStart)
    _inputProvider.onPressStart.addListener(onPressStart)
  }

  init() {
    //
  }

  update() {
    //
  }
}

let __vec3 = new Vector3()
