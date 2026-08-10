import load from './load'
import { MessageFromWorker, MessageToWorker } from './StateSharedTypes'
import { WorkerOrFakeWorker } from './workerAbstraction'

type FakeWorkerListener = (ev: MessageEvent) => void

class FakeWorkerConn<To, From> implements WorkerOrFakeWorker {
  listeners: Set<FakeWorkerListener> = new Set()
  connection: FakeWorkerConn<From, To>

  connect(connection: FakeWorkerConn<From, To>) {
    this.connection = connection
  }

  addEventListener(_: string, listener: FakeWorkerListener) {
    this.listeners.add(listener)
  }

  removeEventListener(_: string, listener: FakeWorkerListener) {
    this.listeners.delete(listener)
  }

  receiveMessage(message: From) {
    const ev = {
      type: 'message',
      data: message
    } as any as MessageEvent
    this.listeners.forEach(listener => listener(ev))
  }

  /// A lot of Worker code depends on postMessage returning control instead of executing other code,
  /// so we don't run it right away.
  postMessage(message: To) {
    if (this.connection) {
      setTimeout(() => {
        this.connection.receiveMessage(message)
      }, 1)
    }
  }
}

export default class FakeWorker extends FakeWorkerConn<
  MessageToWorker,
  MessageFromWorker
> {
  constructor() {
    super()
    const worker = new FakeWorkerConn<MessageFromWorker, MessageToWorker>()
    worker.connect(this)
    this.connect(worker)

    load(worker)
    console.warn('Workerless mode.')
  }
}
