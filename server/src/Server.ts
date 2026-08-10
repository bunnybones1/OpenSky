import {
  getLogEntry,
  requestLogger,
  requestRecoverer
} from '@horizongames/node-logger'
import { gameStateReviver } from '@opensky/shared/gameStateSerializer'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import cors from 'cors'
import express from 'express'
import { expressjwt } from 'express-jwt'
import * as http from 'http'
import { AddressInfo } from 'net'
import nocache from 'nocache'
import * as WebSocket from 'ws'

import { MatchManager } from './core/MatchManager'
import { PlayerContext } from './PlayerContext'
import { MatchbookService } from './services/MatchbookService'
import { GameServerRegistryService } from './services/RegistryService'
import { ThreadService } from './services/ThreadService'
import { Config } from './utils/config'
import { datetimeDebugFormat } from './utils/helpers'
import { logger } from './utils/logger'
import { telemetryService } from './utils/metrics'

export const matchbook = new MatchbookService()

export class Server {
  // HTTP/WS server
  config: Config
  httpServer: http.Server
  wsServer: WebSocket.Server
  registry: GameServerRegistryService
  matchManager: MatchManager
  startedAt: Date

  threadService: ThreadService

  constructor(config: Config) {
    this.config = config

    const app: express.Application = express()
    this.httpServer = http.createServer(app)
    this.wsServer = new WebSocket.Server({
      server: this.httpServer
      // perMessageDeflate: false
    })

    this.registry = new GameServerRegistryService(config)
    this.matchManager = new MatchManager(this.registry)
    this.threadService = new ThreadService()

    this.startedAt = new Date()
    this.setupRoutes(app)

    if (process.env.NODE_ENV !== 'development') {
      // allow graceful server shutdown via process signals
      const mark = () => {
        logger.warn('SERVER PENDING SHUTDOWN', {
          inProgressMatches: matchbook.inProgressMatches
        })
        this.registry.setPendingShutdown()
      }

      process.on('SIGINT', mark)
      process.on('SIGTERM', mark)
    }
  }

  async listen(): Promise<boolean> {
    this.wsServer.on('connection', (conn, req) => this.onClientOpen(conn, req))

    return new Promise<boolean>((resolve, reject) => {
      let listening = false

      this.httpServer.listen(this.registry.serverPort, () => {
        listening = true
        const addressInfo = this.httpServer.address() as AddressInfo
        logger.info(`GAME SERVER LISTENING on port ${addressInfo.port}`, {
          port: addressInfo.port
        })

        this.registry.registerGameServer(() => {
          // check for pending shutdown on health check
          this.safeShutdown()
        })

        resolve(true)
      })

      // Ensure server boots correctly within a short time, or return false
      setTimeout(() => {
        if (!listening) {
          logger.critical('websocket server failed to start')
          this.httpServer.close()
          reject(false)
        }
      }, 1500)
    })
  }

  safeShutdown = async () => {
    const isPendingShutdown = await this.registry.isPendingShutdown()

    if (isPendingShutdown && matchbook.inProgressMatches === 0) {
      const timeout = 2000

      logger.warn(`SERVER SHUTTING DOWN`, { timeout })

      setTimeout(() => {
        process.exit(0)
      }, timeout)
    }
  }

