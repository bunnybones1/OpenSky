import PromiseParallel from '~/systems/animation/PromiseParallel'

test('PromiseParallel', async () => {
  const output = []
  const p = new PromiseParallel(() => {})

  p.push(async () => {
    output.push(1)
  })
  p.push(async () => {
    output.push(2)
  })
  p.push(() =>
    new Promise(res => {
      setTimeout(res, 10)
    }).then(() => output.push(5))
  )
  p.runUntilFinished()
  p.push(async () => {
    output.push(3)
  })
  p.push(async () => {
    output.push(4)
  })
  p.finish()
  await p.runUntilFinished()
  output.push(6)
  expect(output).toEqual([1, 2, 3, 4, 5, 6])
})
