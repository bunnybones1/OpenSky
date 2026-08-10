import { Object3D } from 'three'

import TextMesh from '~/systems/text/TextMesh'

export function findTextFieldByText(base: Object3D, text: string): TextMesh {
  let result: TextMesh | undefined
  base.traverse(obj => {
    if (obj instanceof TextMesh && obj.text === text) {
      if (result) {
        console.warn(`already found a TextMesh with text "${text}"`)
      } else {
        result = obj
      }
    }
  })
  if (result) {
    return result
  } else {
    throw new Error(
      `TextMesh with text "${text}" not found in ${base.constructor} ${base.name}`
    )
  }
}