  private setupRoutes(app: express.Application) {
    app.use(requestLogger(logger))
    app.use(nocache())
    app.use(cors())
    app.use(
      express.json({
        reviver: gameStateReviver
      })
    )

    if (this.config.logging.metricsSink !== '') {
      // app.use(requestTracer)
    }

    app.get('/', (_, res: express.Response) => {
      res.send('.')
    })

    app.get('/ping', (_, res: express.Response) => {
      res.send('pong')
    })

    app.get('/status', (_, res: express.Response) => {
      res.send({
        serverInfo: this.registry.serverInfo,
        workers: [
          this.threadService.workers.map(worker => ({
            workerID: worker.id,
            workerStatus: worker.status,
            inProgressMatches: worker.load,
            completedMatches: worker.completedMatches
          }))
        ],
        serverStatus: {
          startedAt: datetimeDebugFormat(this.startedAt),
          cpuUsage: process.cpuUsage(),
          memUsage: process.memoryUsage(),
          resourceUsage: process.resourceUsage()
        },
        totalMatchesHosted: matchbook.matchesHosted,
        connectionSize: this.wsServer.clients.size,
        inProgressMatches: matchbook.inProgressMatches,
        matchInfo: [...matchbook.matches.values()].map(match => ({
          ...match.matchStatusInfo,
          startTime: datetimeDebugFormat(
            new Date(match.matchStatusInfo.startTime)
          ),
          numSpectators: match.spectators.size
        })),
        settings: this.config.settings
      })
    })

    app.post(
      '/createMatch',
      // TODO: add rate limit
      expressjwt({
        secret: this.config.server.jwtSecret,
        algorithms: ['HS256']
      }),
      async (req: express.Request, res: express.Response) => {
        const logEntry = getLogEntry(req)
        logEntry.debug('RECEIVED MATCH CREATION REQUEST FROM MATCHMAKER')

        try {
          const {
            player1,
            player2,
            matchID,
            replayID
          }: MatchmakerStartMatchMessage = req.body

          // Work around go array serialization that returns `null` instead of empty arrays
          for (const player of [player1, player2]) {
            if (player.account.deckEquipment?.stickers === null) {
              player.account.deckEquipment.stickers = []
            }
          }

          logger.info('RECEIVED MATCH CREATION REQUEST FROM MATCHMAKER', {
            matchID: matchID,
            player1ID: player1.account.address,
            player2ID: player2.account.address
          })

          const player1hasMatchInProgress =
            !player1.botSubkey &&
            (await this.registry.getMatchInProgress(player1.account.address))
          const player2hasMatchInProgress =
            !player2.botSubkey &&
            (await this.registry.getMatchInProgress(player2.account.address))

          if (player1hasMatchInProgress || player2hasMatchInProgress) {
            logger.error('DUPLICATE MATCH CREATION', {
              player1ID: player1.account.address,
              player2ID: player2.account.address,
              player1hasMatchInProgress,
              player2hasMatchInProgress
            })
            res.statusMessage = 'PLAYERS HAS EXISTING MATCH IN PROGRESS'
            res.status(500).end()
            return
          }

          /*
            TODO: check if thread capacity is full - backpressure
            TODO: add match creation to message queue
            process on an interval
          */

          // match has an state of initialized = false
          // until match worker thread is ready to receive actions
          this.registry.registerMatch(matchID, replayID, player1.gameMode, [
            player1,
            player2
          ])

          this.threadService.initializeMatch(req.body)

          logEntry.debug(`MATCH CREATED ON SERVER`)

          res.sendStatus(200)
        } catch (error) {
          const msg = 'MATCH CREATION FAILED'
          logEntry.error(msg, error)
          res.statusMessage = msg
          res.status(500).end()
        }
      }
    )

    app.get('/metrics', async (_, res: express.Response) => {
      telemetryService.inProgressMatchesCount.set(matchbook.inProgressMatches)
      telemetryService.completedMatchesCount.set(matchbook.matchesHosted)

      res.setHeader('Content-Type', telemetryService.registry.contentType)
      const metrics = await telemetryService.registry.metrics()
      res.end(metrics)
    })

    // NOTE! requestRecoverer is a middleware to catch exceptions, log them
    // with a stack trace and respond to a client correctly with a 500.
    // BUT, this line must be last defintion for an express app, otherwise
    // the recovery middleware will fail to work -- yep, expressjs sucks.
    app.use(requestRecoverer)
  }

  private onClientOpen(conn: WebSocket.WebSocket, _: http.IncomingMessage) {
    logger.info('NEW WS CONNECTION')

    const ctx: PlayerContext = new PlayerContext(conn)

    conn.on('close', code => this.onClientClose(ctx, code))
    conn.on('message', data => this.onClientMessage(ctx, data))
    conn.on('error', err => this.onClientError(ctx, err))

    // authentication timeout
    // kill connection if unable to authenticate within x seconds
    global.setTimeout(() => {
      if (!ctx.isAuthenticated) {
        logger.warn('UNAUTHENTICATED CONNECTION KILLED')
        conn.close()
      }
    }, 5000)
  }

  private onClientError(_: PlayerContext, error: Error) {
    logger.error('ws client error', error)
  }

  private onClientClose(playerContext: PlayerContext, code: number) {
    playerContext.clearPingInterval()
    this.matchManager.disconnect(playerContext, code)
  }

  private async onClientMessage(
    playerContext: PlayerContext,
    data: WebSocket.Data
  ) {
    const strData = data.toString()
    if (strData.startsWith('PING')) {
      const split = strData.split(':')
      if (split.length < 2) {
        return
      }
      playerContext.ping(split[1])
      return
    }

    let message

    try {
      message = JSON.parse(strData)
    } catch (error) {
      logger.error('WS ERROR PARSING MESSAGE', error, { wsData: { data } })
      return
    }

    this.matchManager.handleMessage(message, playerContext)
  }
}
