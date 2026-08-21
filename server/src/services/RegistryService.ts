import { GameMode } from '@opensky/proto'
import {
  StoredRecentMatchInfo,
  ServerInfo
} from '@opensky/shared/game-server-message-types'
import {
  MatchStartPlayerInfo,
  RegistryMatchInfo
} from '@opensky/shared/matchmaker-message-types'
import { isMainThread } from 'worker_threads'

import {
  GAME_SERVER_RANKING,
  GAME_SERVER_STATUS_PAUSED,
  GAME_SERVER_STATUS_PENDING_SHUTDOWN,
  GAME_SERVER_STATUS_RUNNING,
  JSONSafeParse,
  loadingAssetsStatusKey,
  matchAbandonCooldownKey,
  matchAbandonCountKey,
  matchInProgressKey,
  matchPendingRewardsKey,
  playerDisconnectedAbandonStatusKey,
  recentMatchKey,
  RedisRegistry,
  serverInstanceKey,
  statusServerKey
} from '../registry'
import { matchbook } from '../Server'
import { Config } from '../utils/config'
import { logger } from '../utils/logger'
import { releaseVersion } from '../utils/releaseVersion'

const HEALTH_CHECK_UPDATE_INTERVAL_SECONDS = 20
const HEALTH_CHECK_EXPIRY_SECONDS = HEALTH_CHECK_UPDATE_INTERVAL_SECONDS * 2

const RECENT_MATCH_EXPIRY_SECONDS = 60 * 60 * 24

class RegistryService {
  protected _redis: RedisRegistry
  protected _config: Config
  protected _serverKey: string

  constructor(_config: Config) {
    this._config = _config

    this._redis = new RedisRegistry(
      _config.redis.port,
      _config.redis.host,
      'GAME_SERVER'
    )

    this._serverKey = serverInstanceKey(
      this.serverID,
      this.serverURL,
      this.serverPort,
      this.serverReleaseVersionHash
    )
  }

  get isTLS(): boolean {
    return process.env.TLS === 'true' ? true : false
  }

  get isInternalTLS(): boolean {
    return process.env.INTERNAL_TLS === 'true'
      ? true
      : process.env.INTERNAL_TLS === 'false'
      ? false
      : this.isTLS
  }

  get serverPort(): number {
    return process.env.PORT ? +process.env.PORT : this._config.server.port
  }

  get serverID(): string {
    return process.env.SERVER_ID || 'game-server-default'
  }

  get serverURL(): string {
    return (
      process.env.SERVER_URL || `${this._config.server.host}:${this.serverPort}`
    )
  }

  get internalServerURL(): string {
    return (
      process.env.INTERNAL_SERVER_URL ||
      `${this._config.server.host}:${this.serverPort}`
    )
  }

  get serverReleaseVersionHash(): string {
    return releaseVersion
  }

  setPlayerDisconnectedAbandonStatus(playerID: string, expiry: number) {
    this._redis
      .setex(playerDisconnectedAbandonStatusKey(playerID), expiry, playerID)
      .catch(err => logger.error(err))
  }

  setPlayerLoadingAssetsAbandonStatus(playerID: string, expiry: number) {
    this._redis
      .setex(loadingAssetsStatusKey(playerID), expiry, playerID)
      .catch(err => logger.error(err))
  }

  clearPlayerLoadingAssetsAbandonStatus(...playerIDs: string[]) {
    this._redis
      .unlink(...playerIDs.map(playerID => loadingAssetsStatusKey(playerID)))
      .catch(err => logger.error(err))
  }
}

/*
  To be used on main thread server
*/
export class GameServerRegistryService extends RegistryService {
  get serverInfo(): ServerInfo {
    const wsProtocol = this.isTLS ? 'wss://' : 'ws://'
    const httpProtocol = this.isTLS ? 'https://' : 'http://'
    const internalHttpProtocol = this.isInternalTLS ? 'https://' : 'http://'

    return {
      status: '',
      name: this.serverID,
      hostname: this.serverURL,
      internalHostname: this.internalServerURL,
      port: this.serverPort,
      ws: `${wsProtocol}${this.serverURL}`,
      http: `${httpProtocol}${this.serverURL}`,
      internalHttp: `${internalHttpProtocol}${this.internalServerURL}`,
      load: {
        inProgressMatches: matchbook.inProgressMatches,
        maxCapacity:
          this._config.settings.worker.maxThreadCount *
          this._config.settings.worker.maxMatchesPerThread,
        completedMatches: matchbook.matchesHosted
      },
      releaseVersion: this.serverReleaseVersionHash
    }
  }

