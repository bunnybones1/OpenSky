import { HardhatUserConfig } from 'hardhat/config'
import * as loader from './utils/config-loader'

import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-ethers'
// import * as tenderly from '@tenderly/hardhat-tenderly'

// TODO: review setup in https://github.com/0xsequence/contracts-boiler-plate/blob/master/hardhat.config.ts
// to fix this file..

const ganacheNetwork = {
  url: 'http://127.0.0.1:8545',
  blockGasLimit: 6000000000
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.7.4', // TODO: upgrade..
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
        details: {
          yul: true
        }
      }
    }
  },
  paths: {
    artifacts: './artifacts'
  },
  networks: {
    rinkeby: loader.networkConfig('rinkeby'),
    kovan: loader.networkConfig('kovan'),
    goerli: loader.networkConfig('goerli'),
    mumbai: loader.networkConfig('mumbai'),
    matic: loader.networkConfig('matic'),
    ganache: ganacheNetwork
  },
  // TODO: see hardhat-tenderly github example if you want to learn more
  // tenderly: {
  //   project: process.env.TENDERLY_PROJECT ?? "",
  //   username: process.env.TENDERLY_USERNAME ?? "",
  //   privateVerification: priaveteVerification,
  // },
}

export default config
