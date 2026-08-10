import inquirer from 'inquirer'
import * as ethers from 'ethers'
import * as _ from 'lodash'
import * as helper from '../utils/helpers'
import { Wallet } from '@0xsequence/wallet'
import { sequenceContext } from '@0xsequence/network'
import { UniversalDeployer } from '@0xsequence/deployer'
import { LocalRelayer } from '@0xsequence/relayer'
import * as sequenceUtils from '@0xsequence/utils'
import * as fs from 'fs'
import { CONQUEST_TICKET_ID } from '@opensky/shared/constants'

import { ERC20Wrapper__factory } from '@0xsequence/erc20-meta-token'

import {
  Conquest,
  ConquestEntriesFactory,
  ConquestEntriesFactory__factory,
  Conquest__factory,
  OpenSkyAssets,
  OpenSkyAssets__factory
} from '@horizongames/skyweaver-contracts'

import {
  NiftyswapFactory20__factory,
  NiftyswapFactory20
} from '@0xsequence/niftyswap'

import * as chain from '../adapter'

import * as assetIDs from '@opensky/shared/assetsIDs'
import * as loader from '../utils/config-loader'
import { OperatorWallet } from '../utils/wallet'
import { NetworkTypes, EnvTypes } from '@opensky/chain-model'

/*
  CONSTANTS
*/
const DeployEnvironments = {
  LOCAL: 300,
  DEVELOPMENT: 200,
  STAGING: 100,
  PRODUCTION: 0
}

const MAX = 19999 // max card ID value, approx

const NIFTYSAWP_LP_FEE = 40

/*
0x01 (2^16*1 + card ID): Silver cards 
0x02 (2^16*2 + card ID): Gold cards
0x03 (2^16*3 + skin ID): Hero Skins
0x04 (2^16*4 + crystal ID): Crystals
--
0xfe (2^16*254 + card ID): Miscallenous assets (e.g. Conquest entry tickets)
0xff (2^16*255 + card ID): Base cards (and other off-chain assets)
*/

const MINT_PERIOD_LENGTH_6_HOURS = 60 * 60 * 6 // 6 hours
const MINT_PERIOD_LENGTH_WEEKLY = 60 * 60 * 24 * 7 // 7 days

const SILVER_REWARD_FACTORY_MINT_LIMIT = 20495 * 100 * 10 // TODO: reduce to 5000 after LP
const [SILVER_MIN_ID, SILVER_MAX_ID] = [
  assetIDs.getSilverID(0),
  assetIDs.getSilverID(MAX)
]

const GOLD_REWARD_FACTORY_MINT_LIMIT = 1000 * 100
const [GOLD_MIN_ID, GOLD_MAX_ID] = [
  assetIDs.getGoldID(0),
  assetIDs.getGoldID(MAX)
]

// Legacy heroes //
const LEGACY_HERO_FACTORY_MINT_LIMIT = 300 * 100
const [LEGACY_HERO_MIN_ID, LEGACY_HERO_MAX_ID] = [
  assetIDs.getLegacyHeroID(1),
  assetIDs.getLegacyHeroID(15)
]

// Legacy Heroes
const LEGACY_COST_IN_GOLDS = ethers.BigNumber.from(10) // 10 golds
const LEGACY_USDC_CURVE_CONSTANT = 4375 // 43.75
const LEGACY_USDC_CURVE_SCALE_DOWN = 100 // No scaling
const LEGACY_USDC_CURVE_TICK_SIZE = 10 * 100 // 10 mint per tick

// Stickers
const STICKER_FACTORY_MINT_LIMIT = 1000 * 100
const [STICKER_MIN_ID, STICKER_MAX_ID] = [
  assetIDs.getStickerID(1),
  assetIDs.getStickerID(2 ** 16 - 1)
]

// Card Backs
const CARD_BACK_FACTORY_MINT_LIMIT = 1000 * 100
const [CARD_BACK_MIN_ID, CARD_BACK_MAX_ID] = [
  assetIDs.getCardBackID(1),
  assetIDs.getCardBackID(2 ** 16 - 1)
]

