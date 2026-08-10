import { getDesignDataAsObject } from './data'

async function main() {
  await getDesignDataAsObject() // throws an error if the data is invalid
  console.log('ok!')
  process.exit(0)
}
main()
