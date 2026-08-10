import PromiseQueue from '~/systems/animation/PromiseQueue'

test('PromiseQueue', async () => {
  const output = []
  const q = new PromiseQueue(err => {})
  q.push(async () => {
    output.push(1)
  })
  q.push(async () => {
    output.push(2)
  })
  q.push(async () => {
    output.push(3)
  })
  q.push(async () => {
    output.push(4)
  })
  q.runUntilFinished()
  q.push(() =>
    new Promise(res => {
      setTimeout(res, 10)
    }).then(() => output.push(5))
  )
  q.push(async () => {
    output.push(6)
  })
  q.push(async () => {
    output.push(7)
  })
  q.push(async () => {
    output.push(8)
  })
  q.push(async () => {
    output.push(9)
  })
  q.finish()
  await q.runUntilFinished()
  output.push(10)
  expect(output).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})
