import { Vector4 } from 'three'

type PortalVariantParams = {
  reverse: boolean
  colorScale: Vector4
  colorOffset: Vector4
  colorBottomScale: Vector4
  colorBottomOffset: Vector4
}
export type SupportedPortalVariants =
  | 'conjure'
  | 'golden'
  | 'grayscale'
  | 'debug_red'
  | 'agy'
  | 'hrt'
  | 'str'
  | 'int'
  | 'wis'

export const portalVariantParams: {
  [K in SupportedPortalVariants]: PortalVariantParams
} = {
  conjure: {
    reverse: true,
    // colorScale: new Vector4(0.35, 0.65, 1.8, 1.0),
    // colorOffset: new Vector4(-0.1, -0.3, -0.8, -0.5)
    colorScale: new Vector4(0.65, 0.35, 1.8, 1.0),
    colorOffset: new Vector4(-0.1, -0.1, -0.8, -0.5),
    colorBottomScale: new Vector4(0.65, 0.35, 1.8, 1.0),
    colorBottomOffset: new Vector4(-0.1, -0.1, -0.8, -0.5)
  },
  golden: {
    reverse: true,
    // colorScale: new Vector4(0.35, 0.65, 1.8, 1.0),
    // colorOffset: new Vector4(-0.1, -0.3, -0.8, -0.5)
    colorScale: new Vector4(1, 0.8, 1.8, 1.0),
    colorOffset: new Vector4(1, 0.8, -1, 1),
    colorBottomScale: new Vector4(1, 0.8, 1.8, 1.0),
    colorBottomOffset: new Vector4(1, 0.8, -1, 1)
  },
  grayscale: {
    reverse: true,
    colorScale: new Vector4(1.0, 1.0, 1.0, 1.0),
    colorOffset: new Vector4(0, 0, 0, 1),
    colorBottomScale: new Vector4(1.0, 1.0, 1.0, 1.0),
    colorBottomOffset: new Vector4(0, 0, 0, 1)
  },
  debug_red: {
    reverse: true,
    colorScale: new Vector4(1.0, 0, 0, 1.0),
    colorOffset: new Vector4(0, 0, 0, 1),
    colorBottomScale: new Vector4(1.0, 0, 0, 1.0),
    colorBottomOffset: new Vector4(0, 0, 0, 1)
  },
  agy: {
    reverse: true,
    colorScale: new Vector4(0.2, 1.3, -0.72, 1),
    colorOffset: new Vector4(1.05, 0.35, -0.08, -0.5),
    colorBottomScale: new Vector4(-0.12, 1.1, 0.01, 1),
    colorBottomOffset: new Vector4(0.2, 0.1, -0.52, -0.5)
  },
  hrt: {
    reverse: true,
    colorScale: new Vector4(-0.01, 0.11, 0.79, 1),
    colorOffset: new Vector4(0.1, -0.1, 0.34, -0.5),
    colorBottomScale: new Vector4(0.9, 0.6, 1.8, 1),
    colorBottomOffset: new Vector4(0.4, 0.37, 0.1, -0.5)
  },
  str: {
    reverse: true,
    colorScale: new Vector4(0.62, 0.7, 0.1, 1),
    colorOffset: new Vector4(1.13, -0.58, 0.29, -0.5),
    colorBottomScale: new Vector4(1.02, 0.7, 0.1, 1),
    colorBottomOffset: new Vector4(0.49, 0.3, 0.2, -0.5)
  },
  int: {
    reverse: true,
    colorScale: new Vector4(0.6, 0.93, 1.7, 1),
    colorOffset: new Vector4(-1.2, 0, 1.88, -0.5),
    colorBottomScale: new Vector4(0.6, 1.4, 0.04, 1),
    colorBottomOffset: new Vector4(-1.2, 0.86, 0.3, -0.5)
  },
  wis: {
    reverse: true,
    colorScale: new Vector4(-0.07, 0, 1.56, 1),
    colorOffset: new Vector4(-0.04, 0.85, 1.33, -0.5),
    colorBottomScale: new Vector4(1.58, -0.01, 0.29, 1),
    colorBottomOffset: new Vector4(-0.13, 0.1, 0.07, -0.5)
  }
}
