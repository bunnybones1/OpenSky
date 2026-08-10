import { BigNumber, utils } from 'ethers'

type SellTokensObj20 = {
  recipient: string
  minCurrency: number | string | BigNumber
  extraFeeRecipients: string[]
  extraFeeAmounts: number[] | string[] | BigNumber[]
  deadline: number | string | BigNumber
}

const methodsSignature = {
  BUYTOKENS: '0xb2d81047',
  SELLTOKENS: '0xade79c7a'
}

const SellTokens20Type = `tuple(
    address recipient,
    uint256 minCurrency,
    address[] extraFeeRecipients,
    uint256[] extraFeeAmounts,
    uint256 deadline
  )`

export const getSellTokenData20 = (
  recipient: string,
  cost: BigNumber,
  deadline: number,
  extraFeeRecipients?: string[],
  extraFeeAmounts?: BigNumber[]
) => {
  const sellTokenObj = {
    recipient: recipient,
    minCurrency: cost,
    extraFeeRecipients: extraFeeRecipients ? extraFeeRecipients : [],
    extraFeeAmounts: extraFeeAmounts ? extraFeeAmounts : [],
    deadline: deadline
  } as SellTokensObj20

  return utils.defaultAbiCoder.encode(
    ['bytes4', SellTokens20Type],
    [methodsSignature.SELLTOKENS, sellTokenObj]
  )
}
