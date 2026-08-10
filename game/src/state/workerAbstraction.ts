type WorkerListener = (ev: MessageEvent) => void

export interface WorkerOrFakeWorker {
  addEventListener(event: string, listener: WorkerListener): void
  removeEventListener(event: string, listener: WorkerListener): void
  postMessage(message: any): void
}
