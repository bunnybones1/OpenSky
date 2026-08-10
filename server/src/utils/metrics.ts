import * as client from 'prom-client'

const metrics = {
  IN_PROGRESS_MATCHES_COUNT: {
    name: 'gameserver_in_progress_matches',
    help: 'current number of in progress matches'
  },
  COMPLETED_MATCHES_COUNT: {
    name: 'gameserver_completed_matches',
    help: 'number of completed matches since start'
  }
}

// prometheus telemetry service
class TelemetryService {
  registry: client.Registry
  inProgressMatchesCount: client.Gauge<string>
  completedMatchesCount: client.Gauge<string>

  constructor(defaultLabel: string) {
    this.registry = new client.Registry()

    this.registry.setDefaultLabels({
      app: defaultLabel
    })

    client.collectDefaultMetrics({ register: this.registry })

    this.inProgressMatchesCount = new client.Gauge({
      name: metrics.IN_PROGRESS_MATCHES_COUNT.name,
      help: metrics.IN_PROGRESS_MATCHES_COUNT.help
    })

    this.completedMatchesCount = new client.Gauge({
      name: metrics.COMPLETED_MATCHES_COUNT.name,
      help: metrics.COMPLETED_MATCHES_COUNT.help
    })

    // others

    this.registry.registerMetric(this.inProgressMatchesCount)
    this.registry.registerMetric(this.completedMatchesCount)
  }
}

export const telemetryService = new TelemetryService('gameserver')
