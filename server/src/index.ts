import { Server } from './Server'
import { loadConfig, UNIT_TEST_ENV } from './utils/config'
import { configureLogger } from './utils/logger'

const main = async () => {
  // Load config file
  const config = await loadConfig()

  // Setup logging and tracing
  const logger = configureLogger(config)

  // Ensure node version is v18 and fetch is available
  if (process.version < 'v18') {
    logger.critical(
      `ERROR! expecting node v18+ but your node version is reporting ${process.version}`
    )
    return
  }
  if (global.fetch === undefined) {
    logger.critical(
      `ERROR! fetch is undefined, but should be available with node v18+`
    )
    return
  }

  // Start server
  logger.info('GAME SERVER: STARTING...')
  try {
    await new Server(config).listen()
  } catch (error) {
    logger.critical(`GAME SERVER FAILED TO START`, error)
  }
  logger.info('GAME SERVER: STARTED.')
}

if (!UNIT_TEST_ENV) {
  main()
}
