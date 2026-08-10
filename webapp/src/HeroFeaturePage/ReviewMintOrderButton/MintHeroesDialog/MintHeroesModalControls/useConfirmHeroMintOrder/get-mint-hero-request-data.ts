import { BigNumber, utils } from 'ethers'

type MintHeroRequest = {
  recipient: string
  itemsBoughtIDs: number[] | string[] | BigNumber[]
  itemsBoughtAmounts: number[] | string[] | BigNumber[]
  maxUSDC: number | string | BigNumber
}

const MintHeroRequestType = `tuple(
  address recipient,
  uint256[] itemsBoughtIDs,
  uint256[] itemsBoughtAmounts,
  uint256 maxUSDC
)`

export const getMintHeroRequestData = (
  recipient: string,
  itemsBoughtIDs: number[] | BigNumber[],
  itemsBoughtAmounts: number[] | BigNumber[],
  maxUSDC: number | BigNumber
) => {
  const request: MintHeroRequest = {
    recipient,
    itemsBoughtIDs,
    itemsBoughtAmounts,
    maxUSDC
  }
  return utils.defaultAbiCoder.encode([MintHeroRequestType], [request])
}
