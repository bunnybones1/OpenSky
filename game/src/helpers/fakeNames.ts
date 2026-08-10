import { getRandom } from '@opensky/shared/utils/arrayUtils'

const fakeFirstNames = [
  'Shiny',
  'Startled',
  'Rabid',
  'Cozy',
  'Errant',
  'Steve',
  'Marsha',
  'Tiny',
  'Big',
  'Lilly',
  'Presto',
  'Frizzy'
]

const fakeSecondNames = [
  'Captain',
  'Flea',
  'Keeper',
  'Floss',
  'Almighty',
  'Pappy'
]
const fakeThirdNames = [
  '420',
  'the Third',
  '1983',
  'or else',
  'Pop',
  'xxx',
  'Bleeds'
]

export function getFakeName() {
  let name = getRandom(fakeFirstNames)
  if (Math.random() > 0.2) {
    name += ' ' + getRandom(fakeSecondNames)
  }
  if (Math.random() > 0.3) {
    name += ' ' + getRandom(fakeThirdNames)
  }
  return name
}
