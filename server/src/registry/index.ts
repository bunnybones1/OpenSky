import { GameMode } from '@opensky/proto'
import * as crypto from 'crypto'
import Redis, { RedisKey, RedisValue } from 'ioredis'

const GAME_SERVER_ID_PREFIX = 'game_server'
const GAME_SERVER_VERSION_PREFIX = 'release_version'
const GAME_SERVER_MATCH_ABANDON_STATUS_PREFIX = 'abandon_match'
const GAME_SERVER_MATCH_LOADING_ASSETS_STATUS_PREFIX = 'loading_assets'
const GAME_SERVER_IN_PROGRESS_MATCH_PREFIX = 'match_in_progress'
const GAME_SERVER_PENDING_REWARDS_MATCH_PREFIX = 'match_pending_rewards'

const MATCHMAKER_MATCH_REFUSAL_COUNT = 'match_refusal_count'
const MATCHMAKER_MATCH_REFUSAL_COOLDOWN = 'match_refusal_cooldown'
const MATCHMAKER_PENDING_MATCH_CREATION = 'matchmaker_pending_match_creation'

const MATCH_ABANDON_COUNT = 'match_abandon_count'
const MATCH_ABANDON_COOLDOWN = 'match_abandon_cooldown'

const RECENT_MATCH_INFO = 'recent_match_info'

export const GAME_SERVER_RANKING = 'game_server_ranking'

export const GAME_SERVER_STATUS_PAUSED = 'paused'
export const GAME_SERVER_STATUS_PENDING_SHUTDOWN = 'pending-shutdown'
export const GAME_SERVER_STATUS_RUNNING = 'running'

/*
  Shared Redis Key Patterns
*/

export const serverInstanceKey = (
  id: string,
  url: string,
  port: number,
  version: string
) => {
  const SERVER_ID = crypto
    .createHash('sha1')
    .update(`${id}${url}${port}${version}`)
    .digest('hex')

  return `${GAME_SERVER_ID_PREFIX}:${SERVER_ID}:${GAME_SERVER_VERSION_PREFIX}:${version}`
}

export const statusServerKey = (serverKey: string) => {
  return `${serverKey}:status`
}

export const matchRefusalCountKey = (
  playerID: string,
  mode: GameMode,
  version: string
) => {
  return `${MATCHMAKER_MATCH_REFUSAL_COUNT}:${playerID.toLowerCase()}:${mode}:${version}`
}

export const matchRefusalCooldownKey = (
  playerID: string,
  mode: GameMode,
  version: string
) => {
  return `${MATCHMAKER_MATCH_REFUSAL_COOLDOWN}:${playerID.toLowerCase()}:${mode}:${version}`
}

export const matchAbandonCountKey = (playerID: string, version: string) => {
  return `${MATCH_ABANDON_COUNT}:${playerID.toLowerCase()}:${version}`
}

export const matchAbandonCooldownKey = (playerID: string, version: string) => {
  return `${MATCH_ABANDON_COOLDOWN}:${playerID.toLowerCase()}:${version}`
}

export const playerDisconnectedAbandonStatusKey = (playerID: string) => {
  return `${GAME_SERVER_MATCH_ABANDON_STATUS_PREFIX}:${playerID.toLowerCase()}`
}

export const loadingAssetsStatusKey = (playerID: string) => {
  return `${GAME_SERVER_MATCH_LOADING_ASSETS_STATUS_PREFIX}:${playerID.toLowerCase()}`
}

export const matchInProgressKey = (playerID: string) => {
  return `${GAME_SERVER_IN_PROGRESS_MATCH_PREFIX}:${playerID.toLowerCase()}`
}

export const matchmakerPendingMatchCreationKey = (playerID: string) => {
  return `${MATCHMAKER_PENDING_MATCH_CREATION}:${playerID.toLowerCase()}`
}

export const matchPendingRewardsKey = (playerID: string) => {
  return `${GAME_SERVER_PENDING_REWARDS_MATCH_PREFIX}:${playerID.toLowerCase()}`
}

export const recentMatchKey = (playerID: string) => {
  return `${RECENT_MATCH_INFO}:${playerID.toLowerCase()}`
}

/*
  Redis Registry
*/
export class RedisRegistry {
  private _redis: Redis
  constructor(port: number, host: string, name: 'MATCHMAKER' | 'GAME_SERVER') {
    const inst = new Redis({
      port,
      host,
      retryStrategy: () => {
        console.log(`${name}: CANNOT CONNECT TO REDIS, RETRYING...`)
        return 1000
      }
    })

    inst.on('connect', () => {
      console.log('REDIS CONNECTED', { port, host })
    })

    this._redis = inst
  }

  get(key: RedisKey) {
    return this._redis.get(key)
  }

  exists(...keys: RedisKey[]) {
    return this._redis.exists(...keys)
  }

  unlink(...keys: RedisKey[]) {
    return this._redis.unlink(...keys)
  }

  incr(key: RedisKey) {
    return this._redis.incr(key)
  }

  expire(key: RedisKey, seconds: number) {
    return seconds > 0
      ? this._redis.expire(key, seconds)
      : new Promise<'OK'>(resolve => resolve('OK'))
  }

  rename(key: RedisKey, newkey: RedisKey) {
    return this._redis.rename(key, newkey)
  }

  ttl(key: RedisKey) {
    return this._redis.ttl(key)
  }

  zadd(key: RedisKey, score: number, member: RedisKey) {
    return this._redis.zadd(key, score, member)
  }

  zrem(key: RedisKey, member: RedisKey) {
    return this._redis.zrem(key, member)
  }

  setex(key: RedisKey, seconds: number, value: RedisValue) {
    return seconds > 0
      ? this._redis.setex(key, seconds, value)
      : new Promise<'OK'>(resolve => resolve('OK'))
  }

  publish(channel: string, message: string) {
    return this._redis.publish(channel, message)
  }
}

/*
  utils
*/
export const JSONSafeParse = (
  text: string,
  reviver?: (this: any, key: string, value: any) => any
): {
  value: object | null
  error?: Error
} => {
  try {
    return text
      ? {
          value: JSON.parse(text, reviver)
        }
      : { value: null }
  } catch (error) {
    return {
      value: null,
      error
    }
  }
}