// const LEADERBOARD_REWARD_FACTORY_SILVER_MINT_LIMIT = 800 * 100
const LEADERBOARD_REWARD_FACTORY_MINT_LIMIT_DEFAULT = 750 * 100
const LEADERBOARD_REWARD_FACTORY_TICKET_MINT_LIMIT = 2400 * 100
const FREE_CONQUEST_TICKETS_FACTORY_MINT_LIMIT = 1000 * 100 // TODO: change this on activation

// Conquest treasure silver card mint limit
const CONQUEST_TREASURE_SILVER_MINT_LIMIT = 2000 * 100

// Skypass factories
const SKYPASS_SILVER_MINT_LIMIT = 500 * 100
const SKYPASS_STICKER_MINT_LIMIT = 500 * 100
const SKYPASS_CONQUEST_TICKET_MINT_LIMIT = 500 * 100

const CRYSTAL_FACTORY_MINT_LIMIT = ethers.constants.MaxUint256
const CRYSTAL_TYPE_ID = ethers.BigNumber.from(2).pow(16).mul(4)
const [CRYSTAL_MIN_ID, CRYSTAL_MAX_ID] = [
  CRYSTAL_TYPE_ID.add(1),
  CRYSTAL_TYPE_ID.add(6)
]

const [unlimitedAssetRangeStartTime, unlimitedAssetRangeEndTime] = [
  0,
  Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 100 // 100 years from now
]

const SKYWAVER_ASSETS_ROYALTY_FEE_PERCENTAGE_BASIS_POINTS = 50 // 5%

//polygon.gnosis-safe.io/app/#/safes/0x787efdB84E94AbC631E5A1983c937D220529B94c
const SW_TREASURY_ADDRESS = '0x787efdB84E94AbC631E5A1983c937D220529B94c' // revenue

const SKYWEAVER_ASSETS_METADATA_URI =
  'https://assets.skyweaver.net/latest/metadata/'

// https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359#readContract
const USDC_CONTRACT_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'

//----------------------------------------------------------------------------------------

const gasLimit = 8000000
const gasPrice = ethers.BigNumber.from(10).pow(9).mul(100) // 100 Gwei gas price

