import BasicIslandTest from '~/tests/BasicIslandTest'

async function testIslandBasic() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
}

export const test = testIslandBasic
