/**
 * Source treasure bands from api/lib/conquest/conquestv2/treasure_map.go.
 *
 * Keep progress projection, pool calculation, point rollover, and reward
 * delivery on this one authority. The release gate derives these values from
 * Go and fails if either side drifts.
 */
export const CONQUEST_V2_TREASURE_TOTAL_POINTS = [
  0, 250, 750, 1_500, 2_500, 3_750, 5_250, 7_000, 9_000, 11_250, 13_750
] as const

export const CONQUEST_V2_TREASURE_TOTAL_WEIGHTS = [
  0, 1, 3.19, 6.9, 12.65, 21.32, 34.29, 53.99, 84.67, 134.32, 218.69
] as const

const descendingLevels = Array.from(
  { length: CONQUEST_V2_TREASURE_TOTAL_POINTS.length - 1 },
  (_, index) => CONQUEST_V2_TREASURE_TOTAL_POINTS.length - index - 1
)

const treasureCaseSql = (values: readonly number[]) =>
  [
    'CASE',
    ...descendingLevels.map(
      level =>
        `  WHEN current_points >= ${CONQUEST_V2_TREASURE_TOTAL_POINTS[level]} THEN ${values[level]}`
    ),
    '  ELSE 0 END'
  ].join('\n')

export const CONQUEST_V2_TREASURE_LEVEL_SQL = treasureCaseSql(
  CONQUEST_V2_TREASURE_TOTAL_POINTS.map((_, level) => level)
)

export const CONQUEST_V2_TREASURE_POINTS_ACCOUNTED_SQL = treasureCaseSql(
  CONQUEST_V2_TREASURE_TOTAL_POINTS
)

export const CONQUEST_V2_TREASURE_WEIGHT_SQL = treasureCaseSql(
  CONQUEST_V2_TREASURE_TOTAL_WEIGHTS
)
