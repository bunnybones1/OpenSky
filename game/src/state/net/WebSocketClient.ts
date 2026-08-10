import { WEBSOCKET_FORCED_CLOSE_CODE } from '@opensky/shared/constants'
import {
  GameServerPublicMessage,
  JoinServerMessage,
  SpectateServerMessage,
  SubkeyCertification,
  TimeSyncMessage
} from '@opensky/shared/game-server-message-types'

export type Message = GameServerPublicMessage

// time in between timer syncs
const TIMESYNC_INTERVAL = 120000

// time in between ping keepalive messages
const KEEPALIVE_INTERVAL = 5000

// starting acceptable ping latency is
// DEFAULT_RESPONSE_TIME + KEEPALIVE_GRACE_PERIOD
const DEFAULT_RESPONSE_TIME = 5000

// extra response time buffer in addition to ping latency
const KEEPALIVE_GRACE_PERIOD = 1000

const SHOULD_LOG_WEBSOCKETS = false

export enum ConnectionStatus {
  CLOSED,
  OPEN,
  RECONNECTING
}

export class WebSocketClient {
  conn: WebSocket
  queue: Message[]
  numReconnectAttempts: number
  timeOffsetMillis: number = 0
  shouldReconnect: boolean = true
  initLoadingProgress: number = 0

  private _status: ConnectionStatus = ConnectionStatus.RECONNECTING
  private _timeSyncBuffer: [number, number, number, number, number] = [
    0, 0, 0, 0, 0
  ]

  private _latencyBuffer: [number, number, number, number, number]
  private _latencyAdjustedResponseTime: number
  private _ping: number

  private _keepaliveInterval: NodeJS.Timeout // Interval timer ID
  private _timeSyncInterval: NodeJS.Timeout // Interval timer ID
  private _keepaliveFailTimeout: NodeJS.Timeout
  private _keepaliveID: string
  private _pingDepartureTimestamp: number
  private _openedTimeout: NodeJS.Timeout

  constructor(
    public onMessageCallback: ((m: Message) => void) | undefined,
    public onStatusChange: (newStatus: ConnectionStatus) => void | undefined,
    public subkeyCertification: SubkeyCertification
  ) {
    this.queue = []
    this.numReconnectAttempts = 0
    this.resetLatency()
  }

  connectGameServer(
    webSocketAddress: string,
    authToken: string | null,
    spectateCode?: string
  ) {
    this.connect(webSocketAddress, authToken, spectateCode)
  }

  close(
    connection: WebSocket & {
      onclose?: null | ((_ev: CloseEvent | undefined) => void)
    }
  ) {
    connection.onclose?.call(connection, undefined)
    connection.onclose = null
    connection.close()
  }

  get status() {
    return this._status
  }

  set status(status: ConnectionStatus) {
    this._status = status

    if (this.onStatusChange) {
      this.onStatusChange(this.status)
    }
  }

  joinServerMessage(authToken: string): JoinServerMessage {
    return {
      type: 'join_server',
      authToken,
      loadingProgress: this.initLoadingProgress,
      subkeyCertification: this.subkeyCertification
    }
  }

  spectateMessage(
    authToken: string | null,
    spectateToken: string
  ): SpectateServerMessage {
    return {
      type: 'spectate_server',
      authToken,
      spectateToken
    }
  }

  manualDisconnect() {
    this.shouldReconnect = false
    this.conn.close()
    this.status = ConnectionStatus.CLOSED
  }

  onMessage = (ev: MessageEvent) => {
    if (typeof ev.data !== 'string') {
      return
    }

    // PONG message
    if (ev.data.toString().startsWith('PONG')) {
      const split = ev.data.toString().split(':')
      if (split.length >= 2) {
        if (split[1] === this._keepaliveID) {
          const roundTripLatency = Date.now() - this._pingDepartureTimestamp

          // response time converges as _latencyBuffer gets filled
          this._latencyBuffer.shift()
          this._latencyBuffer.push(roundTripLatency)

          // average is taken for the next ping/pong response interval
          const avgLatency =
            this._latencyBuffer.reduce((sum, x) => x + sum) /
            this._latencyBuffer.length
          this._ping = avgLatency

          this._latencyAdjustedResponseTime =
            KEEPALIVE_GRACE_PERIOD + avgLatency

          if (SHOULD_LOG_WEBSOCKETS) {
            console.log(
              'Latency adjusted response time:',
              this._latencyAdjustedResponseTime
            )
          }
          clearTimeout(this._keepaliveFailTimeout)
        }
      }
      return
    }

    // do this early so we get the closest timestamp possible
    const now = Date.now()
    const data = JSON.parse(ev.data)

    if (typeof data !== 'object' || !('type' in data)) {
      return
    }

    // Timesync message
    if (data.type === 'timesync') {
      const msg: TimeSyncMessage = data

      const reqOffset = msg.serverTime - msg.clientTime
      const oneWayTripTime = (now - msg.clientTime) / 2

      const offset = reqOffset - oneWayTripTime
      this._timeSyncBuffer.shift()
      this._timeSyncBuffer.push(offset)
      this.timeOffsetMillis =
        this._timeSyncBuffer.reduce((sum, x) => x + sum) /
        this._timeSyncBuffer.length
      if (SHOULD_LOG_WEBSOCKETS) {
        console.log('Synchronized time: ', this.timeOffsetMillis)
      }
    }
    if (data.type === 'reconnect' || data.type === 'reconnect_spectator') {
      clearTimeout(this._openedTimeout) // we connected, all is good in the world
    }

    // All other messages.
    // Dispatch received message from ws to store
    if (this.onMessageCallback) {
      this.onMessageCallback(data as Message)
    }
  }

