export function activate(obj: any, action: (obj: any, key: string) => void) {
  _activate(obj, action, [])
}
function _activate(
  obj: any,
  action: (obj: any, key: string) => void,
  cache: any = []
) {
  if (cache.includes(obj)) {
    return
  }
  cache.push(obj)

  for (const key of Object.keys(obj)) {
    const val = obj[key]
    switch (typeof val) {
      case 'undefined':
        return
      case 'object':
        _activate(val, action, cache)
        break
      case 'function':
        if (val.length > 0) {
          continue
        }
        break
      case 'boolean':
      case 'number':
      case 'string':
      default:
        console.log('debugger')
      // debugger
    }
    action(obj, key)
  }
}

// export function deactivate(obj, cache = []) {

// }
