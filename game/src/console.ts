import { Mesh, Object3D } from 'three'

import { getCardCache } from './cardCache'
import renderer from './renderer'
import { scene } from './scenes/arena/scene'
import { world } from './world'

const debugInfo = () => {
  const {
    info: { memory, programs, render }
  } = renderer
  const meshesByName: Map<string, number> = new Map()
  let objectCount = 0
  let meshCount = 0
  let visibleMeshCount = 0

  // Renderer information
  console.group('Memory:', memory.geometries + memory.textures)
  console.log('Geometries:', memory.geometries)
  console.log('Textures:', memory.textures)
  console.groupEnd()

  console.groupCollapsed('%cPrograms:', programs!.length)
  programs!.forEach(program => console.log(program))
  console.groupEnd()

  console.group('Render:')
  console.log('Draw calls:', render.calls)
  console.log('Triangles:', render.triangles)
  console.log('Points:', render.points)
  console.log('Lines:', render.lines)
  console.groupEnd()

  // Entity information
  console.group(
    '%cEntities:',
    'font-weight: bold;',
    world.manager.entities.size
  )
  console.groupEnd()

  // Scene information
  const handleTraverse = (x: Object3D) => {
    objectCount++

    if (x instanceof Mesh) {
      const name = x.name || 'unnamed'
      const count = meshesByName.has(name) ? meshesByName.get(name)! + 1 : 1

      meshesByName.set(name, count)
      meshCount++

      if (isVisible(x)) {
        visibleMeshCount++
      }
    }
  }

  const isVisible = (x: THREE.Mesh) =>
    x.visible && 'visible' in x.material && x.material.visible

  scene.traverse(handleTraverse)

  console.group('Scene:')
  console.log('Object3D:', objectCount)
  console.groupCollapsed('Meshes:', meshCount, `(${visibleMeshCount} visible)`)

  Array.from(meshesByName.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`%c${count}%c ${name}`, 'color: blue;', 'color: black;')
    })
  console.groupEnd()
  console.groupEnd()

  console.groupCollapsed('Card Cache')
  console.log(getCardCache())
  console.groupEnd()
}

Object.defineProperty(window, 'debugInfo', {
  get() {
    debugInfo()
  }
})

Object.defineProperty(window, 'cardCache', {
  get() {
    return getCardCache()
  }
})
