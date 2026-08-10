import { Texture } from 'three'

export function safelyResetFlipY(tex?: Texture, state = false) {
  //default false, but either is possible
  if (tex) {
    tex.flipY = state
  } else {
    console.warn('could not flipY on missing texture.')
    //(Check accessors. Typescript doesn't error if you try to get something that has a setter but no getter)
  }
}
