import {
  i18n,
  i18nInit,
  isSupportedLanguage,
  SupportedLanguage,
  supportedLanguages,
  translate
} from '@opensky/language-manager'
import {
  CardLibrary,
  isElement,
  isPrism,
  Prism,
  Rarity,
  Type
} from '@skyweaver/state-metadata'

import { elementsArr, prismsArr, traitsArr } from '~/constants'
import { debugAccounts } from '~/debugAccounts'
import env from '~/env'
import { i18nextDummyCardBackend } from '~/helpers/i18nDummyCardBackend'
import { __prismOrder, RarityStrings } from '~/helpers/typeHelpers'
import queryParams from '~/queryParams'
import renderer from '~/renderer'
import { changeUrlParamWithoutReload } from '~/utils/location'
import { capitalize } from '~/utils/stringUtils'

import { createCardCreator } from './cardCreator'
const POLY_PRISMS = [
  'str',
  'agy',
  'wis',
  'int',
  'hrt',
  'agy,int',
  'agy,wis',
  'hrt,agy',
  'hrt,int',
  'hrt,wis',
  'int,wis',
  'str,agy',
  'str,hrt',
  'str,int',
  'str,wis'
]
async function cardTextPreview() {
  await i18nInit({
    defaultNS: 'game',
    lng:
      queryParams.language && isSupportedLanguage(queryParams.language)
        ? queryParams.language
        : 'en',
    backends: [i18nextDummyCardBackend],
    version: env.GITCOMMIT
  })
  const cardCreator = await createCardCreator([553, 850])
  // Set up card creator controls
  const preview = document.createElement('div')
  preview.id = 'card-preview'
  preview.appendChild(renderer.domElement)
  document.body.appendChild(preview)

  const controls = document.createElement('div')
  document.body.appendChild(controls)

  controls.id = 'card-creator'
  controls.innerHTML = `
  <h1>OpenSky Card Creator!</h1>
  <label for="lang">Language (reload after changing):</label>
  <select name="lang" id="lang" onchange="this.dataset.chosen = this.value;" data-chosen="en">
    ${supportedLanguages
      .slice()
      .sort(
        (a, b) =>
          Number(b === queryParams.language) -
          Number(a === queryParams.language)
      )
      .map(type => `<option value="${type}">${type}</option>`)
      .join('\n')}
  </select>

  <br>

  <label for="card-name">Name:</label>
  <input type="text" name="card-name" id="card-name">

  <br>

  <label for="card-text">Description:</label>
  <textarea name="card-text" id="card-text"></textarea>
  <br>

  <label for="card-type">Type:</label>
  <select name="card-type" id="card-type" onchange="this.dataset.chosen = this.value;" data-chosen="Unit">
    ${['Unit', 'Spell', 'Enchant', 'Hero']
      .map(type => `<option value="${type}">${type}</option>`)
      .join('\n')}
  </select>

  <br>
  <br>
  <div id="prism">
    <label for="card-prism">Prism:</label>
    <select name="card-prism" id="card-prism">
    <option value="None">None</option>
      ${prismsArr
        .map(prism => `<option value="${prism}">${prism}</option>`)
        .join('\n')}
    </select>
  <br>
  </div>

  <div id="hero"> 
    <label for="card-prism-hero">Prisms:</label>
    <select name="card-prism-hero" id="card-prism-hero">
    <option value="str">None</option>
      ${POLY_PRISMS.map(
        prism => `<option value="${prism}">${prism}</option>`
      ).join('\n')}
    </select>
    <br>
  </div>

  <div id="element">
    <label for="card-element">Element:</label>
    <select name="card-element" id="card-element">
      ${elementsArr
        .map(
          (element, index) =>
            `<option value="${element}">${capitalize(
              element.replace('sky', 'No Element')
            )}</option>${index % 2 == 0 ? '<br>' : ''}`
        )
        .join('\n')}
    </select>
  </div>
  <br>

  <label>Traits:</label>

  <br>
  ${traitsArr
    .map(
      trait => `
      <label for="${trait}-check">${trait}</label>
      <input type="checkbox" id="${trait}-check" name="${trait}-check">
      `
    )
    .join('\n')}

  <br>
  
    
  <div id="character">
    <label for="enable-character">Show on field?</label>
    <input type="checkbox" id="enable-character" name="enable-character">
    <br>
  </div>

  <label for="card-cost">Cost:</label>
  <input type="text" name="card-cost" id="card-cost" pattern="[0-9X]" title="Enter a number or X" value="${
    cardCreator.metadata.cost
  }">

  <br>

  <label for="card-power">Power:</label>
  <input type="number" name="card-power" id="card-power" value="${
    cardCreator.metadata.power
  }">

  <br>

  <label for="card-health">Health:</label>
  <input type="number" name="card-health" id="card-health" value="${
    cardCreator.metadata.health
  }">

  <br>

  <label for="card-bg">Background:</label>
  <select name="card-bg" id="card-bg">
    ${[...cardCreator.artOptions.backgrounds.values()]
      .sort()
      .map(
        bg =>
          `<option value="${bg}">${capitalize(
            bg.replace('bg-', '').replace('-', ' ')
          )}</option>`
      )
      .join('\n')}
  </select>

  <br>
  <div id="card-bg-art-upload-div">
  <br>
  <label for="card-bg-art-upload">Upload BG art:</label>
  <input type="file" id="card-bg-art-upload" accept=".png,.jpg,.jpeg,.gif">

  <br>
  </div>
  <br>

  <label for="card-art">Art:</label>
  <select name="card-art" id="card-art">
    ${[
      ...cardCreator.artOptions.units.values(),
      ...cardCreator.artOptions.spells.values()
    ]
      .map(
        art =>
          `<option value="${art}">${translate.card.name(
            [...CardLibrary.entries()].find(
              ([_, card]) => card.artSlug === art
            )![0]
          )}</option>`
      )
      .join('\n')}
      </select>
  <br>
  <label for="card-art-upload">Upload art:</label>
  <input type="file" id="card-art-upload" accept=".png,.jpg,.jpeg,.gif">
  <p>Ideal Unit Resolution is 648x1092, but any 54:91 aspect ratio image will work.</p>
  <p>Ideal Spell & Enchant Resolution is 648x648, but any 1:1 aspect ratio image will work.</p>

  <br>

  

  <label for="card-rarity">Rarity:</label>
  <select name="card-rarity" id="card-rarity">
    ${RarityStrings.map(
      type => `<option value="${type}">${capitalize(type)}</option>`
    ).join('\n')}
  </select>

  <br>

  <label for="enable-attachment">Attachment?</label>
  <input type="checkbox" id="enable-attachment" name="enable-attachment">
  
  <br>
  
  <div id="attachment">
    <label for="attach-type">Attachment Type:</label>
    <select name="attach-type" id="attach-type">
      ${['Spell', 'Enchant']
        .map(type => `<option value="${type}">${type}</option>`)
        .join('\n')}
    </select>

    <br>

    <label for="attach-cost">Cost:</label>
    <input type="text" name="attach-cost" id="attach-cost" pattern="[0-9X]" title="Enter a number or X" value="${
      cardCreator.attachMetadata.cost
    }">

    <br>

    <label for="attach-art">Art:</label>
    <select name="attach-art" id="attach-art">
      ${[...cardCreator.artOptions.spells.values()]
        .map(
          art =>
            `<option value="${art}">${translate.card.name(
              [...CardLibrary.entries()].find(
                ([_, card]) => card.artSlug === art
              )![0]
            )}</option>`
        )
        .join('\n')}
        </select>
    <br>
    <label for="attach-art-upload">Upload art:</label>
    <input type="file" id="attach-art-upload" accept=".png,.jpg,.jpeg,.gif">
    <p>Ideal Spell & Enchant Resolution is 648x648, but any 1:1 aspect ratio image will work.</p>

  </div>

  <button id="download">Download Card Image</button>
  `
  wire<HTMLInputElement>('card-name', el => {
    cardCreator.metadata.name = el.value
    cardCreator.refresh()
  })

  wire<HTMLTextAreaElement>('card-text', el => {
    cardCreator.metadata.description = el.value
    cardCreator.refresh()
  })

  wire<HTMLSelectElement>('card-prism', el => {
    if (isPrism(el.value)) {
      cardCreator.metadata.prism = el.value
      cardCreator.refresh()
    }
  })
  wire<HTMLSelectElement>('card-prism-hero', el => {
    const prisms = el.value.split(',') as Prism[]
    const sortedPrisms = prisms.sort(
      (a, b) => __prismOrder.indexOf(a) - __prismOrder.indexOf(b)
    )
    debugAccounts[0].prisms = sortedPrisms
    debugAccounts[1].prisms = sortedPrisms

    cardCreator.refresh()
  })

  wire<HTMLSelectElement>('card-element', el => {
    if (isElement(el.value)) {
      cardCreator.metadata.element = el.value
      cardCreator.refresh()
    }
  })

  for (const trait of traitsArr) {
    wire<HTMLInputElement>(`${trait}-check`, el => {
      if (el.checked) {
        cardCreator.metadata.traits.push(trait)
      } else {
        cardCreator.metadata.traits = cardCreator.metadata.traits.filter(
          k => k !== trait
        )
      }
      cardCreator.refresh()
    })
  }

  wire<HTMLSelectElement>('lang', async lang => {
    changeUrlParamWithoutReload('language', lang.value as SupportedLanguage)
    await i18n.changeLanguage(lang.value as SupportedLanguage)
  })

  wire<HTMLSelectElement>('card-type', el => {
    cardCreator.metadata.type = el.value as Type
    const art = document.getElementById('card-art') as HTMLSelectElement
    let valid = 0
    if (el.value === 'Hero') {
      cardCreator.metadata.element = 'sky'
    }
    Array.prototype.forEach.call(
      art.options,
      (option: HTMLOptionElement, index: number) => {
        option.disabled = option.hidden =
          (cardCreator.metadata.type === 'unit') !==
          option.value.includes('unit')

        if (!option.disabled) {
          valid = index
        }
      }
    )

    art.selectedIndex = valid

    cardCreator.refresh()
  })

  wire<HTMLInputElement>('enable-character', el => {
    cardCreator.isOnField = el.checked
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('card-cost', el => {
    cardCreator.metadata.cost =
      `${Number.parseInt(el.value, 10)}` === el.value.trim()
        ? Number.parseInt(el.value, 10)
        : el.value === 'no' || el.value === 'X'
        ? el.value
        : 'no'
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('card-power', el => {
    cardCreator.metadata.power = el.value.length
      ? Number.parseInt(el.value, 10)
      : undefined
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('card-health', el => {
    cardCreator.metadata.health = el.value.length
      ? Number.parseInt(el.value, 10)
      : undefined
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('card-art', el => {
    cardCreator.metadata.artSlug = el.value
    cardCreator.refresh()
  })
  let lastURL: null | string = null
  ;(
    document.getElementById('card-art-upload')! as HTMLInputElement
  ).addEventListener('change', function () {
    const file = this.files?.[0]
    if (!file) {
      return
    }
    const url = URL.createObjectURL(file)
    if (lastURL) {
      URL.revokeObjectURL(lastURL)
    }
    lastURL = url
    cardCreator.metadata.artSlug = url
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('card-bg', el => {
    cardCreator.metadata.backgroundArtSlug = el.value
    cardCreator.refresh()
  })
  let lastBGURL: null | string = null
  ;(
    document.getElementById('card-bg-art-upload')! as HTMLInputElement
  ).addEventListener('change', function () {
    const file = this.files?.[0]
    if (!file) {
      return
    }
    const url = URL.createObjectURL(file)
    if (lastBGURL) {
      URL.revokeObjectURL(lastBGURL)
    }
    lastBGURL = url
    cardCreator.metadata.backgroundArtSlug = url
    cardCreator.refresh()
  })
  wire<HTMLInputElement>('card-rarity', el => {
    cardCreator.rarity = el.value as Rarity
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('enable-attachment', el => {
    cardCreator.attachEnabled = el.checked
    cardCreator.refresh()
  })

  wire<HTMLSelectElement>('attach-type', el => {
    cardCreator.attachMetadata.type = el.value as Type
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('attach-cost', el => {
    cardCreator.attachMetadata.cost =
      `${Number.parseInt(el.value, 10)}` === el.value.trim()
        ? Number.parseInt(el.value, 10)
        : el.value === 'no' || el.value === 'X'
        ? el.value
        : 'no'
    cardCreator.refresh()
  })

  wire<HTMLInputElement>('attach-art', el => {
    cardCreator.attachMetadata.artSlug = el.value
    cardCreator.refresh()
  })
  let lastAttachURL: null | string = null
  ;(
    document.getElementById('attach-art-upload')! as HTMLInputElement
  ).addEventListener('change', function () {
    const file = this.files?.[0]
    if (!file) {
      return
    }
    const url = URL.createObjectURL(file)
    if (lastAttachURL) {
      URL.revokeObjectURL(lastAttachURL)
    }
    lastAttachURL = url
    cardCreator.attachMetadata.artSlug = url
    console.log(cardCreator.attachMetadata.artSlug)
    cardCreator.refresh()
  })

  document.getElementById('download')!.addEventListener('click', () => {
    cardCreator.render()
    const data = renderer.domElement.toDataURL()
    const a = document.createElement('a')
    a.href = data.replace('image/png', 'image/octet-stream')
    a.download = `${cardCreator.metadata.name.replace(' ', '_')}.png`
    console.log(a)
    a.click()
  })

  // styling! :)

  const style = document.createElement('style')
  style.innerHTML = `
  * {
    font-size: 16pt;
  }

  h1 {
    font-size: 32pt;
  }

  #card-preview, #card-creator {
    width: 50vw;
    height: 100vh;
  }

  #card-preview {
    float: left;
    text-align: center;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain;
    overflow: hidden;
  }


  #card-creator {
    float: right;
    background: white;
    padding: 8px;
    overflow-y: scroll;
  }

  label {
    display: inline-block;
    width: 180px;
    text-align: right;
    font-weight: bold;
  }

  #attachment {
    display: none;
  }

  #enable-attachment:checked ~ #attachment {
    display: block;
  }

  #character {
    display: none;
  }

  #hero {
    display: none;
  }

  #prism {
    display: none;
  }

  #element {
    display: none;
  }

  #card-bg-art-upload-div {
    display: none;
  }
  #card-type[data-chosen]:not([data-chosen='Hero']) ~ #element {
    display: block;
  }
  #card-type[data-chosen="Hero"] ~ #card-bg-art-upload-div {
    display: block;
  }
  #card-type[data-chosen="Unit"] ~ #character {
    display: block;
  }
  #card-type[data-chosen="Hero"] ~ #character {
    display: block;
  }
  #card-type[data-chosen="Hero"] ~ #hero {
    display: block;
  }
  #card-type[data-chosen="Unit"] ~ #prism {
    display: block;
  }
  `
  document.head.appendChild(style)
}

function wire<T extends HTMLElement>(
  element: string,
  onChange: (element: T) => void,
  firstOneForFree = true
) {
  const el = document.getElementById(element)!
  if (firstOneForFree) {
    onChange(el as T)
  }
  return el.addEventListener('input', function () {
    onChange(this as T)
  })
}

export const test = cardTextPreview
