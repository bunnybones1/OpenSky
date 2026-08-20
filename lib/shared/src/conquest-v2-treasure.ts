import type { ConquestV2TreasureProgress } from '@opensky/proto'

/**
 * Source treasure bands from api/lib/conquest/conquestv2/treasure_map.go.
 *
 * Keep every TypeScript progress projection, point cap, pool calculation,
 * rollover, and reward delivery on this one cross-Worker authority. The
 * Cloudflare release gate derives these values from Go and fails on drift.
 */
export const CONQUEST_V2_TREASURE_TOTAL_POINTS = [
  0, 250, 750, 1_500, 2_500, 3_750, 5_250, 7_000, 9_000, 11_250, 13_750
] as const

export const CONQUEST_V2_TREASURE_TOTAL_WEIGHTS = [
  0, 1, 3.19, 6.9, 12.65, 21.32, 34.29, 53.99, 84.67, 134.32, 218.69
] as const

export const CONQUEST_V2_POINTS_CAP =
  CONQUEST_V2_TREASURE_TOTAL_POINTS[
    CONQUEST_V2_TREASURE_TOTAL_POINTS.length - 1
  ]

export const conquestV2TreasureProgress = (
  currentPoints: number
): ConquestV2TreasureProgress => {
  const points = Math.max(0, Math.trunc(currentPoints))
  let level = CONQUEST_V2_TREASURE_TOTAL_POINTS.length - 1
  for (
    let index = 0;
    index < CONQUEST_V2_TREASURE_TOTAL_POINTS.length - 1;
    index++
  ) {
    if (points < CONQUEST_V2_TREASURE_TOTAL_POINTS[index + 1]) {
      level = index
      break
    }
  }
  const accounted = CONQUEST_V2_TREASURE_TOTAL_POINTS[level]
  return {
    treasureLevel: level,
    treasurePoints: points - accounted,
    treasurePointsRequired:
      level < CONQUEST_V2_TREASURE_TOTAL_POINTS.length - 1
        ? CONQUEST_V2_TREASURE_TOTAL_POINTS[level + 1] - points
        : 0
  }
}