  send(msg: Message) {
    // TODO: this is shit.. it should be checking if CONNECTING..
    // we should not queue stuff if we're CLOSED
    if (this.status !== ConnectionStatus.OPEN) {
      this.queue.push(msg)
      console.log('WSCLIENT: queueing', JSON.stringify(msg))
      return
    }

    if (SHOULD_LOG_WEBSOCKETS) {
      console.log('WSCLIENT: sending', JSON.stringify(msg))
    }
    this.conn.send(JSON.stringify(msg))
  }

  dequeue() {
    const queue = [...this.queue]
    this.queue = []
    queue.forEach(msg => {
      if (SHOULD_LOG_WEBSOCKETS) {
        console.log('WSCLIENT: sending queued', JSON.stringify(msg))
      }
      this.send(msg)
    })
  }

  syncTime = () => {
    for (let i = 0; i < 5; i++) {
      const msg: TimeSyncMessage = {
        type: 'timesync',
        clientTime: Date.now(),
        serverTime: 0
      }
      this.conn.send(JSON.stringify(msg))
    }
  }

  get ping() {
    return this._ping
  }

  private resetLatency() {
    this._latencyBuffer = [
      DEFAULT_RESPONSE_TIME,
      DEFAULT_RESPONSE_TIME,
      DEFAULT_RESPONSE_TIME,
      DEFAULT_RESPONSE_TIME,
      DEFAULT_RESPONSE_TIME
    ]

    this._latencyAdjustedResponseTime =
      DEFAULT_RESPONSE_TIME + KEEPALIVE_GRACE_PERIOD
  }

  private connect(
    url: string,
    authToken: string | null,
    spectateCode?: string
  ) {
    if (SHOULD_LOG_WEBSOCKETS) {
      console.log('Attempting connection to ', url)
    }
    const thisConn = new WebSocket(url)
    this.conn = thisConn

    if (this._openedTimeout) {
      clearTimeout(this._openedTimeout)
    }

    const ONOPEN_TIMEOUT = 8000

    this._openedTimeout = setTimeout(() => {
      // if this fires, we've been waiting for the onopen event for way too long. try again.
      console.warn(
        `Websocket Server didn't get 'reconnect' event for ${ONOPEN_TIMEOUT}ms, forcing reconnect.`
      )
      this.close(thisConn)
    }, ONOPEN_TIMEOUT)

    thisConn.onopen = (_ev: Event) => {
      if (this.conn !== thisConn) {
        console.warn('Old websocket client opened!!', _ev)
        this.close(thisConn)
        return
      }
      this.shouldReconnect = true

      this.syncTime()

      this._timeSyncInterval = setInterval(this.syncTime, TIMESYNC_INTERVAL)

      console.log('WebSocketClient, connection opened with', url)

      this.numReconnectAttempts = 0
      if (this.status === ConnectionStatus.RECONNECTING) {
        if (spectateCode) {
          this.send(this.spectateMessage(authToken, spectateCode))
        } else {
          this.send(this.joinServerMessage(authToken!))
        }
      }
      this.status = ConnectionStatus.OPEN

      this.dequeue()

      this._keepaliveInterval = setInterval(() => {
        clearTimeout(this._keepaliveFailTimeout)
        this._keepaliveID = `${Math.round(Math.random() * 1000)}`
        thisConn.send('PING:' + this._keepaliveID)
        this._pingDepartureTimestamp = Date.now()
        this._keepaliveFailTimeout = setTimeout(() => {
          console.warn(
            `Keepalive ping with timeout ${this._latencyAdjustedResponseTime}ms timed out, reconnecting ...`
          )
          this.resetLatency()
          this.close(thisConn)
        }, this._latencyAdjustedResponseTime)
      }, KEEPALIVE_INTERVAL)
    }

    // how can i best simulate this..?
    // serve game server on 8001
    // ncat -l localhost 8000 --sh-exec "ncat localhost 8001"
    // kill ncat process to simulate ws connection loss

    thisConn.onclose = (_ev: CloseEvent | undefined) => {
      if (this.status === ConnectionStatus.CLOSED) {
        console.warn('WS Connection closed when it was already closed.')
        return
      }
      if (this.conn !== thisConn) {
        console.warn('Old websocket client closed!!', _ev)
        return
      }
      // TODO: log to sentry the onclose event, and note reconnect time..
      console.log('WebSocketClient, received connection closed event.', _ev)
      this.status = ConnectionStatus.CLOSED

      clearInterval(this._keepaliveInterval)
      clearInterval(this._timeSyncInterval)
      clearTimeout(this._keepaliveFailTimeout)

      if (
        this.shouldReconnect &&
        (!_ev || _ev.code !== WEBSOCKET_FORCED_CLOSE_CODE)
      ) {
        this.status = ConnectionStatus.RECONNECTING

        // TODO: after X number of attempts, stop trying and dispatch netConnectionLost()
        this.numReconnectAttempts++
        console.error(
          { bypassErrorDialog: true },
          'WebSocketClient, reconnecting...attempt #',
          this.numReconnectAttempts
        )
        this.connect(url, authToken, spectateCode)
      } else {
        console.log(
          `WebSocketClient: Not reconnecting. shouldReconnect: ${
            this.shouldReconnect
          }, close code ${_ev && _ev.code}`
        )
      }
    }

    thisConn.onerror = (_ev: ErrorEvent) => {
      // TODO: log to sentry the onerror event

      // Right now we just log this, the spec says onclose will be called after onerror,
      // which is where we can handle reconnection logic. Let's confirm this is true in practice.
      console.log('WebSocketClient, received connection error event.', _ev)
    }

    thisConn.onmessage = ev => {
      if (this.conn !== thisConn) {
        console.warn('Old websocket client got message!!', ev)
        this.close(thisConn)
        return
      }
      this.onMessage(ev)
    }
  }
}
