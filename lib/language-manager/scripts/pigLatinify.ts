function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
}

function matchCase(stringToMatch: string, stringToModify: string): string {
  if (stringToMatch.length < 2) {
    return stringToModify
  }
  if (stringToMatch[0].toUpperCase() === stringToMatch[0]) {
    if (stringToMatch[1].toUpperCase() === stringToMatch[1]) {
      return stringToModify.toUpperCase()
    } else {
      return titleCase(stringToModify)
    }
  } else {
    return stringToModify.toLowerCase()
  }
}

const vowels = 'aeiouAEIOU'

function pigIt(str: string) {
  var newStr = str.split(/(\W+)/)

  var changed = newStr.map(input => {
    if (!/\w/.test(input) || `${Number.parseInt(input, 10)}` === input) {
      return input
    }

    if (vowels.includes(input[0])) {
      if (vowels.includes(input[input.length - 1])) {
        return matchCase(input, input + 'yay')
      } else {
        return matchCase(input, input + 'ay')
      }
    } else if (vowels.includes(input[1])) {
      return matchCase(input, input.slice(1) + input.slice(0, 1) + 'ay')
    } else {
      return matchCase(input, input.slice(2) + input.slice(0, 2) + 'ay')
    }
  })

  return changed.join('')
}

export function pigLatinify(text: string): string {
  if (!text) {
    return ''
  }
  if (!text.includes('{')) {
    return pigIt(text)
  }

  const DONT_PIG_REGEX =
    /\{trigger|Light|Dark|Water|Earth|Fire|Mind|Air|Metal|Stealth|Wither|Guard|Banner|Lifesteal|Armor|Dash|((\-|\+|)(\d+|X)*?(hp|pow|dmg))|((\-|\+|)(\d|X)\/(\-|\+|)(\d|X))|(card:(\d+))|((\-|\+|)(\d+|X*)([cm]))\}/

  let output = ''
  let acc: string[] = []
  for (const char of text) {
    acc.push(char)
    if (char === '{') {
      output += pigIt(acc.join(''))
      acc = []
    } else if (acc.join('') === 'trigger:') {
      output += acc.join('')
      acc = []
    } else if (char === '}') {
      const j = acc.join('')
      if (DONT_PIG_REGEX.test(j)) {
        output += j
      } else {
        if (output === '{trigger:') {
          output += pigIt(j)
        } else {
          output += j
        }
      }
      acc = []
    }
  }
  output += pigIt(acc.join(''))
  return output
}

export function pigLatinifyObject(node: any, stripNewlines: boolean) {
  for (const key of Object.keys(node)) {
    const child = node[key]

    if (typeof child === 'string') {
      node[key] = pigLatinify(
        stripNewlines
          ? child.replaceAll('\n', ' ').replaceAll('  ', ' ')
          : child
      )
    } else {
      pigLatinifyObject(child, stripNewlines)
    }
  }
}