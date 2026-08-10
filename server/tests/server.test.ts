import 'jest'
import { Server } from '../src/Server'
import { loadConfig, Config } from '../src/utils/config'
import { configureLogger } from '../src/utils/logger'

let server: Server
let config: Config
let url: string

beforeAll(done => {
  (async () => {
    config = await loadConfig()

    url = `http://localhost:${config.server.port}`

    configureLogger(config)

    server = new Server(config)

    await server.listen()

    done()
  })()
})

describe('server startup', () => {
  test('endpoint can ping', async () => {
    console.log('node version?', process.version)
    const response = await fetch(`${url}/ping`)

    const text = await response.text()

    expect(text).toBe('pong')
  })

  test('worker threads in thread pool initialized', () => {
    expect(server.threadService.workers.length).toBe(
      config.settings.worker.minThreadPoolSize
    )
  })
})

afterAll((done) => {
  done()
})
