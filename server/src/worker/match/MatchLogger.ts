import { MatchLog } from '@opensky/shared/matchLog'
import { delayPromise } from '@opensky/shared/utils/async'

import { logger } from '../../utils/logger'
import { apiClient, config } from '../match.worker'
import { Match } from './Match'
import { toHex } from './utils'

export class MatchLogger {
  logBuffer: MatchLog[] = []
  logIndex = 0
  logEnabled: boolean = config.settings.matchRecords.enabled
  uri: string | null = null

  private _potentialLogBuffer: MatchLog[] = []
  private _match: Match
  private _internalAppendCount = 0
  private _committingAllPotential = false

  constructor(match: Match) {
    this._match = match
  }

  appendPotential(message: MatchLog) {
    if (!this.logEnabled) {
      return
    }
    this._potentialLogBuffer.push(message)
  }
  async commitAllPotential() {
    if (this._committingAllPotential) {
      return
    }
    this._committingAllPotential = true
    const logs = [...this._potentialLogBuffer]
    this._potentialLogBuffer = []
    for (const log of logs) {
      if ('timestamp' in log) {
        await this._internalAppend({ ...log, timestamp: new Date() })
      } else {
        await this._internalAppend(log)
      }
    }
    this._committingAllPotential = false
  }
  revertAllPotential() {
    this._potentialLogBuffer = []
  }

  private async _internalAppend(
    message: MatchLog,
    urgent?: boolean
  ): Promise<void> {
    if (!this.logEnabled) {
      return
    }

    this.logBuffer.push(message)

    // urgent records will send log report regardless of current buffer size
    if (
      !urgent &&
      this.logBuffer.length < config.settings.matchRecords.bufferSize
    ) {
      return
    }

    this._internalAppendCount++
    // copy current log buffer to stack
    const logs = [...this.logBuffer]
    this.logBuffer = []
    const currentIndex = this.logIndex
    this.logIndex++

    const result = await apiClient.appendMatchRecord(
      this._match.id,
      currentIndex,
      JSON.stringify(logs, toHex)
    )
    logger.debug('api.appendMatchRecord', { result })

    if (!result || !result.status) {
      // append records API failed or returned a false status
      // disable match log for this match
      this.logEnabled = false
      logger.error('MATCH LOGGING DISABLED', { matchID: this._match.id })
      return
    }

    this.uri = result.uri
    this._internalAppendCount--
  }
  append = async (message: MatchLog, urgent?: boolean): Promise<void> => {
    if (!this.logEnabled) {
      return
    }

    if (!urgent && message.type === 'gameplay') {
      this.appendPotential(message)
      return
    }
    this._internalAppend(message, urgent)
  }

  close = async () => {
    if (!this.logEnabled) {
      return
    }

    await this.commitAllPotential()
    while (this._internalAppendCount > 0) {
      await delayPromise(100)
    }

    if (this.logBuffer.length) {
      await apiClient.appendMatchRecord(
        this._match.id,
        this.logIndex,
        JSON.stringify(this.logBuffer, toHex)
      )
      logger.debug('LOG FINISHED')
    }
  }

  perf = <T extends (...args: any[]) => any>(
    fn: T,
    ...args: Parameters<T>
  ): ReturnType<T> => {
    const start = process.hrtime()
    const result = fn.bind(this._match.store)(...args)
    const end = process.hrtime(start)

    const timespan = `${(end[0] * 1000000000 + end[1]) / 1000000}ms`

    this.append({
      type: 'time',
      method: fn.name,
      timespan
    })

    logger.debug(`(perf) fn:${fn.name} - ${timespan}`)

    return result
  }
}
