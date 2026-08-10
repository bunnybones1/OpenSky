import { program } from 'commander'
import * as fs from 'fs'
import * as _ from 'lodash'
import * as path from 'path'
import * as util from 'util'

// default settings
export const configSchema = {
  server: {
    host: 'localhost',
    port: 8000,
    jwtSecret: '',
    accountMnemonic: ''
  },
  logging: {
    service: 'game-server',
    level: 'info',
    json: false,
    concise: true,
    metricsSink: ''
  },
  redis: {
    host: 'localhost',
    port: 6379
  },
  ethereum: {
    authChainUrl: ''
  },
  services: {
    openskyAPI: {
      uri: '',
      authToken: '',
      userAuthentication: {
        jwtSecret: ''
      }
    }
  },
  settings: {
    worker: {
      maxThreadCount: 100,
      minThreadPoolSize: 8,
      maxMatchesPerThread: 5,
      threadInactiveTimeoutMs: 60000,
      threadRestartInterval: 10
    },
    abandonTimeout: 180000,
    turnExpiryEnabled: true,
    turnExtendable: true,
    turnExpiry: 60000,
    turnExtension: 5000,
    commitRevealExpiry: 2000,
    matchRecords: {
      enabled: false,
      bufferSize: 100
    },
    AbandonPenaltyWindowSeconds: 86400,
    AbandonInactiveTurnMax: 0,
    EarlyConcedeTurnMin: 0,
    AbandonPenalty: [0, 0, 0, 0],
    cheats: false,
    chat: false,
    recordMatchEndTimeoutMs: 10000
  }
}

let globalConfig: Config | null = null

export type WorkerSettings = typeof configSchema.settings.worker
export type Settings = typeof configSchema.settings
export type Config = typeof configSchema

export const UNIT_TEST_ENV = process.env.NODE_ENV === 'test'

export const UNIT_TEST_CONFIG_FILE = './config/game-server.local.json'

export const loadConfig = async (): Promise<Config> => {
  let configFile = ''

  if (UNIT_TEST_ENV) {
    configFile = UNIT_TEST_CONFIG_FILE
  } else {
    program
      .option('-c, --config <path>', 'game-server.json location')
      .parse(process.argv)

    if (!program.opts().config || program.opts().config.length === 0) {
      console.log('Whoops! you must pass `--config <path>` flag')
      process.exit(1)
    }
    configFile = program.opts().config
  }

  const readFile = util.promisify(fs.readFile)

  // merge env settings with defaults
  const config = _.merge(
    {},
    configSchema,
    JSON.parse(await readFile(path.resolve(configFile), 'utf8')) as Config
  )

  globalConfig = config
  return config
}

export const fetchConfig = async (): Promise<Config> => {
  if (globalConfig === null) {
    const config = await loadConfig()
    return config
  } else {
    return globalConfig
  }
}

export const getConfig = (): Config | null => globalConfig
