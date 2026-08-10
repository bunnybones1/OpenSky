import { createLogger, Logger } from '@horizongames/node-logger'

import { Config } from './config'

let logger: Logger = null as unknown as Logger // please god don't explode, this has worked so far.

export const configureLogger = (config: Config): Logger => {
  logger = createLogger({
    service: config.logging.service,
    level: config.logging.level,
    json: config.logging.json,
    concise: config.logging.concise,
    tags: {
      version: process.env.GITCOMMIT || 'dev'
    }
  })
  return logger
}

process.on('uncaughtException', error => {
  logger
    ? logger.warn('process.uncaughtException', {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error
      })
    : console.log('process.uncaughtException', { error })
})

process.on('unhandledRejection', (reason, _) => {
  const error = {} as any
  if ((reason as any).stack) {
    error.stack = (reason as any).stack
  } else {
    error.reason = reason
  }

  logger
    ? logger.warn('process.unhandledRejection', { error })
    : console.log('process.unhandledRejection', { error })
})

export { logger }
