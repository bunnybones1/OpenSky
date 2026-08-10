import { Component } from 'gg'
import { DirectionalLight, PointLight, SpotLight } from 'three'

import { scene } from '~/scenes/arena/scene'

export default class LightComponent extends Component<
  DirectionalLight | PointLight | SpotLight
> {
  onAttach() {
    scene.add(this.value)
  }
}
