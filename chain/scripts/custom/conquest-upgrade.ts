import inquirer from 'inquirer'
import * as ethers from 'ethers'
import * as _ from 'lodash'
import * as hardhat from 'hardhat'
import { txWait } from '../../utils/helpers'
import { prompt } from '../../utils/helpers'
import { Wallet } from '@0xsequence/wallet'
import { sequenceContext } from '@0xsequence/network'
import { UniversalDeployer } from '@0xsequence/deployer'

import {
  ConquestV3__factory,
  ConquestV3
} from '@horizongames/skyweaver-contracts'

import * as loader from '../../utils/config-loader'
import { SilverRewardFactory__factory } from '../../adapter/factories'

/*
  CONSTANTS
*/
const DeployEnvironments = {
  LOCAL: 300,
  DEVELOPMENT: 200,
  STAGING: 100,
  PRODUCTION: 0
}

//----------------------------------------------------------------------------------------
//@ts-ignore
const provider = hardhat.ethers.provider
const signer = provider.getSigner()
const universalDeployer = new UniversalDeployer(hardhat.network.name, provider)
const gasLimit = 8000000

const main = async () => {
  const [DEPLOYER_ADDRESS] = await provider.listAccounts()

  // SW Server wallet
  const server_wallet_config = {
    threshold: 1,
    signers: [
      { weight: 1, address: loader.getEnvConfig()['SW_SERVER_EOA_ADDRESS'] }
    ]
  }
  const server_wallet = new Wallet({
    config: server_wallet_config,
    context: sequenceContext
  })

  prompt.info(`Network Name:             ${hardhat.network.name}`)
  prompt.info(`Local Deployer Address:   ${await signer.getAddress()}`)
  prompt.info(`Local Deployer's Balance: ${await signer.getBalance()}`)
  prompt.info(`OpenSky Server Wallet:  ${server_wallet.address}`)

  // Let user choose environment
  console.log('\n')
  const { env } = await inquirer.prompt<{ env: number }>([
    {
      type: 'list',
      name: 'env',
      message: 'Choose environment:',
      choices: [
        {
          name: 'Local',
          value: DeployEnvironments.LOCAL
        },
        {
          name: 'Development',
          value: DeployEnvironments.DEVELOPMENT
        },
        {
          name: 'Staging',
          value: DeployEnvironments.STAGING
        },
        new inquirer.Separator(),
        {
          name: 'Production',
          value: DeployEnvironments.PRODUCTION
        }
      ]
    }
  ])

  const { multisigOwner } = await inquirer.prompt([
    {
      type: 'input',
      name: 'multisigOwner',
      default: null,
      message: 'Gnosis Safe Address (leave empty for default EOA owner)'
    }
  ])

  if (multisigOwner) {
    try {
      ethers.utils.getAddress(multisigOwner)
    } catch (error) {
      throw new Error('invalid multisig address format')
    }
  }

  const txParams = {
    gasLimit: gasLimit
  }

  ////////////////////////////////////////////////
  //              DEPLOY CONTRACTS              //
  ////////////////////////////////////////////////

  const CONQUEST_TICKET_ID = 2 ** 16 * 254 + 1 //16646145

  const conquestV2Params = {
    [DeployEnvironments.LOCAL]: {
      oldConquest: '0xae70bbb459916CC32c961Df4a47556f0Fd587f3c',
      openskyAssets: '0xFe52b949359ad121072a0c3df3CB61a519fa6581',
      silverRewardFactory: '0x5BE5824a727DDaFeCee033FB013bbF10245a700D',
      goldRewardFactory: '0x742baCeb8870677339A79dacfE2cC7279799a280'
    },
    [DeployEnvironments.DEVELOPMENT]: {
      oldConquest: '0x864679163AE7e828E106Ec2f369e56247310E594',
      openskyAssets: '0x54b1a9A7a5577E5aD78b77FA2bA7A01d41f09fB4',
      silverRewardFactory: '0xf29A7A29Eeab7054dC036c6B049137cce2E2132B',
      goldRewardFactory: '0xb189cde552f5Ea919977BfC25a4989C9f4eFb402'
    },
    [DeployEnvironments.STAGING]: {
      oldConquest: '0x2Af4eb7D88021a13F53D8CC7d31DB00cb9608119',
      openskyAssets: '0x27A11C1563a5dDa238379B95c91B3AbBaD9C0cf6',
      silverRewardFactory: '0xc05042035dE734ea656E5ce075823434f8405a2c',
      goldRewardFactory: '0xc7dA2eC25D0a2ce1e6Dfce06E76F78eB39f909A4'
    },
    [DeployEnvironments.PRODUCTION]: {
      oldConquest: '0x654b051B82139f314F26872E27EBa0C32ac63b57',
      openskyAssets: '0x631998e91476DA5B870D741192fc5Cbc55F5a52E',
      silverRewardFactory: '0x50D17ae217A4534372C8db7431B5E4A9Ba6317C9',
      goldRewardFactory: '0xB7B1c51504Bad15fd2Ce967f0C098Ef60f9a3bED'
    }
  }

  /*
    1. Deploy V2 (with the right arguments)
    2. Let conquest V2 be owner tier one on silver reward factory
    3. Conquest V2 be owner tier 1 of gold factory
    4. Set server to be owner tier one of Cnquest V2 
 */

  const params = conquestV2Params[env]

  /*
    conquest main contract deploy and setup
  */
  const conquestV3 = (await universalDeployer.deploy(
    'ConquestV3',
    ConquestV3__factory,
    txParams,
    env,
    DEPLOYER_ADDRESS,
    params.oldConquest,
    params.openskyAssets,
    params.silverRewardFactory,
    params.goldRewardFactory,
    CONQUEST_TICKET_ID
  )) as ConquestV3

  console.log('conquestV3', conquestV3.address)

  ////////////////////////////////////////////////
  //        ASSIGNING OWNERSHIP TO SERVER       //
  ////////////////////////////////////////////////

  prompt.start(
    `Set OpenSky Server wallet (${server_wallet.address}) as Owner Tier 1 of Conquest`
  )
  await txWait(conquestV3.assignOwnership(server_wallet.address, 1))

  if (!multisigOwner) {
    prompt.start('Making conquest owner tier 1 of Silver Factory')
    const silverRewardFactory = SilverRewardFactory__factory.connect(
      params.silverRewardFactory,
      signer
    )
    await txWait(silverRewardFactory.assignOwnership(conquestV3.address, 1))
    prompt.succeed()

    prompt.start('Making conquest owner tier 1 of Gold Factory')
    const goldRewardFactory = SilverRewardFactory__factory.connect(
      params.goldRewardFactory,
      signer
    )
    await txWait(goldRewardFactory.assignOwnership(conquestV3.address, 1))
  } else {
    prompt.warn(
      'Need to manually execute - Making conquest owner tier 1 of Silver Factory'
    )
    prompt.warn(
      'Need to manually execute - Making conquest owner tier 1 of Gold Factory'
    )
  }

  prompt.succeed()
}

// Buidler: We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => {
    console.log('Finished')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
