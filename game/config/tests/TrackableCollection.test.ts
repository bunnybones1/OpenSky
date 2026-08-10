import { TrackableCollection } from '~/utils/TrackableCollection'

test(`TrackableCollection doesn't call add for items no longer in the collection`, () => {
  const collectionBars = new TrackableCollection<any>('bars')

  const obj = {}

  collectionBars.listenForAdd(item => {
    collectionBars.remove(item)
  })

  const dontCallMe = jest.fn()
  collectionBars.listenForAdd(() => {
    dontCallMe()
  })

  collectionBars.add(obj)
  expect(dontCallMe).not.toBeCalled()
})

test(`TrackableCollection runs add;add;remove when it should run add;remove;add`, () => {
  TrackableCollection.paused = true
  const colls:TrackableCollection<any>[] = []
  function collection(name:string) {
    const coll = new TrackableCollection<any>(name)
    colls.push(coll)
    return coll
  }
  const alive = collection('alive')
  const critters = collection('critters')
  const squisher = collection('squisher')
  const livingCritters = alive.intersect(critters)
  const squishing = livingCritters.intersect(squisher)
  squishing.listenForAdd(i => alive.remove(i))
  const bob = 'Bob'
  critters.add(bob)
  alive.add(bob)
  livingCritters.listenForAdd(i => squisher.add(i))
  const deadCritters = critters.exclude(alive)
  deadCritters.listenForAdd(i => console.log(`ON NO!!! ${i}`))
  TrackableCollection.nudge()
  alive.add(bob)
  TrackableCollection.nudge()
  expect(livingCritters.items.includes(bob)).toBe(false)
  expect(squishing.items.includes(bob)).toBe(false)
})
