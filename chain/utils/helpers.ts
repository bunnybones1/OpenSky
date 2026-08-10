import { ContractTransaction, ContractReceipt } from 'ethers'
import ora from 'ora'

export const prompt = ora()

export const txWait = async (
  tx: Promise<ContractTransaction>
): Promise<ContractReceipt | undefined> => {
  try {
    return await (await tx).wait()
  } catch (error) {
    console.error('TX ERROR:', error)
  }
  return
}
