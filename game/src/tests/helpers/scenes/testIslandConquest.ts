import { conquestDataHelper } from '~/helpers/conquestDataHelper'
import BasicIslandTest from '~/tests/BasicIslandTest'

async function testIslandConquest() {
  conquestDataHelper.useFakeConquestData = true

  const islandTest = new BasicIslandTest()
  await islandTest.init()
}

export const test = testIslandConquest
