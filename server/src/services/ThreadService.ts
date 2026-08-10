import {
  MatchmakerStartMatchMessage,
  MatchSettings
} from '@opensky/shared/matchmaker-message-types'
import * as path from 'path'
import { Worker, WorkerOptions } from 'worker_threads'

import { ApiClient } from '../ApiClient'
import { MatchProxy } from '../core/MatchProxy'
import { matchbook } from '../Server'
import { Config, getConfig, WorkerSettings } from '../utils/config'
import { logger } from '../utils/logger'
import {
  MatchCreationMessage,
  MatchThreadInactiveMessage,
  MatchThreadRestartRequestMessage,
  PlayerInformation
} from '../worker/match/TransportModels'

export interface WorkerData {
  config: Config
  autoScale: boolean
}

export enum ThreadStatus {
  AVAILABLE = 'AVAILABLE',
  PENDING_TERMINATION = 'PENDING_TERMINATION',
  TERMINATING = 'TERMINATING'
  // ERRORED
}

export class ThreadService {
  workers: MatchWorker[] = []
  creationRequestQueue: MatchmakerStartMatchMessage[] = []
  private config: Config
  apiClient: ApiClient

  constructor() {
    const config = getConfig()
    if (!config) {
      throw new Error('No global config.')
    }
    this.config = config
    this.apiClient = new ApiClient(config.services.openskyAPI)
    this.initializeThreadPool()
  }

  get workerSettings(): WorkerSettings {
    return this.config.settings.worker
  }

  get minThreadPoolSize(): number {
    return this.workerSettings.minThreadPoolSize
  }

  get maxMatchesPerThread(): number {
    return this.workerSettings.maxMatchesPerThread
  }

  get maxThreadCount(): number {
    return this.workerSettings.maxThreadCount
  }

  initializeMatch = ({
    matchID,
    replayID,
    player1,
    player2,
    matchSettings
  }: MatchmakerStartMatchMessage) => {
    logger.info('PROCESSING MATCH CREATION REQUEST', {
      matchID: matchID,
      replayID: replayID,
      player1: {
        name: player1.account.name,
        address: player1.account.address,
        botSubkey: player1.botSubkey
      },
      player2: {
        name: player2.account.name,
        address: player2.account.address,
        botSubkey: player2.botSubkey
      }
    })

    const matchProxy = new MatchProxy(
      matchID,
      replayID,
      player1,
      player2,
      matchSettings,
      this
    )

    matchbook.addMatch(matchProxy)
  }

  initializeThreadPool() {
    logger.info(`INIT THREAD POOL`, this.workerSettings)
    for (let i = 0; i < this.minThreadPoolSize; ++i) {
      this.createMatchWorker()
    }
  }

  createMatchOnWorker(
    matchID: number,
    replayID: string,
    p1: PlayerInformation,
    p2: PlayerInformation,
    matchSettings: MatchSettings
  ): MatchWorker {
    // choose worker based on # of current matches hosting..
    let worker = this.workers.find(
      w =>
        w.load < this.maxMatchesPerThread && w.status === ThreadStatus.AVAILABLE
    )

    if (!worker) {
      // all current workers are busy
      if (this.workers.length === this.maxThreadCount) {
        // we've reached maximum number of thread allowed, do not create more
        logger.warn('MAXIMUM WORKER CAPACITY REACHED', {
          threadCount: this.workers.length,
          matchCount: matchbook.matches.size
        })

        throw new Error('MAXIMUM WORKER CAPACITY REACHED')
      }
      // spawn a new match worker
      worker = this.createMatchWorker(true)
    }

    // create match on worker
    worker.createMatch(matchID, replayID, p1, p2, matchSettings, this.config)

    return worker
  }

  // autoScale = true workers will be terminated after inactivity
  private createMatchWorker = (autoScale?: boolean): MatchWorker => {
    const worker = spawnWorker({
      config: this.config,
      autoScale: Boolean(autoScale)
    })

    this.workers.push(worker)

    worker.on('online', () => {
      logger.info('MATCH THREAD WORKER ONLINE', worker.resourceLimits!)
    })

    worker.on('exit', code => {
      logger.info('ThreadService (exit):', { workerID: worker.id, code })
    })
    worker.on('error', (err: Error) => {
      // worker error handling from main thread
      logger.info('ThreadService (error):', err, { workerID: worker.id })
    })

    worker.on(
      'message',
      (
        message: MatchThreadInactiveMessage | MatchThreadRestartRequestMessage
      ) => {
        if (message.type === 'thread_inactive') {
          logger.info(`WORKER IS INACTIVE, TERMINATING`, {
            workerID: worker.id
          })

          worker.status = ThreadStatus.TERMINATING
          // remove worker reference
          this.workers = this.workers.filter(w => w !== worker)
          worker.terminate()
          worker.removeAllListeners()

          // total number of active threads is below minimum
          if (this.workers.length < this.minThreadPoolSize) {
            this.createMatchWorker()
          }
        }

        if (message.type === 'thread_restart_request') {
          worker.status = ThreadStatus.PENDING_TERMINATION
        }
      }
    )

    return worker
  }
}

export class MatchWorker extends Worker {
  status: ThreadStatus = ThreadStatus.AVAILABLE
  completedMatches = 0
  private matches: Set<number>

  constructor(filename: string, options?: WorkerOptions) {
    super(filename, options)
    this.matches = new Set()
  }

  get id(): number {
    return this.threadId
  }

  get load() {
    return this.matches.size
  }

  removeMatch(matchID: number) {
    this.matches.delete(matchID)
    this.completedMatches++
  }

  createMatch(
    matchID: number,
    replayID: string,
    p1: PlayerInformation,
    p2: PlayerInformation,
    matchSettings: MatchSettings,
    config: Config
  ) {
    const matchCreate: MatchCreationMessage = {
      type: 'match_create',
      matchData: {
        matchID: matchID,
        replayID: replayID,
        startTime: new Date().toISOString(),
        config,
        player1Info: p1,
        player2Info: p2,
        matchSettings
      }
    }

    this.postMessage(matchCreate)
    this.addMatch(matchID)
  }

  private addMatch(matchID: number) {
    this.matches.add(matchID)
  }
}

const spawnWorker = (data: WorkerData): MatchWorker => {
  // why: use ts worker file in local dev environment on nodemon
  // pro: hot-reload on change + no build step/js files + no webpack..
  // con: slower when spawning thread
  if (
    ['development', 'test'].includes(
      process.env.NODE_ENV || 'fake_env_lalala_fake_string'
    )
  ) {
    const workerPath = (filePath: string): string =>
      path.resolve(process.cwd(), filePath)

    return new MatchWorker(workerPath('src/worker/wrapper.worker.js'), {
      workerData: {
        path: workerPath('src/worker/match.worker.ts'),
        data
      }
    })
  } else {
    // use js worker file in dist mode for higher performance
    return new MatchWorker(path.resolve(__dirname, './worker/index.js'), {
      workerData: {
        data
      }
    })
  }
}
