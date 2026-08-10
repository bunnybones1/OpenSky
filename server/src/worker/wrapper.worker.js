const path = require('path')
const { workerData } = require('worker_threads')

// Only used in local development environment !!!
// This is a wrapper that allows TS files to be spawned as a worker thread on nodemon

require('ts-node').register({
  transpileOnly: true
})

require(path.resolve(__dirname, workerData.path))
