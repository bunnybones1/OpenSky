import { Material, Mesh, Points } from 'three'

export function getMeshMaterial(mesh: Mesh | Points) {
  return mesh.material instanceof Material ? mesh.material : mesh.material[0]
}