  registerMatch(
    matchID: number,
    replayID: string,
    mode: GameMode,
    players: MatchStartPlayerInfo[]
  ) {
    const playerIDs = players.map(p => p.account.address.toLowerCase())

    const expirySeconds = this._config.settings.abandonTimeout / 1000

    const info: RegistryMatchInfo = {
      id: matchID,
      replayID: replayID,
      mode,
      playerIDs,
      serverLocationKey: this._serverKey,
      version: this.serverReleaseVersionHash,
      initialized: false
    }

    playerIDs.forEach(p => {
      this._redis.setex(
        matchInProgressKey(p),
        expirySeconds,
        JSON.stringify(info)
      )
    })
  }

  async getMatchInProgress(
    playerID: string
  ): Promise<RegistryMatchInfo | null> {
    const res = await this._redis.get(matchInProgressKey(playerID))

    if (!res) {
      return null
    }

    const { value, error } = JSONSafeParse(res)

    if (error) {
      logger.error('getMatchInfo parse error', error)
      return null
    }

    return value as RegistryMatchInfo
  }

  async getMatchInfo(
    playerID: string
  ): Promise<RegistryMatchInfo | StoredRecentMatchInfo | null> {
    const rewardWaitTime = this._config.settings.recordMatchEndTimeoutMs
    for (let i = 0; i < Math.ceil(rewardWaitTime / 1000); i++) {
      const pendingRewards = await this._redis.get(
        matchPendingRewardsKey(playerID)
      )
      if (!pendingRewards) {
        break // rewards have been delivered, match is over. If we waited this long, matchInProgressKey will be cleared.
      }
      await new Promise(res => setTimeout(res, 1000)) // check in 1s intervals for match to finish rewards.
    }

    const res = await this._redis.get(matchInProgressKey(playerID))

    if (res) {
      const { value, error } = JSONSafeParse(res)

      if (error) {
        logger.error('parse error', error)
        return null
      }

      return value as RegistryMatchInfo
    }
    const recentMatchRes = await this._redis.get(recentMatchKey(playerID))

    if (!recentMatchRes) {
      return null
    }

    const { value, error } = JSONSafeParse(recentMatchRes)

    if (error) {
      logger.error('getRecentMatchInfo parse error', error)
      return null
    }

    return value as StoredRecentMatchInfo
  }

  registerGameServer(callback?: () => void) {
    const healthCheck = async (init?: boolean) => {
      const serverStatus = await this._redis.get(
        statusServerKey(this._serverKey)
      )

      const serverInfo = this.serverInfo
      serverInfo.status = serverStatus || 'unknown'

      // set server data and TTL
      this._redis.setex(
        this._serverKey,
        HEALTH_CHECK_EXPIRY_SECONDS,
        JSON.stringify(serverInfo)
      )

      if (init) {
        this.setRunning()
      }

      if (
        serverStatus === GAME_SERVER_STATUS_RUNNING ||
        serverStatus === GAME_SERVER_STATUS_PAUSED
      ) {
        // add server to ranked list
        const score = Math.floor(
          (100.0 * this.serverInfo.load.inProgressMatches) /
            this.serverInfo.load.maxCapacity
        )

        this._redis.zadd(GAME_SERVER_RANKING, score, this._serverKey)
      }

      // extend status TTL
      this._redis.expire(
        statusServerKey(this._serverKey),
        HEALTH_CHECK_EXPIRY_SECONDS
      )

      callback?.()
    }

    healthCheck(true)

    // update health checks every X seconds
    setInterval(healthCheck, HEALTH_CHECK_UPDATE_INTERVAL_SECONDS * 1000)
  }

  isPendingShutdown = async (): Promise<boolean> => {
    const serverStatus = await this._redis.get(statusServerKey(this._serverKey))
    return serverStatus === GAME_SERVER_STATUS_PENDING_SHUTDOWN
  }

  setPendingShutdown = async (): Promise<'OK'> => {
    // paused or pending-shutdown game server instances will not be available
    // to host new matches
    await this._redis.zrem(GAME_SERVER_RANKING, this._serverKey)

    return await this._redis.setex(
      statusServerKey(this._serverKey),
      HEALTH_CHECK_EXPIRY_SECONDS,
      GAME_SERVER_STATUS_PENDING_SHUTDOWN
    )
  }

  setRunning = async (): Promise<'OK'> => {
    return await this._redis.setex(
      statusServerKey(this._serverKey),
      HEALTH_CHECK_EXPIRY_SECONDS,
      GAME_SERVER_STATUS_RUNNING
    )
  }
}

