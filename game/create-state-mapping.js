/* eslint-disable */
const fs = require('fs')
const path = require('path')
const version = require('../state/js-bindings/packages/node-sys').getVersion()
const stateMappingDir = path.join(__dirname, 'dist', 'state_mappings')
if (!fs.existsSync(stateMappingDir)) {
  fs.mkdirSync(stateMappingDir)
}
fs.writeFileSync(
  path.join(stateMappingDir, `${version}.json`),
  JSON.stringify({ latest_build: process.env.GITCOMMIT })
)