const main = async () => {
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

  const envName: string = Object.keys(DeployEnvironments).find(
    name => DeployEnvironments[name] === env
  )!

  const wallet = await OperatorWallet.create(
    envName as EnvTypes,
    NetworkTypes.MATIC,
    'EOA' //multisigOwner ? "MULTISIG" : "EOA"
  )

  const provider = wallet.provider as ethers.providers.JsonRpcProvider
  const signer = wallet
  const universalDeployer = new UniversalDeployer('matic', provider, wallet)
  const OWNER = wallet.address

  helper.prompt.info(`Local Deployer Address:   ${await wallet.address}`)
  helper.prompt.info(
    `Local Deployer's Balance: ${await provider.getBalance(wallet.address)}`
  )
  helper.prompt.info(`OpenSky Server Wallet:  ${server_wallet.address}`)

  const { usingRealUSDC } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'usingRealUSDC',
      default: false,
      message: `Use Real USDC as currency?`
    }
  ])

  const { onlyNewContracts } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'onlyNewContracts',
      default: null,
      message: 'Do you want to only deploy new contracts?'
    }
  ])

  // Load existing contracts for specified env
  const contractEnvPath = `./networks/MATIC_${envName}.json`
  const existingContractsArray = JSON.parse(
    fs.readFileSync(contractEnvPath).toString()
  )
  const existingContracts = {}
  existingContractsArray.forEach(contract => {
    existingContracts[contract.contractName] = contract.address
  })

  // Check whether deploy should be skipped
  const skipDeploy = (alias: string) => {
    return onlyNewContracts && existingContracts[alias]
  }

  // Will deploy and setup contracts where needed
  const rewardFactoryDeploy = async (
    alias: string,
    factory: any,
    mintPeriodLength: number,
    mintLimit: ethers.BigNumberish,
    whitelistOnly: boolean,
    minID: ethers.BigNumberish,
    maxID: ethers.BigNumberish,
    isServerOwner: boolean,
    multisigAddress: string
  ) => {
    if (!skipDeploy(alias)) {
      // Deploy contract, if not already deployed
      const _factory = (await universalDeployer.deploy(
        alias,
        factory,
        txParams,
        env,
        OWNER,
        openskyAssets.address,
        mintPeriodLength,
        mintLimit,
        whitelistOnly
      )) as chain.SilverRewardFactory // All reward factories are the same, so we just use the silver one as template

      // Verifying contract
      // await hardhat.tenderly.verify({
      //   name: alias,
      //   address: _factory.address
      // })

      // Check if mint limits changed
      if (
        !(await _factory.periodMintLimit()).eq(ethers.BigNumber.from(mintLimit))
      ) {
        helper.prompt.start(`Updating ${alias} mint limit to ${mintLimit}`)
        await _factory.updatePeriodMintLimit(mintLimit)
        helper.prompt.succeed()
      }

      // Activating factory
      await activateFactory(alias, _factory.address, minID, maxID)

      // Assign ownership to server, if needed
      if (isServerOwner) {
        const ownerTier = await _factory.getOwnerTier(server_wallet.address)
        if (ownerTier.lte(ethers.BigNumber.from(1))) {
          // Only assign ownership if needed
          helper.prompt.start(
            `Set OpenSky Server as Owner Tier 1 of ${alias}`
          )
          await helper.txWait(
            _factory.assignOwnership(server_wallet.address, 1, txParams)
          )
          helper.prompt.succeed()
        }
      }

      // Give multisig full permission
      if (multisigAddress) {
        helper.prompt.start(
          `Set multisig ${multisigAddress} as max Owner Tier of ${alias}`
        )
        await setMultisigAsOwner(alias, _factory, multisigAddress)
        helper.prompt.succeed()
      }

      return _factory
    } else {
      const _factory = factory.connect(existingContracts[alias], signer)
      return _factory
    }
  }

  // Activate and sets mint permission of factory
  const activateFactory = async (
    alias: string,
    factoryAddress: string,
    minID,
    maxID
  ) => {
    const isActive = await openskyAssets.getFactoryStatus(factoryAddress)
    if (!isActive) {
      helper.prompt.start(`Activating ${alias}`)
      await helper.txWait(
        openskyAssets.activateFactory(factoryAddress, txParams)
      )
      helper.prompt.succeed
    }

    // Active mint ranges for this factory
    const mintRanges =
      await openskyAssets.getFactoryAccessRanges(factoryAddress)

    let mintPermissionMissing = true
    for (let idx = 0; idx < mintRanges.length; idx++) {
      if (
        !mintRanges[idx].minID.eq(minID) ||
        !mintRanges[idx].maxID.eq(maxID)
      ) {
        helper.prompt.start(`Removing old mint permission ${alias}`)
        await helper.txWait(
          openskyAssets.removeMintPermission(factoryAddress, idx, txParams)
        )
        helper.prompt.succeed()
      } else {
        mintPermissionMissing = false
      }
    }

    // Set mint permissions, if needed
    if (mintPermissionMissing) {
      helper.prompt.start(`Setting mint permissions for ${alias}`)
      await helper.txWait(
        openskyAssets.addMintPermission(
          factoryAddress,
          minID,
          maxID,
          ethers.BigNumber.from(unlimitedAssetRangeStartTime),
          ethers.BigNumber.from(unlimitedAssetRangeEndTime),
          txParams
        )
      )
      helper.prompt.succeed()
    }
  }

  const setOwner = async (
    _alias,
    _contract: any,
    _owner: string,
    _tier: number
  ) => {
    // Check if owner already
    const ownerTier = await _contract.getOwnerTier(_owner)
    if (ownerTier.toNumber() != _tier) {
      helper.prompt.start(`Making ${_owner} owner tier ${_tier} of ${_alias}`)
      await helper.txWait(_contract.assignOwnership(_owner, _tier))
      helper.prompt.succeed()
    }
  }

  // Give max ownership tier to multisig
  const setMultisigAsOwner = async (
    alias: string,
    contract: any,
    newMultisigOwner: string
  ) => {
    const eoaOwnershipTier = await contract.getOwnerTier(OWNER)
    const multisigOwnershipTier = await contract.getOwnerTier(newMultisigOwner)

    // If current owner has highest tier and not the multisig
    if (
      eoaOwnershipTier.eq(ethers.constants.MaxUint256) &&
      !multisigOwnershipTier.eq(ethers.constants.MaxUint256)
    ) {
      helper.prompt.start(`Assigning ${alias} ownership to multisig`)
      await helper.txWait(
        contract.assignOwnership(
          multisigOwner,
          ethers.constants.MaxUint256,
          txParams
        )
      )
      helper.prompt.succeed()
    }
  }

  // real USDC contract
  const realUSDCContract = chain.USDC__factory.connect(
    USDC_CONTRACT_ADDRESS,
    provider
  )

  if (usingRealUSDC) {
    const realUSDCBalance = await realUSDCContract.balanceOf(OWNER)

    if (realUSDCBalance.lt(ethers.constants.Zero)) {
      helper.prompt.warn(
        'make sure you have non-zero USDC balance for token wrapper registration'
      )
      process.exit(1)
    }
  }

  if (multisigOwner) {
    try {
      ethers.utils.getAddress(multisigOwner)
    } catch (error) {
      throw new Error('invalid multisig address format')
    }
  }

  const txParams = { gasLimit, gasPrice }

  // Deploying Server Wallet as a 1/1 multisig
  if ((await provider.getCode(server_wallet.address)) === '0x') {
    helper.prompt.start('Deploying SW Server Sequence Wallet')
    let deployment = new LocalRelayer(provider.getSigner()).prepareWalletDeploy(
      server_wallet_config,
      sequenceContext
    )
    let tx = await wallet.sendTransaction({
      ...deployment,
      gasLimit: 150000
    })
    await tx.wait()
    helper.prompt.succeed()
    helper.prompt.info(
      `SW Server Sequence Wallet Address : ${server_wallet.address}`
    )
  }

  const niftyswap_factory = await (async () => {
    if (!skipDeploy('NiftyswapFactory')) {
      return await universalDeployer.deploy(
        'NiftyswapFactory',
        NiftyswapFactory20__factory,
        txParams,
        0, // shared salt (0) across all envs
        OWNER
      )
    } else {
      return NiftyswapFactory20__factory.connect(
        existingContracts['NiftyswapFactory'],
        signer
      )
    }
  })()

  /* 
    deploy opensky assets contract
    deploy token wrapper contract
  */
  const openskyAssets = (await (async () => {
    if (!skipDeploy('OpenSkyAssets')) {
      return await universalDeployer.deploy(
        'OpenSkyAssets',
        OpenSkyAssets__factory,
        txParams,
        env,
        OWNER
      )
    } else {
      return OpenSkyAssets__factory.connect(
        existingContracts['OpenSkyAssets'],
        signer
      )
    }
  })()) as OpenSkyAssets

  // Check if global royalty is already set correctly
  const globlaRoyaltyInfo = await openskyAssets.globalRoyaltyInfo()

  if (
    globlaRoyaltyInfo.receiver !== SW_TREASURY_ADDRESS ||
    !globlaRoyaltyInfo.feeBasisPoints.eq(
      ethers.BigNumber.from(SKYWAVER_ASSETS_ROYALTY_FEE_PERCENTAGE_BASIS_POINTS)
    )
  ) {
    helper.prompt.start(`setting openskyAssets royalty info`)
    await helper.txWait(
      openskyAssets.setGlobalRoyaltyInfo(
        SW_TREASURY_ADDRESS,
        SKYWAVER_ASSETS_ROYALTY_FEE_PERCENTAGE_BASIS_POINTS,
        txParams
      )
    )
    helper.prompt.succeed()
  }

  // Token wrapper
  const tokenWrapper = await (async () => {
    if (!skipDeploy('ERC20Wrapper')) {
      return await universalDeployer.deploy(
        'ERC20Wrapper',
        ERC20Wrapper__factory,
        txParams,
        env
      )
    } else {
      return ERC20Wrapper__factory.connect(
        existingContracts['ERC20Wrapper'],
        signer
      )
    }
  })()

  /*
    deploy mockUSDC contract if not using real USDC
    deposit usdc/mockUSDC into erc20-meta-token to reserve token ID slot
  */
  const usdc = usingRealUSDC
    ? realUSDCContract
    : await (async () => {
        if (!skipDeploy('USDC')) {
          return await universalDeployer.deploy(
            'USDC',
            chain.USDC__factory,
            txParams,
            env
          )
        } else {
          return chain.USDC__factory.connect(existingContracts['USDC'], signer)
        }
      })()

  try {
    await tokenWrapper.getTokenID(usdc.address)
  } catch (e) {
    helper.prompt.start('Initializing Wrapped USDC')
    const INIT_DEPOSIT_AMOUNT = 1
    if (!usingRealUSDC) {
      await helper.txWait(usdc.mockMint(OWNER, INIT_DEPOSIT_AMOUNT, txParams))
    }
    await helper.txWait(
      usdc.approve(tokenWrapper.address, INIT_DEPOSIT_AMOUNT, txParams)
    )
    await helper.txWait(
      tokenWrapper.deposit(usdc.address, OWNER, INIT_DEPOSIT_AMOUNT, txParams)
    )
    helper.prompt.succeed()
  }

  if (!usingRealUSDC) {
    // TODO: review......
    // await hardhat.tenderly.verify({
    //   name: 'USDC',
    //   address: usdc.address
    // })
  }

  const WUSDC_ID = await tokenWrapper.getTokenID(usdc.address)

  // Leaderboard silver reward factory
  await rewardFactoryDeploy(
    'LeaderboardRewardFactory',
    chain.LeaderboardRewardFactory__factory,
    MINT_PERIOD_LENGTH_WEEKLY,
    LEADERBOARD_REWARD_FACTORY_MINT_LIMIT_DEFAULT,
    false,
    SILVER_MIN_ID,
    SILVER_MAX_ID,
    true,
    multisigOwner
  )

  // Leaderboard reward ticket factory
  await rewardFactoryDeploy(
    'LeaderboardTicketRewardFactory',
    chain.LeaderboardTicketRewardFactory__factory,
    MINT_PERIOD_LENGTH_WEEKLY,
    LEADERBOARD_REWARD_FACTORY_TICKET_MINT_LIMIT,
    false,
    CONQUEST_TICKET_ID,
    CONQUEST_TICKET_ID,
    true,
    multisigOwner
  )

  // Conquest Treasure silver factory
  await rewardFactoryDeploy(
    'ConquestTreasureSilverFactory',
    chain.ConquestTreasureSilverFactory__factory,
    MINT_PERIOD_LENGTH_WEEKLY,
    CONQUEST_TREASURE_SILVER_MINT_LIMIT,
    false,
    SILVER_MIN_ID,
    SILVER_MAX_ID,
    true,
    multisigOwner
  )

  // Conquest Tickets factory for IAP
  await rewardFactoryDeploy(
    'FreeConquestEntriesFactory',
    chain.FreeConquestEntriesFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    FREE_CONQUEST_TICKETS_FACTORY_MINT_LIMIT,
    false,
    CONQUEST_TICKET_ID,
    CONQUEST_TICKET_ID,
    true,
    multisigOwner
  )

  // Silver factory for Conquest
  const silverRewardFactory = await rewardFactoryDeploy(
    'SilverRewardFactory',
    chain.SilverRewardFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    SILVER_REWARD_FACTORY_MINT_LIMIT,
    false,
    SILVER_MIN_ID,
    SILVER_MAX_ID,
    false, // Not minted by server directly
    multisigOwner
  )

  // Gold factory for Conquest
  const goldRewardFactory = await rewardFactoryDeploy(
    'GoldRewardFactory',
    chain.GoldRewardFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    GOLD_REWARD_FACTORY_MINT_LIMIT,
    true,
    GOLD_MIN_ID,
    GOLD_MAX_ID,
    true, // Not minted by server directly
    multisigOwner
  )

  // Conquest Tickets factory
  const conquestEntryFactory = (await (async () => {
    if (!skipDeploy('ConquestEntriesFactory')) {
      return await universalDeployer.deploy(
        'ConquestEntriesFactory',
        ConquestEntriesFactory__factory,
        txParams,
        env,
        OWNER,
        openskyAssets.address,
        tokenWrapper.address,
        WUSDC_ID,
        CONQUEST_TICKET_ID,
        SILVER_MIN_ID,
        SILVER_MAX_ID
      )
    } else {
      return ConquestEntriesFactory__factory.connect(
        existingContracts['ConquestEntriesFactory'],
        signer
      )
    }
  })()) as ConquestEntriesFactory

  await activateFactory(
    'ConquestEntriesFactory',
    conquestEntryFactory.address,
    CONQUEST_TICKET_ID,
    CONQUEST_TICKET_ID
  )

  // Conquest
  const conquest = (await (async () => {
    if (!skipDeploy('Conquest')) {
      return await universalDeployer.deploy(
        'Conquest',
        Conquest__factory,
        txParams,
        env,
        OWNER,
        openskyAssets.address,
        silverRewardFactory.address,
        goldRewardFactory.address,
        CONQUEST_TICKET_ID
      )
    } else {
      return Conquest__factory.connect(existingContracts['Conquest'], signer)
    }
  })()) as Conquest

  // Conquest permissions
  await setOwner('Conquest', conquest, server_wallet.address, 1)
  await setOwner(
    'Silver Reward Factory',
    silverRewardFactory,
    conquest.address,
    1
  )
  await setOwner('Gold Reward Factory', goldRewardFactory, conquest.address, 1)

  if (multisigOwner) {
    await setMultisigAsOwner('Conquest', conquest, multisigOwner)
  }

  // Crystal factory
  await rewardFactoryDeploy(
    'CrystalFactory',
    chain.CrystalFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    CRYSTAL_FACTORY_MINT_LIMIT,
    false,
    CRYSTAL_MIN_ID,
    CRYSTAL_MAX_ID,
    false, // Not minted by server
    multisigOwner
  )

  // Legacy Hero Free Skins factory
  await rewardFactoryDeploy(
    'LegacyHeroFactory',
    chain.LegacyHeroFactory__factory,
    MINT_PERIOD_LENGTH_WEEKLY,
    LEGACY_HERO_FACTORY_MINT_LIMIT,
    false,
    LEGACY_HERO_MIN_ID,
    LEGACY_HERO_MAX_ID,
    false, // Not minted by server
    multisigOwner
  )

  // Legacy hero mint factory
  const legacyHeroSale = (await (async () => {
    if (!skipDeploy('LegacyHeroSale')) {
      return await universalDeployer.deploy(
        'LegacyHeroSale',
        chain.LegacyHeroSale__factory,
        txParams,
        env,
        OWNER,
        usdc.address,
        openskyAssets.address,
        GOLD_MIN_ID,
        GOLD_MAX_ID,
        LEGACY_COST_IN_GOLDS,
        LEGACY_USDC_CURVE_CONSTANT,
        LEGACY_USDC_CURVE_SCALE_DOWN,
        LEGACY_USDC_CURVE_TICK_SIZE
      )
    } else {
      return chain.LegacyHeroSale__factory.connect(
        existingContracts['LegacyHeroSale'],
        signer
      )
    }
  })()) as chain.LegacyHeroSale

  await activateFactory(
    'LegacyHeroSale',
    legacyHeroSale.address,
    LEGACY_HERO_MIN_ID,
    LEGACY_HERO_MAX_ID
  )

  // Transfer ownership to multisig
  if (multisigOwner) {
    await setMultisigAsOwner('LegacyHeroSale', legacyHeroSale, multisigOwner)
  }

  // Stickers factory
  await rewardFactoryDeploy(
    'StickersFactory',
    chain.StickersFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    STICKER_FACTORY_MINT_LIMIT,
    false,
    STICKER_MIN_ID,
    STICKER_MAX_ID,
    true,
    multisigOwner
  )

  // Cardback factory
  await rewardFactoryDeploy(
    'CardbacksFactory',
    chain.CardbacksFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    CARD_BACK_FACTORY_MINT_LIMIT,
    false,
    CARD_BACK_MIN_ID,
    CARD_BACK_MAX_ID,
    true,
    multisigOwner
  )

  // Skypass factories //

  // Silver card factory for Skypass
  await rewardFactoryDeploy(
    'SkypassSilverRewardFactory',
    chain.SkypassSilverRewardFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    SKYPASS_SILVER_MINT_LIMIT,
    false,
    SILVER_MIN_ID,
    SILVER_MAX_ID,
    true,
    multisigOwner
  )

  // Sticker factory for Skypass
  await rewardFactoryDeploy(
    'SkypassStickersFactory',
    chain.SkypassStickersFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    SKYPASS_STICKER_MINT_LIMIT,
    false,
    STICKER_MIN_ID,
    STICKER_MAX_ID,
    true,
    multisigOwner
  )

  // Conquest ticket factory for Skypass
  await rewardFactoryDeploy(
    'SkypassConquestTicketsFactory',
    chain.SkypassConquestTicketsFactory__factory,
    MINT_PERIOD_LENGTH_6_HOURS,
    SKYPASS_CONQUEST_TICKET_MINT_LIMIT,
    false,
    CONQUEST_TICKET_ID,
    CONQUEST_TICKET_ID,
    true,
    multisigOwner
  )

  // Niftyswap exchange setup
  if (!skipDeploy('NiftyswapExchange')) {
    const niftyswapFactory20 = new NiftyswapFactory20__factory(signer).attach(
      niftyswap_factory.address
    ) as NiftyswapFactory20

    // Check if exchange already exists
    const niftyswapExchangeAddress_0 =
      await niftyswapFactory20.tokensToExchange(
        openskyAssets.address,
        usdc.address,
        NIFTYSAWP_LP_FEE,
        0
      )

    if (niftyswapExchangeAddress_0 === ethers.constants.AddressZero) {
      helper.prompt.start('Create OpenSky Exchange')
      const createExchangeTxn = await helper.txWait(
        niftyswapFactory20.createExchange(
          openskyAssets.address,
          usdc.address,
          NIFTYSAWP_LP_FEE,
          0,
          txParams
        )
      )
      if (!createExchangeTxn) {
        throw new Error('failed to create exchange')
      }
      helper.prompt.succeed()
    }

    const niftyswapExchangeAddress = await niftyswapFactory20.tokensToExchange(
      openskyAssets.address,
      usdc.address,
      NIFTYSAWP_LP_FEE,
      0
    )

    universalDeployer.manualDeploymentRegistration(
      'NiftyswapExchange',
      niftyswapExchangeAddress
    )
  }

  // Payment proxy contract for opensky
  helper.prompt.start('Proxy payment contract')

  // Payment proxy for opensky
  if (!skipDeploy('OpenSkyPaymentProxy')) {
    const proxyPaymentContract = await universalDeployer.deploy(
      'OpenSkyPaymentProxy',
      chain.OpenSkyPaymentProxy__factory,
      txParams,
      env,
      OWNER
    )

    // Transfer ownership to multisig
    if (multisigOwner) {
      await setMultisigAsOwner(
        'OpenSkyPaymentProxy',
        proxyPaymentContract,
        multisigOwner
      )
    }
  }

  /*
    set metadata URI
  */
  if (!(await openskyAssets.uri(0)).includes(SKYWEAVER_ASSETS_METADATA_URI)) {
    helper.prompt.start(
      `Setting OpenSky base URI to ${SKYWEAVER_ASSETS_METADATA_URI}`
    )
    await helper.txWait(
      openskyAssets.setBaseMetadataURI(
        SKYWEAVER_ASSETS_METADATA_URI,
        txParams
      )
    )
    helper.prompt.succeed()
  }

  // Transfer ownership of SW contract
  // if (multisigOwner) {
  //   const currentOwner = await openskyAssets.getOwner()
  //   if (currentOwner.toLowerCase() === OWNER.toLowerCase()) {
  //     helper.prompt.start(`Transferring openskyAssets ownership to multisig`)
  //     await helper.txWait(openskyAssets.transferOwnership(multisigOwner, txParams))
  //     helper.prompt.succeed()
  //   } else {
  //     helper.prompt.warn(`openskyAssets current owner ${currentOwner}`)
  //   }
  // }

  /*
    finish, write deployment details to file
  */

  helper.prompt.start(`writing deployment information to ${contractEnvPath}`)

  const content: any[] = []
  if (onlyNewContracts) {
    // Add existing contracts
    Object.keys(existingContracts).forEach(contractName => {
      content.push({ contractName, address: existingContracts[contractName] })
    })
  }

  ;(await universalDeployer.getDeploymentList()).forEach(newContract => {
    content.push(newContract)
  })

  if (usingRealUSDC) {
    content.push({
      contractName: 'USDC',
      address: USDC_CONTRACT_ADDRESS
    })
  } else {
    // re-order USDC contract to end of list, to standardlize output format as above
    const index = content.findIndex(
      contract => contract.contractName === 'USDC'
    )
    content.push(content.splice(index, 1)[0])
  }

  await sequenceUtils.promisify<any, any, any, any>(fs.writeFile)(
    contractEnvPath,
    JSON.stringify(content, null, 2),
    { flag: 'w+' }
  )

  helper.prompt.succeed()
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
