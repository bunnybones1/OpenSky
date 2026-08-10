
export function throttle<T, F extends (...args: any) => any>(
    this: T,
    func: F,
    timeout = 300
  ) {
    let shouldWait = false
    return (...args: Parameters<F>) => {
      if (!shouldWait) {
        func.apply(this, args)
        shouldWait = true
        setTimeout(() => {
          shouldWait = false
        }, timeout)
      }
    }
  }
  
  // throttle2 is an improvement over throttle, in that it will output the last input arguments (h) instead of ignoring them.
  // given the following inputs: a**** **** b******* *c  ****** **e** * ****f ****** ** g ****h
  // throttle would output     : a          b          c          e          f          g
  // throttle2 would output    : a          b          c          e          f          g          h
  export function throttle2<T, F extends (...args: any) => any>(
    this: T,
    func: F,
    timeout = 300
  ) {
    let shouldWait = false
    let followUp = false
    let delayedArgs: Parameters<F>
  
    const wrapped = (...args: Parameters<F>) => {
      if (!shouldWait) {
        func.apply(this, args)
        shouldWait = true
        setTimeout(() => {
          shouldWait = false
          if (followUp) {
            followUp = false
            wrapped.apply(this, delayedArgs)
          }
        }, timeout)
      } else {
        followUp = true
        delayedArgs = args
      }
    }
    return wrapped
  }
  
  function testThrottle2() {
    setTimeout(() => {
      let uuid = 0
  
      let val = 0
  
      function talk(i: number) {
        uuid++
        console.log(`talk all       ${i} (${uuid}) ${performance.now()}`)
      }
  
      function talk2(i: number) {
        uuid++
        console.log(`talk throttled ${i} (${uuid}) ${performance.now()}`)
      }
  
      const talk3 = throttle2(talk2, 500)
  
      const t = setInterval(() => {
        val++
        talk(val)
        talk3(val)
      }, 50)
  
      setTimeout(() => {
        clearInterval(t)
      }, 2300)
    }, 2000)
  }
  
  void testThrottle2
  
  // testThrottle2()
  