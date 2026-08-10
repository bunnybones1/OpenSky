const _x = 1
/*import { Config } from './config'
import ddtracer from 'dd-trace'
import { Tracer, Span } from 'dd-trace'
import { getLogEntry } from '@horizongames/node-logger'

// Datadog tracer object
//
// More info on usage:
// https://github.com/DataDog/dd-trace-js/blob/ae833b8ce0a45aa852e42c6cbf536f1b0814ba85/docs/API.md#manual-instrumentation
let tracer: Tracer | null = null

export const configureTracer = (config: Config): Tracer => {
  if (tracer !== null) {
    return tracer
  }
  tracer = ddtracer.init({
    enabled: config.logging.metricsSink !== '',
    service: config.logging.service,
    hostname: config.logging.metricsSink,
    port: 8126,
    dogstatsd: { port: 8125 },
    sampleRate: 0.25, // 25% sample rate
    // runtimeMetrics: true,
    plugins: false
  })
  return tracer
}

export { tracer }

// trace is a helper method to trace the execution of an operation within the function
// block.
//
// usage: measuring the execution time of a function and labeling the operation as
// 'ws.message' for the resource named by the message type.
// ------
// trace(`ws.message: ${msg.type}`, (span) => {
//   handle(msg)
// })
export const trace = (resourceName: string, fn: (span?: Span) => void) => {
  if (!tracer) {
    return fn()
  }
  return tracer.trace('http.request', span => {
    if (span) {
      // span type - helps with categorization
      span.setTag('span.type', 'web')

      // resource name within the operation
      span.setTag('resource.name', resourceName)

      // create 'metrics' for the operation
      span.setTag('_dd.measured', 1)
    }
    // continue
    return fn(span)
  })
}

// requestTracer is an express middleware to track performance metrics for http
// request handling.
export const requestTracer = (req: any, res: any, next: any) => {
  // skip tracing /ping requests
  if (req.path === '/ping') {
    next()
    return
  }
  if (!tracer) {
    return
  }

  // start span for 'http.request' operation
  const span = tracer.startSpan('http.request')

  span.setTag('span.type', 'web')
  span.setTag('span.kind', 'server')
  span.setTag('http.method', req.method)
  span.setTag('http.url', req.path)

  // create 'metrics' for the operation
  span.setTag('_dd.measured', 1)

  // Assign trace and span id's to the logger output
  const logEntry = getLogEntry(req)
  if (logEntry) {
    const traceID = span.context().toTraceId()
    const spanID = span.context().toSpanId()
    logEntry.set('dd', { trace_id: traceID, span_id: spanID }, true)
  }

  // Assign the current request tracer span on the request context
  req._trace = span

  next()

  // resource name that shows up under the operation
  if (req.route && req.route.path) {
    span.setTag('resource.name', `${req.method} ${req.route.path}`)
  } else {
    span.setTag('resource.name', `${req.method} ${req.path}`)
  }

  span.setTag('http.status_code', res.statusCode)
  if (res.statusCode >= 500 && res.statusCode < 600) {
    span.setTag('error', `Error! ${res.statusCode} response code`)
  }

  span.finish()
}
*/
