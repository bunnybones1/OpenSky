import './console'

import env from './env'
import { toggleCustomMatrixUpdateHandling } from './userSettings'
import { initCustomMatrixHandlingOverrides } from './utils/threeOverrides'

const mastHead = `
  ██████  ██ ▄█▀▓██   ██▓ █     █░▓█████ ▄▄▄    ██▒   █▓▓█████  ██▀███
▒██    ▒  ██▄█▒  ▒██  ██▒▓█░ █ ░█░▓█   ▀▒████▄ ▓██░   █▒▓█   ▀ ▓██ ▒ ██▒
░ ▓██▄   ▓███▄░   ▒██ ██░▒█░ █ ░█ ▒███  ▒██  ▀█▄▓██  █▒░▒███   ▓██ ░▄█ ▒
  ▒   ██▒▓██ █▄   ░ ▐██▓░░█░ █ ░█ ▒▓█  ▄░██▄▄▄▄██▒██ █░░▒▓█  ▄ ▒██▀▀█▄
▒██████▒▒▒██▒ █▄  ░ ██▒▓░░░██▒██▓ ░▒████▒▓█   ▓██▒▒▀█░  ░▒████▒░██▓ ▒██▒
▒ ▒▓▒ ▒ ░▒ ▒▒ ▓▒   ██▒▒▒ ░ ▓░▒ ▒  ░░ ▒░ ░▒▒   ▓▒█░░ ▐░  ░░ ▒░ ░░ ▒▓ ░▒▓░
░ ░▒  ░ ░░ ░▒ ▒░ ▓██ ░▒░   ▒ ░ ░   ░ ░  ░ ▒   ▒▒ ░░ ░░   ░ ░  ░  ░▒ ░ ▒░
░  ░  ░  ░ ░░ ░  ▒ ▒ ░░    ░   ░     ░    ░   ▒     ░░     ░     ░░   ░
    ░  ░  ░    ░ ░         ░       ░  ░     ░  ░   ░     ░  ░   ░
                ░ ░                                ░
                                                     ${env.GITCOMMIT}
Come work for us! https://horizon.io/careers
`

export const logMastHead = () => {
  console.log(mastHead)
  console.log(
    '%cType %c%c for debug information\n\n',
    'font-style: italic;',
    'background-color: #ccc; font-family: courier;',
    'font-style: italic;'
  )
}

toggleCustomMatrixUpdateHandling.listen(v => {
  if (v) {
    initCustomMatrixHandlingOverrides()
  }
})
