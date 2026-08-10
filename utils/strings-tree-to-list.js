const [, , filepath, reverse] = process.argv

const fs = require('fs')

const csvPath = filepath.replace('.json', '.csv')
const rawTreeData = fs.readFileSync(filepath)
const treeData = JSON.parse(rawTreeData)
const csvValues = reverse ? fs.readFileSync(csvPath).toString().split('\n') : []

// const keywordsPath = filepath.slice(undefined, filepath.lastIndexOf("/")+1)+'keywords.csv'

console.log('csvValues: ', csvValues.length)

let index = 0

const TOKEN_NEW_LINE = '{%N}'
const TOKEN_NEW_LINE_SMALL = '{%n}'
const TOKEN_QUOTE = '{%Q}'
const TOKEN_QUOTE_SMALL = '{%q}'

const keywords = []

function traverse(node, parent, key) {
  switch (typeof node) {
    case 'string':
      // Find and store keywords
      let arr = node.match(/\{[^}]*\}/)
      while(arr){
        if(!keywords.includes(arr[0])){
          keywords.push(arr[0])
        }
        arr = arr.input.slice(arr.index+arr[0].length).match(/\{[^}]*\}/)
      }
      if (reverse) {
        parent[key] = csvValues[index]
          .replaceAll(TOKEN_NEW_LINE, '\n')
          .replaceAll(TOKEN_NEW_LINE_SMALL, '\n')
          .replaceAll(TOKEN_QUOTE, '"')
          .replaceAll(TOKEN_QUOTE_SMALL, '"')
          .replaceAll('#VALUE!', '')
      
        for (let i = 0; i < keywords.length; i++) {
          parent[key] = parent[key].replaceAll(`{%${i}}`, keywords[i])
        }
      } else {
        
        // Replace keywords, quotes and linebreaks
        for (const word of keywords) {
          node = node.replaceAll(word, `{%${keywords.indexOf(word)}}`)
        }
        node = node.replaceAll('\n', TOKEN_NEW_LINE).replaceAll('"', TOKEN_QUOTE)
        csvValues.push(node)
      }
      index++
      break
    case 'object':
      if (node instanceof Array) {
        for (let i = 0; i < node.length; i++) {
          const child = node[i]
          traverse(child, node, i)
        }
      } else {
        for (const key of Object.keys(node)) {
          traverse(node[key], node, key)
        }
      }
      break
  }
}

traverse(treeData)

if (reverse) {
  console.log('CSV -> JSON')
  fs.writeFileSync(filepath, JSON.stringify(treeData, undefined, 2))
  console.log(index + ' etries written to tree')
} else {
  console.log('JSON -> CSV')
  fs.writeFileSync(csvPath, csvValues.join('\n'))
  // fs.writeFileSync(keywordsPath, keywords.join('\n'))
  console.log(csvValues.length + ' lines written to csv')
}

console.log('done', csvPath)
