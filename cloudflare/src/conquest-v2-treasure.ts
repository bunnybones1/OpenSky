import {
  CONQUEST_V2_TREASURE_TOTAL_POINTS,
  CONQUEST_V2_TREASURE_TOTAL_WEIGHTS
} from '@opensky/shared/conquest-v2-treasure'

export {
  CONQUEST_V2_TREASURE_TOTAL_POINTS,
  CONQUEST_V2_TREASURE_TOTAL_WEIGHTS
} from '@opensky/shared/conquest-v2-treasure'

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
