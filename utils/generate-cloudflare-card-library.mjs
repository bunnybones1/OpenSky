#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDirectory = resolve(root, 'api/data/schema/migrations')
const outputPath = resolve(root, 'cloudflare/src/generated/card-library.json')

const cardClasses = ['STR', 'HRT', 'AGY', 'INT', 'WIS', 'TOK']
const cardElements = [
  'WATER',
  'FIRE',
  'EARTH',
  'AIR',
  'MIND',
  'METAL',
  'LIGHT',
  'DARK'
]
const cardTypes = ['UNIT', 'SPELL']
const cardSets = [
  'UNKNOWN',
  'CORE_SET',
  'CORE_EXPANSION',
  'CLASH_OF_INVENTORS',
  'HEXBOUND_INVASION',
  'STARTER_EXPANSION'
]

const skipSpace = (sql, start) => {
  let cursor = start
  while (/\s/.test(sql[cursor] ?? '')) cursor += 1
  return cursor
}

const parseValue = (sql, start) => {
  let cursor = skipSpace(sql, start)
  if (sql[cursor] !== "'") {
    const end = sql.slice(cursor).search(/[,)]/)
    if (end < 0) throw new Error(`unterminated value at byte ${cursor}`)
    const raw = sql.slice(cursor, cursor + end).trim()
    return { value: raw.toLowerCase() === 'null' ? null : raw, cursor: cursor + end }
  }

  cursor += 1
  let value = ''
  while (cursor < sql.length) {
    if (sql[cursor] !== "'") {
      value += sql[cursor]
      cursor += 1
      continue
    }
    if (sql[cursor + 1] === "'") {
      value += "'"
      cursor += 2
      continue
    }
    return { value, cursor: cursor + 1 }
  }
  throw new Error(`unterminated SQL string at byte ${start}`)
}

export const parseCardRows = sql => {
  const insert = sql.lastIndexOf('INSERT INTO cards')
  if (insert < 0) throw new Error('card INSERT statement not found')
  const values = sql.indexOf('VALUES', insert)
  if (values < 0) throw new Error('card VALUES clause not found')

  const rows = []
  let cursor = values + 'VALUES'.length
  while (cursor < sql.length) {
    cursor = skipSpace(sql, cursor)
    if (sql[cursor] === ';') break
    if (sql[cursor] === ',') {
      cursor += 1
      continue
    }
    if (sql[cursor] !== '(')
      throw new Error(`expected row at byte ${cursor}`)
    cursor += 1

    const row = []
    while (cursor < sql.length) {
      const parsed = parseValue(sql, cursor)
      row.push(parsed.value)
      cursor = skipSpace(sql, parsed.cursor)
      if (sql[cursor] === ')') {
        cursor += 1
        break
      }
      if (sql[cursor] !== ',')
        throw new Error(`expected field separator at byte ${cursor}`)
      cursor += 1
    }
    rows.push(row)
  }
  return rows
}

const requiredEnum = (values, raw, field, id) => {
  const value = values[Number(raw)]
  if (!value) throw new Error(`unknown ${field} ${raw} for card ${id}`)
  return value
}

const keywords = value => {
  const inner = String(value).replace(/^\{/, '').replace(/\}$/, '').trim()
  return inner ? inner.split(',').map(keyword => keyword.trim()) : []
}

export const cardsFromRows = rows =>
  rows
    .filter(row => row[13] === '0' && Number(row[5]) <= 4)
    .map(row => {
      if (row.length !== 18)
        throw new Error(`expected 18 columns for card ${row[0]}, got ${row.length}`)
      const id = Number(row[0])
      return {
        id,
        name: row[1],
        description: row[2],
        asset: row[4],
        class: requiredEnum(cardClasses, row[5], 'class', id),
        element: requiredEnum(cardElements, row[6], 'element', id),
        type: requiredEnum(cardTypes, row[7], 'type', id),
        manaCost: Number(row[8]),
        power: Number(row[9]),
        health: Number(row[10]),
        attachedSpellID: row[11] === null ? null : Number(row[11]),
        keywords: keywords(row[12]),
        status: 'PLAY',
        set: requiredEnum(cardSets, row[16], 'set', id),
        imageURL: {
          small: `https://assets.skyweaver.net/latest/full-cards/en/2x/${id}.webp`,
          medium: `https://assets.skyweaver.net/latest/full-cards/en/4x/${id}.webp`,
          large: `https://assets.skyweaver.net/latest/full-cards/en/6x/${id}.webp`
        },
        itemType: 'UNKNOWN',
        isNew: null,
        silverCardTokenId: 65_536 + id,
        goldCardTokenId: 131_072 + id
      }
    })
    .sort((left, right) => left.id - right.id)

const latestMigration = async () => {
  const names = (await readdir(migrationsDirectory))
    .filter(name => /^\d+_card_library\.sql$/.test(name))
    .sort()
  if (names.length === 0) throw new Error('no card-library migration found')
  return resolve(migrationsDirectory, names.at(-1))
}

export const generatedCardLibrary = async () => {
  const sourcePath = await latestMigration()
  const sql = await readFile(sourcePath, 'utf8')
  const cards = cardsFromRows(parseCardRows(sql))
  if (cards.length < 500)
    throw new Error(`refusing to generate an incomplete library of ${cards.length} cards`)
  return `${JSON.stringify(
    {
      source: relative(root, sourcePath),
      sourceSha256: createHash('sha256').update(sql).digest('hex'),
      cards
    },
    null,
    2
  )}\n`
}

const main = async () => {
  const generated = await generatedCardLibrary()
  if (process.argv.includes('--check')) {
    const current = await readFile(outputPath, 'utf8').catch(() => '')
    if (current !== generated) {
      throw new Error(
        `${relative(root, outputPath)} is stale; run pnpm generate:cloudflare:cards`
      )
    }
    const payload = JSON.parse(generated)
    console.log(
      `Cloudflare card library matches ${basename(payload.source)} (${payload.cards.length} cards)`
    )
    return
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, generated)
  const payload = JSON.parse(generated)
  console.log(`Generated ${payload.cards.length} cards at ${relative(root, outputPath)}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
