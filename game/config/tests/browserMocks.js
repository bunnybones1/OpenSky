require('core-js')

var localStorageMock = (function () {
  var store = {}

  return {
    getItem: function (key) {
      return store[key] || null
    },
    setItem: function (key, value) {
      store[key] = value.toString()
    },
    removeItem: function (key) {
      delete this.store[key]
    },
    clear: function () {
      store = {}
    }
  }
})()

let window = {}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

global.console.warn = message => {
  throw new Error(`Got console.warn: ${message}`)
}

global.console.error = message => {
  throw new Error(`Got console.error: ${message}`)
}
