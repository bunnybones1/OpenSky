import * as path from 'path'
import {
  joinParsedDescription,
  getParsedCardDescription
} from '@opensky/parse-card-description'
import { createHash } from 'crypto'
import { i18nInit, i18n, translate } from '@opensky/language-manager'
import {
  Card,
  cardPropsThatCanBeChangedWithoutCausingPatchNotesSection
} from '@opensky/design-data/schema'
import {
  FullDataDiff,
  getSheetDiffWithFullData
} from '@opensky/design-data/scripts/diff'
import { getCardsAsObject } from '@opensky/design-data/scripts/data'

async function main() {
  await i18nInit({ defaultNS: 'translation', lng: 'en', version: '' })
  // Markdown Tab
  const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'

  const SECRET_SALT = "i'm a little scamp"

  function secretKey(patchNumber: string) {
    const seed = patchNumber + SECRET_SALT
    const hash = createHash('md5').update(seed).digest('hex').slice(0, 6)
    return hash
  }

  function getImagesDir(patchNumber: string): string {
    return `images/patch/${patchNumber}-${secretKey(patchNumber)}`
  }

  function urlForCard(patch: string, cardID: string): string {
    return `https://skyweaver.net/${getImagesDir(patch)}/${cardID}.webp`
  }

  function imageForCard(patch: string, cardID: string, card: Card): string {
    const altText = `${card.name} - ${joinParsedDescription(
      getParsedCardDescription(
        card.text ?? '',
        c => translate.card.name(c as 'Dummy'),
        i18n.t
      )
    )
      .replace('\n', ' ')
      .replace('\r', ' ')}`
    return `<img src="${urlForCard(patch, cardID)}" alt="${altText}" />`
  }

  async function generatePatchNotes(
    patch: string,
    diff: FullDataDiff<'cards'>
  ): Promise<string> {
    const fullCardLib = await getCardsAsObject()
    const added = Object.entries(diff)
      .filter(([id, changes]) => {
        if (!changes) {
          return false
        }
        return (
          Object.values(changes).every(c => c.new && !c.old) &&
          fullCardLib[id].prism !== 'tut'
        )
      })
      .reduce(
        (md, [id]) => [
          ...md,
          `
    <h2>
    ${fullCardLib[id].name} (<em>${id}</em>)
    </h2>
    <p>${imageForCard(patch, id, fullCardLib[id])}</p>
    <p>comments_go_here</p>
    <br />`
        ],
        []
      )

    const changed = Object.entries(diff)
      .filter(([id, changes]) => {
        if (!changes) {
          return false
        }
        const keysWeCareAbout = Object.keys(changes).filter(
          c =>
            !(
              cardPropsThatCanBeChangedWithoutCausingPatchNotesSection as readonly string[]
            ).includes(c)
        )
        if (!keysWeCareAbout.length) {
          return false
        }
        return (
          fullCardLib[id].prism !== 'tut'
        )
      })
      .reduce((changedCards, [id, changes]) => {
        if (!changes) {
          throw new Error('unreachable')
        }
        const card = fullCardLib[id]
        const newText =
          `
        <h2>
        ${
          changes.name ? `${changes.name.old} ➞ ${changes.name.new}` : card.name
        } (<em>${id}</em>)
        </h2>
        <p>${imageForCard(patch, id, card)}</p>
        ` +
          (
            Object.entries(changes) as Array<
              [keyof Card, { old: any; new: any }]
            >
          )
            .filter(
              ([key]) =>
                !(
                  cardPropsThatCanBeChangedWithoutCausingPatchNotesSection as readonly string[]
                ).includes(key)
            )
            .reduce((text, [key, change]) => {
              text += `
            <h3>${getKeyName(key as 'name')}:</h3>
              <p>
                <code>${
                  isEmpty(change.old) ? 'None' : getKey(key, JSON.parse(change.old))
                }</code>
                ${
                  key === 'text'
                    ? '<br /><strong>&darr;</strong><br />'
                    : '<strong>&rarr;</strong>'
                }
                <code>${
                  isEmpty(change.new) ? 'None' : getKey(key, JSON.parse(change.new))
                }</code>
            </p>`
              return text
            }, '') +
          '<p>comments_go_here</p><hr />'
        return [...changedCards, newText]
      }, [])
    const removed = Object.entries(diff)
      .filter(([id, changes]) => {
        if (!changes) {
          return false
        }
        return (
          Object.values(changes ?? {}).every(c => !c.new && c.old) &&
          fullCardLib[id].prism !== 'tut'
        )
      })
      .reduce(
        (md, [id, card]) => [
          ...md,
          `<p>${tab}<strong>${card?.name?.old}</strong> (<em>${id}</em>)</p>`
        ],
        []
      )

    return `
  <p>
    <em>
      put_intro_notes_here
    </em>
  </p>
  <br />
  <br />
  <div style="max-width: 740px; margin: 0 auto;">
  ${
    changed.length
      ? `<button class="accordion">${changed.length} Modified Cards</button>
      <div class="panel">
        ${changed.join('\n')}
      </div>`
      : ''
  }

  ${
    added.length
      ? `<button class="accordion">${added.length} New Cards</button>
      <div class="panel">
        ${added.join('\n')}
      </div>`
      : ''
  }

  ${
    removed.length
      ? `<button class="accordion">${removed.length} Removed Cards</button>
      <div class="panel">
        ${removed.join('\n')}
      </div>`
      : ''
  }
  </div>
`
  }

  function getKeyName(key: keyof Card): string {
    switch (key) {
      case 'attachment':
        return 'Spell'
      case 'text':
        return 'Text'
      default:
        return key[0].toUpperCase() + key.slice(1)
    }
  }

  function getKey<K extends keyof Card>(key: K, val: Card[K]): string {
    switch (key) {
      case 'attachment': {
        return translate.card.name(val as 'Dummy')
      }
      case 'text': {
        return joinParsedDescription(
          getParsedCardDescription(
            val as string,
            c => translate.card.name(c as 'Dummy'),
            i18n.t
          )
        )
          .replace('\n', ' ')
          .replace('\r', ' ')
      }
      case 'traits': {
        return ((val ?? []) as Array<string>).join(', ')
      }
      default:
        return `${val}`
    }
  }

  function isEmpty(type: any): boolean {
    return typeof type === 'number'
      ? false
      : Array.isArray(type)
      ? type.length === 0
      : !type
  }

  const [_, __, patch, generateImages] = process.argv
  if (!patch || patch.length === 0) {
    console.error('1st argument must be patch number! e.g. `131`')
    process.exit(1)
  }
  const diff = await getSheetDiffWithFullData(
    'origin/release',
    'cards'
  )
  const patchNotes = await generatePatchNotes(patch, diff)
  if (generateImages === 'images') {
    const horizonGamesFolder = path.join(__dirname, '../../../../')
    const patchImagesFolder = path.join(
      horizonGamesFolder,
      `www-skyweaver/static/${getImagesDir(patch)}/`
    )
    console.log(`[[ -d ${patchImagesFolder} ]] || mkdir ${patchImagesFolder}`)
    const assetsFolder = path.join(
      horizonGamesFolder,
      'OpenSky-assets/webapp/cards/full-cards/en/4x'
    )
    const imagesRegex = /\d{1,6}\.webp/gm
    let m
    while ((m = imagesRegex.exec(patchNotes)) !== null) {
      const id = m[0].replace('.webp', '')
      console.log(
        `cp ${path.join(assetsFolder, `${id}-silver.webp`)} ${path.join(
          patchImagesFolder,
          `${id}.webp`
        )}`
      )
    }
  } else {
    console.log(patchNotes)
  }
}

main().then(() => process.exit(0))