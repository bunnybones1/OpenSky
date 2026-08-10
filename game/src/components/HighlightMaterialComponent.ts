import { Component, Entity } from 'gg'
import { Color, Mesh } from 'three'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

interface Highlight {
  materials: {
    color: Color
    opacity: number
    visible: boolean
    thicknessRatio: number
    uvScaleV: number
    getFinalDepth(): number
  }[]
  mesh: Mesh
}

export default class HighlightMaterialComponent extends Component<Highlight> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HighlightMaterialComponent'
  )
  onAttach(entity: Entity<Components>) {
    HighlightMaterialComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    HighlightMaterialComponent.entities.remove(entity)
  }
}
