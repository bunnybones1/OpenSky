const FIRST_SEASON_START_MS = Date.UTC(2021, 10, 22, 14, 0, 0)
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const SEASON_MS = 4 * WEEK_MS

export const seasonFromDate = (date = new Date()): number =>
  Math.floor((date.getTime() - FIRST_SEASON_START_MS) / SEASON_MS) + 1

export const seasonStart = (season: number): Date => {
  if (season < 1) throw new Error('minimum season is 1')
  return new Date(FIRST_SEASON_START_MS + (season - 1) * SEASON_MS)
}

export const currentSeasonStart = (date = new Date()): Date =>
  new Date(seasonStart(seasonFromDate(date)).getTime() + 1000)

export const nextSeasonStart = (date = new Date()): Date =>
  seasonStart(seasonFromDate(date) + 1)

export const questAutoRerollTimes = (date = new Date()) => {
  const daily = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      14,
      0,
      0
    )
  )
  if (daily.getTime() < date.getTime()) daily.setUTCDate(daily.getUTCDate() + 1)

  const start = seasonStart(seasonFromDate(date))
  const week = Math.floor((date.getTime() - start.getTime()) / WEEK_MS) + 1
  const weekly = new Date(start.getTime() + week * WEEK_MS)

  return {
    daily: daily.toISOString(),
    weekly: weekly.toISOString(),
    seasonal: nextSeasonStart(date).toISOString()
  }
}

const SEASON_NAMES: Record<number, string> = {
  16: 'Hex',
  17: 'Arcadeum',
  18: 'Yard Sale',
  19: 'Clockwork',
  20: 'Deep Sea',
  21: 'Magical',
  22: 'Vacation',
  23: 'Shroomy',
  24: 'Stinky Eye',
  25: 'Treasure Map',
  26: 'Pumpkin',
  27: 'Armis',
  28: 'Frosted',
  29: 'Waterful!',
  30: 'Picnic',
  31: 'Ode To Lotus',
  32: 'Ode To Ari',
  33: 'Hex Redux',
  34: 'Arcadeum Redux',
  35: 'Yard Sale Redux',
  36: 'Clockwork Redux',
  37: 'Deep Sea Redux',
  38: 'Magical Redux',
  39: 'Vacation Redux',
  40: 'Shroomy Redux',
  41: 'Stinky Eye Redux',
  42: 'Treasure Map Redux',
  43: 'Pumpkin Redux',
  44: 'Armis Redux',
  45: 'Frosted Redux',
  46: 'Waterful! Redux',
  47: 'Picnic Redux',
  48: 'Ode To Lotus Redux',
  49: 'Ode To Ari Redux',
  50: 'Hex Redux',
  51: 'Arcadeum Redux',
  52: 'Yard Sale Redux',
  53: 'Clockwork Redux',
  54: 'Deep Sea Redux',
  55: 'Magical Redux',
  56: 'Vacation Redux',
  57: 'Shroomy Redux',
  58: 'Stinky Eye Redux',
  59: 'Treasure Map Redux',
  60: 'Pumpkin Redux',
  61: 'Armis Redux',
  62: 'Frosted Redux',
  63: 'Waterful! Redux',
  64: 'Picnic Redux',
  65: 'Ode To Lotus Redux',
  66: 'Ode To Ari Redux',
  67: 'Hex Redux',
  68: 'Arcadeum Redux',
  69: 'Yard Sale Redux',
  70: 'Clockwork Redux',
  71: 'Deep Sea Redux',
  72: 'Magical Redux',
  73: 'Vacation Redux',
  74: 'Shroomy Redux',
  75: 'Stinky Eye Redux',
  76: 'Treasure Map Redux',
  77: 'Pumpkin Redux',
  78: 'Armis Redux',
  79: 'Frosted Redux',
  80: 'Waterful! Redux',
  81: 'Picnic Redux',
  82: 'Ode To Lotus Redux',
  83: 'Ode To Ari Redux'
}

export const seasonName = (season: number): string =>
  SEASON_NAMES[season] || 'unknown'