/*
  To be used in match thread worker
*/
export class MatchRegistryService extends RegistryService {
  matchHealthCheckIntervals: Map<number, NodeJS.Timeout>

  readonly MATCH_PLAYER_REDIS_PREFIX: string = 'match_in_progress'

  constructor(config: Config) {
    super(config)

    this.matchHealthCheckIntervals = new Map()

    if (isMainThread) {
      throw Error('Match Registry running on wrong thread')
    }
  }

  registerMatch(
    p1address: string,
    p2address: string,
    matchID: number,
    replayID: string,
    mode: GameMode
  ) {
    // register match from initialized match thread, ready to play..
    // + health checks as long as match thread is alive

    const healthCheck = () => {
      const playerIDs = [p1address, p2address]

      logger.debug('MATCH HEALTH CHECK', { matchID, p1address, p2address })

      const info: RegistryMatchInfo = {
        id: matchID,
        replayID: replayID,
        mode,
        playerIDs,
        serverLocationKey: this._serverKey,
        version: this.serverReleaseVersionHash,
        initialized: true
      }

      playerIDs.forEach(playerAddress => {
        this._redis.setex(
          matchInProgressKey(playerAddress),
          HEALTH_CHECK_EXPIRY_SECONDS,
          JSON.stringify(info)
        )
      })
    }

    healthCheck()

    // update health checks every X seconds
    const healthCheckInterval = global.setInterval(
      healthCheck,
      HEALTH_CHECK_UPDATE_INTERVAL_SECONDS * 1000
    )

    this.matchHealthCheckIntervals.set(matchID, healthCheckInterval)
    return healthCheck
  }

  markMatchPendingRewards(p1address: string, p2address: string) {
    logger.debug('MARKING MATCH PENDING REWARDS', {
      rewards_p1: matchPendingRewardsKey(p1address),
      rewards_p2: matchPendingRewardsKey(p2address)
    })
    ;[p1address, p2address].forEach(p => {
      this._redis.setex(
        matchPendingRewardsKey(p),
        this._config.settings.recordMatchEndTimeoutMs / 1000,
        'pending...'
      )
    })
  }

  async endMatch(matchID: number, p1address: string, p2address: string) {
    const healthCheck = this.matchHealthCheckIntervals.get(matchID)
    if (healthCheck) {
      clearInterval(healthCheck)
    }

    logger.debug('DELETING MATCH REFERENCE KEYS', {
      inprogress_p1: matchInProgressKey(p1address),
      inprogress_p2: matchInProgressKey(p2address),
      abandon_p1: playerDisconnectedAbandonStatusKey(p1address),
      abandon_p2: playerDisconnectedAbandonStatusKey(p2address),
      abandon_assets_p1: loadingAssetsStatusKey(p1address),
      abandon_assets_p2: loadingAssetsStatusKey(p2address),
      rewards_p1: matchPendingRewardsKey(p1address),
      rewards_p2: matchPendingRewardsKey(p2address)
    })

    await this._redis
      .unlink(
        matchInProgressKey(p1address),
        matchInProgressKey(p2address),
        playerDisconnectedAbandonStatusKey(p1address),
        playerDisconnectedAbandonStatusKey(p2address),
        loadingAssetsStatusKey(p1address),
        loadingAssetsStatusKey(p2address),
        matchPendingRewardsKey(p1address),
        matchPendingRewardsKey(p2address)
      )
      .catch(err => {
        logger.error('END MATCH REDIS ERROR', err)
      })
  }

  saveRecentMatch(recentMatch: StoredRecentMatchInfo) {
    return this._redis.setex(
      recentMatchKey(recentMatch.playerID),
      RECENT_MATCH_EXPIRY_SECONDS,
      JSON.stringify(recentMatch)
    )
  }

  async recordAbandon(playerID: string): Promise<void> {
    const key = matchAbandonCountKey(playerID, this.serverReleaseVersionHash)
    const exist = await this._redis.exists(key)

    const abandonCount = await this._redis.incr(key)

    if (!exist) {
      await this._redis.expire(
        key,
        this._config.settings.AbandonPenaltyWindowSeconds
      )
    }

    const penaltyMap = this._config.settings.AbandonPenalty

    const penaltySeconds =
      penaltyMap[Math.min(abandonCount, penaltyMap.length) - 1]

    const coolDownkey = matchAbandonCooldownKey(
      playerID,
      this.serverReleaseVersionHash
    )

    await this._redis.setex(coolDownkey, penaltySeconds, 0)
  }
}
