import { unlerp } from '@opensky/shared/utils/math'
import { Component, Entity } from 'gg'
import { Color, Mesh, Object3D, RawShaderMaterial, Scene, Vector3 } from 'three'

import { COLOR_ARROW_YELLOW } from '~/colors/colorLibrary'
import {
  createIntentArrow,
  releaseIntentArrow
} from '~/factories/IntentArrowFactory'
import { IntentArrowMesh } from '~/meshes/IntentArrowMesh'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { simpleTweener } from '~/systems/animation/tweeners'
import UpdateManager from '~/systems/UpdateManager'
import { findContainingScene } from '~/utils/threeUtils'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'
export default class ArrowComponent extends Component<IntentArrowMesh> {
  static entities = new TrackableCollection<Entity<Components>>(
    'ArrowComponent'
  )
  private scene: Scene
  constructor(pointAt: Object3D, color: Color) {
    const arrow = createIntentArrow(pointAt, color)
    // new SourceArrowHelper(pointAt, color, 0.08, 0.04)
    arrow.position.copy(pointAt.position)
    super(arrow)
    this.scene = findContainingScene(pointAt)!
  }
  onAttach(e: Entity<Components>) {
    this.scene.add(this.value)
    ArrowComponent.entities.add(e)
  }
  onDetach(e: Entity<Components>) {
    this.value.traverse(obj => {
      if (obj instanceof Mesh && obj.material instanceof RawShaderMaterial) {
        const opacityUniform = obj.material.uniforms.opacity
        simpleTweener.to({
          description: 'arrow opacity',
          target: opacityUniform,
          propertyGoals: { value: 0 },
          duration: 300,
          onComplete: () => {
            releaseIntentArrow(this.value)
            opacityUniform.value = 1
          }
        })
      }
    })
    ArrowComponent.entities.remove(e)
    if (e.has('transform')) {
      getBeamLauncher('evaporatedMagicArrow', this.scene).launch(
        e
          .get('transform')
          .position.clone()
          .add(new Vector3(0, 0.03, 0)),
        this.value.position
      )
    }
  }
}

const __workingColor = COLOR_ARROW_YELLOW.clone()
let __alternateColor = COLOR_ARROW_YELLOW.clone()
let __taredTime = 0
let __arrowColorUpdaterInited = false
export function attemptToChangeArrowColor2(
  e: Entity<Components>,
  color: Color
) {
  if (e.has('arrow')) {
    __taredTime = performance.now()
    e.get('arrow').material.color2 = __workingColor
    __alternateColor = color
    if (!__arrowColorUpdaterInited) {
      __arrowColorUpdaterInited = true
      UpdateManager.register({
        update() {
          __workingColor.lerpColors(
            COLOR_ARROW_YELLOW,
            __alternateColor,
            unlerp(-1, 3, Math.sin((performance.now() - __taredTime) * 0.004))
          )
        }
      })
    }
  }
}
