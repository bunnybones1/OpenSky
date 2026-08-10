const s = 1.5
const x = 0.02 * s
const y1 = 0.02 * s
const y2 = 0.03 * s
export const cardShapeCoords = [
  [0, 0, y2],
  [x, 0, y1],
  [x, 0, -y1],
  [0, 0, -y2],
  [-x, 0, -y1],
  [-x, 0, y1]
] as const

export const cardShapeTightCoords = cardShapeCoords.map(v => {
  const v2 = v.map(n => n * 0.85)
  v2[1] = -0.005
  return v2
}) as unknown as typeof cardShapeCoords

const s2 = 1
const bx = 0.02 * s2
const by1 = 0.02 * s2
const by2 = 0.025 * s2
const heroShapeCoords = [
  [0, 0, by2],
  [bx, 0, by1],
  [bx, 0, -by1],
  [0, 0, -by2],
  [-bx, 0, -by1],
  [-bx, 0, by1]
] as const
void heroShapeCoords

void heroShapeCoords
const __depth = -0.002
const heroShapeSootCoords = [
  [0, -__depth, by2],
  [bx, -__depth, by1],
  [bx, -__depth, -by1],
  [0, -__depth, -by2],
  [-bx, -__depth, -by1],
  [-bx, -__depth, by1]
] as const
void heroShapeSootCoords
