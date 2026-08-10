/* eslint-disable no-console */

import {
  FindMatchMessage,
  MatchmakerMessage
} from '@opensky/shared/matchmaker-message-types'

const KEEPALIVE_INTERVAL = 3000
const MAX_RETRY = 10

export enum ConnectionStatus {
  CLOSED,
  OPEN,
  RECONNECTING
}

export class WebSocketClient {
  conn: WebSocket
  status: ConnectionStatus
  queue: MatchmakerMessage[]
  numReconnectAttempts: number
  timeOffsetMillis: number = 0

  shouldReconnect: boolean = true

  reconnectMessage: FindMatchMessage

  private keepaliveInterval: any // Interval timer ID
  private reconnectInterval: any // reconnect timer ID

  constructor(
    public url: string,
    public onMessage: (ev: MessageEvent) => void,
    public onFailed: (e: any) => void
  ) {
    this.status = ConnectionStatus.CLOSED
    this.queue = []
    this.numReconnectAttempts = 0
  }

  manual_disconnect(code = 1000) {
    if (!!this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
    }
    this.shouldReconnect = false
    this.conn?.close(code)
    this.status = ConnectionStatus.CLOSED
  }

  connect(): Promise<boolean> {
    this.shouldReconnect = true

    return new Promise<boolean>((resolve, reject) => {
      if (this.numReconnectAttempts > MAX_RETRY) {
        console.error('connection retry failed')
        this.manual_disconnect()
        this.onFailed('max connect retry exceeded')
        reject(new Error('Could not connect'))
      }

      this.conn = new WebSocket(this.url)

      this.conn.onopen = () => {
        console.log('WebSocketClient, connection opened with', this.url)

        this.numReconnectAttempts = 0

        if (this.status === ConnectionStatus.RECONNECTING) {
          this.send(this.reconnectMessage)
        }

        this.status = ConnectionStatus.OPEN

        this.dequeue()

        this.keepaliveInterval = setInterval(() => {
          this.conn.send('PING')
        }, KEEPALIVE_INTERVAL)

        resolve(true)
      }

      this.conn.onclose = (_ev: CloseEvent) => {
        // TODO: log to sentry the onclose event, and note reconnect time..
        console.log('WebSocketClient, received connection closed event.', _ev)
        this.status = ConnectionStatus.CLOSED
        this.conn.close()

        clearInterval(this.keepaliveInterval)

        if (this.shouldReconnect) {
          this.status = ConnectionStatus.RECONNECTING

          this.reconnectInterval = setTimeout(() => {
            console.log('WebSocketClient, reconnecting...')
            this.numReconnectAttempts += 1
            this.connect()
          }, 1000)
        }
      }

      this.conn.onerror = (_ev: ErrorEvent) => {
        // ws server is not reachable at all
        if (this.status === ConnectionStatus.CLOSED) {
          this.shouldReconnect = false
          reject(new Error('Could not collected'))
        }

        console.log('WebSocketClient, received connection error event.', _ev)
      }

      this.conn.onmessage = this.onMessage
    })
  }

  close() {
    this.conn.close()
  }

  on(eventType: string, handler: (ev: Event) => void) {
    this.conn.addEventListener(eventType, handler)
  }

  send(msg: MatchmakerMessage) {
    if (this.conn.readyState !== ConnectionStatus.OPEN) {
      this.queue.push(msg)
      console.log('WSCLIENT: queueing', msg)
      return
    }

    console.log('WSCLIENT: sending', msg)
    this.conn.send(JSON.stringify(msg))
  }

  dequeue() {
    const queue = [...this.queue]
    this.queue = []
    queue.forEach((msg) => {
      console.log('WSCLIENT: sending queued', msg)
      this.send(msg)
    })
  }
}
