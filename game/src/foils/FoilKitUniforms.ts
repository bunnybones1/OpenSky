import { Uniform, Vector3 } from 'three'

export default class FoilKitUniforms {
  private _cardEmbossTexture: Uniform | undefined
  foilRGBSplit = new Uniform(1)
  metalColorStrength = new Uniform(1)
  foilBandWavelength = new Uniform(1)
  foilOnArtOnly = new Uniform(new Vector3(1, 1, 1))
  tiltShineSensitivity = new Uniform(1)
}
