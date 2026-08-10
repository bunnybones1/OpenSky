import { snakeCase } from 'snake-case'

export function capitalize<S extends string>(text: S): Capitalize<S> {
  return (text.charAt(0).toUpperCase() + text.substring(1)) as Capitalize<S>
}

export function hashStringAsNumber(s: string) {
  return s.split('').reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0)
    return a & a
  }, 0)
}

export function splitCamelCase(str: string) {
  return str
    .replace(
      /(^[a-z]+)|[0-9]+|[A-Z][a-z]+|[A-Z]+(?=[A-Z][a-z]|[0-9])/g,
      function (match, first) {
        if (first) {
          match = match[0].toUpperCase() + match.slice(1)
        }
        return match + ' '
      }
    )
    .split(' ')
    .map(s => s.toLowerCase())
}

export function upperSnakeCase(s: string) {
  return snakeCase(s).toUpperCase()
}

export function padLeadingZeros(value: number, num: number = 2) {
  const withZeros = '0000000000' + value
  return withZeros.slice(withZeros.length - num)
}

export function replaceAll(str: string, find: string, replacement: string) {
  while (str.includes(find)) {
    str = str.replace(find, replacement)
  }
  return str
}

export function stringIsNumberRepr(string: string): string is `${number}` {
  return string === `${Number.parseInt(string)}`
}
