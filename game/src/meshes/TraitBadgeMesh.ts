import { i18n } from '@opensky/language-manager'
import { Trait } from '@skyweaver/state-metadata'
import { BufferGeometry, Mesh } from 'three'

import { getAssetsManager } from '~/assets/index'
import { traitColors } from '~/constants'
import BasicWidthBrightnessMeshMaterial from '~/materials/BasicWidthBrightnessMeshMaterial'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { addText } from '~/utils/textUtils'
import { FailedToFindObject3DByName } from '~/utils/threeUtils'

const __traitIcons: { [K in Trait]: string | undefined } = {
  guard: 'trait-badge-guard',
  stealth: 'trait-badge-stealth',
  lifesteal: 'trait-badge-lifesteal',
  wither: 'trait-badge-wither',
  banner: 'trait-badge-banner',
  armor: 'trait-badge-armor',
  dash: 'trait-badge-dash'
}

const __fallbackTraitIcon = 'trait-badge'
const __missingTraitIconWarnings = new Set<string>()

function __fetchTraitIcon(name: string) {
  try {
    const obj = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesGraphical',
      name,
      undefined,
      true
    )
    if (obj instanceof Mesh) {
      return obj
    }
  } catch (error) {
    if (!(error instanceof FailedToFindObject3DByName)) {
      throw error
    }
  }
  return undefined
}

function __getTraitIcon(et: Trait) {
  const objName = __traitIcons[et]
  if (objName) {
    const obj = __fetchTraitIcon(objName)
    if (obj) {
      return obj
    }
    if (!__missingTraitIconWarnings.has(objName)) {
      console.warn(
        `Missing trait badge asset "${objName}", falling back to "${__fallbackTraitIcon}".`
      )
      __missingTraitIconWarnings.add(objName)
    }
  }
  return __fetchTraitIcon(__fallbackTraitIcon)
}

const BASIC_WIDTH = 0.01

export default class TraitBadgeMesh extends Mesh<
  BufferGeometry,
  BasicWidthBrightnessMeshMaterial
> {
  get width() {
    return this._width
  }
  get label() {
    return this._label
  }
  onMeasurementsUpdated?: () => void | undefined
  private _width: number
  private _label: TextMesh | undefined
  constructor(trait: Trait, useLabel = false) {
    const kw = __getTraitIcon(trait)
    const mat = new BasicWidthBrightnessMeshMaterial({
      color: traitColors[trait]
    })
    if (!kw) {
      console.warn(`Trait Badge has no asset for keyword ${trait}`)
      super(new BufferGeometry(), mat)
      this.material = mat
      this._width = BASIC_WIDTH
      if (useLabel) {
        const label = addText(
          this,
          i18n.t(`cardMeta:traits.uppercase.${trait}`),
          { ...textOptions.cardTraitBadgeLabel, color: traitColors[trait] },
          0.01,
          0,
          0.001
        )
        this._label = label
        label.position.set(0.007, 0.0004, 0.0008)
        const updateLayout = () => {
          const w = label.width + 0.0035
          this._width = BASIC_WIDTH + w
          this.material.growWidth = w
          if (this.onMeasurementsUpdated) {
            this.onMeasurementsUpdated()
          }
        }
        updateLayout()
        label.onMeasurementsUpdated = updateLayout
      } else {
        this.material.growWidth = 0
      }
      return
    }
    super(kw.geometry, mat)
    this.material = mat
    this._width = BASIC_WIDTH
    if (useLabel) {
      const label = addText(
        this,
        i18n.t(`cardMeta:traits.uppercase.${trait}`),
        { ...textOptions.cardTraitBadgeLabel, color: traitColors[trait] },
        0.01,
        0,
        0.001
      )
      this._label = label
      label.position.set(0.007, 0.0004, 0.0008)
      const updateLayout = () => {
        const w = label.width + 0.0035
        this._width = BASIC_WIDTH + w
        this.material.growWidth = w
        if (this.onMeasurementsUpdated) {
          this.onMeasurementsUpdated()
        }
      }
      updateLayout()
      label.onMeasurementsUpdated = updateLayout
    } else {
      this.material.growWidth = 0
    }
  }
}
