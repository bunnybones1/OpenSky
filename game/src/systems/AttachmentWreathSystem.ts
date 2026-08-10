import { TextureAssetName } from '@opensky/shared/assets'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'
import {
  Color,
  Material,
  Mesh,
  Object3D,
  RingBufferGeometry,
  Uniform,
  Vector3
} from 'three'

import { getAssetsManager } from '~/assets/index'
import { hues } from '~/colors/colorHues'
import { makeHSL } from '~/colors/utils'
import { Components } from '~/components'
import CharacterComponent from '~/components/CharacterComponent'
import HostingAttachmentComponent from '~/components/HostingAttachmentComponent'
import { RENDER_ORDERS, SIZE_RATIO_CARD_TO_ATTACHMENT } from '~/constants'
import { frontFacingAttachments } from '~/helpers/compoundCollections'
import { enchantNamesByCardId } from '~/helpers/enchantmentHelpers'
import { playSound } from '~/helpers/soundHelpers'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import SpellRingMeshMaterial from '~/materials/SpellRingMeshMaterial'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { getTempTexture } from '~/utils/tempTexture'

import { Easing } from './animation/Easing'
import { simpleTweener } from './animation/tweeners'

let __ringGeo: RingBufferGeometry | undefined
function __getRingGeometry() {
  if (!__ringGeo) {
    __ringGeo = new RingBufferGeometry(0.5, 1, 64, 1)
    const arr = __ringGeo.attributes.uv.array as Float32Array
    const thresh = arr.length * 0.5
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i > thresh ? 0 : 1
    }
  }
  return __ringGeo
}

const __white = new Color(0xffffff)
const __badEnchantColor = makeHSL(hues._01_coolRed, 1, 0.75)
const __goodEnchantColor = makeHSL(hues._13_coolBlue, 0.5, 0.6)
const __effectMeshPrescale = 0.015

function __getEnchantUniform(spellId: BaseCard): Uniform | undefined {
  const name = enchantNamesByCardId.get(spellId)
  if (name) {
    const textureName: TextureAssetName = `enchantment${name}` as const
    return getAssetsManager().getLazyTextureAssetUniform(textureName)
  } else {
    return
  }
}

function __getSpellColor(spellId: BaseCard) {
  const card = CardLibrary.get(spellId)!
  if (card.type === 'enchant') {
    return card.spellBehaviour === 'positive'
      ? __goodEnchantColor
      : __badEnchantColor
  } else {
    return __white
  }
}

function __getSpellSpeed(spellId: BaseCard) {
  const card = CardLibrary.get(spellId)!
  return card.spellBehaviour === 'positive' ? 2 : -2
}

const hostCharacters = CharacterComponent.entities.intersect(
  HostingAttachmentComponent.entities
)

export default class AttachmentWreathSystem extends System<Components> {
  private _registryEffectMeshesByHost = new Map<Entity<Components>, Object3D>()

  init() {
    hostCharacters.listenForAdd(entH => {
      const hosting = entH.get('hostingAttachment')
      const entA = hosting.entity
      if (!entA.has('cardInstance')) {
        //console.error('Failed to create attachment mesh for hidden card')
        return
      }
      const host = entA.get('cardInstance')
      const spellId = host.base
      if (enchantNamesByCardId.has(spellId)) {
        const enchantmentName = enchantNamesByCardId.get(spellId)!
        playSound('audioFxCommon', 'Enchantment' + enchantmentName + 'Attach')
      }
      const enchantUniform = __getEnchantUniform(spellId)
      const meshes: Mesh[] = []
      if (enchantUniform) {
        const mat = new BasicMapMeshMaterial(
          { map: getTempTexture(), supportOpacity: true },
          { opacity: 0, depthWrite: false }
        )
        mat.uniforms.mapTexture = enchantUniform
        const mesh = new Mesh(
          getSharedPlaneBufferGeometry(
            false,
            true,
            new Vector3(0, -0.38, 0.04),
            3.3
          ),
          mat
        )
        mesh.rotation.x += Math.PI * 0.5 + 0.001
        mesh.renderOrder = RENDER_ORDERS.highlight - 10
        meshes.push(mesh)
      }
      const spellColor = __getSpellColor(spellId)
      if (spellColor !== __white) {
        const mesh = new Mesh(
          __getRingGeometry(),
          new SpellRingMeshMaterial({
            color: spellColor,
            speed: __getSpellSpeed(spellId),
            opacity: 0
          })
        )
        mesh.position.y -= 0.04
        mesh.renderOrder = RENDER_ORDERS.highlight - 9
        mesh.rotation.x -= Math.PI * 0.5
        meshes.push(mesh)
      }
      if (meshes.length > 0) {
        const pivot: Object3D = new Object3D()
        pivot.scale.setScalar(__effectMeshPrescale)
        pivot.position.copy(hosting.offset)
        for (const mesh of meshes) {
          mesh.frustumCulled = false
          const scaleStart = mesh.scale.clone().multiplyScalar(0.6)
          const scaleEnd = mesh.scale.clone()
          mesh.scale.copy(scaleStart)
          const animVal = { value: 0 }
          const material = mesh.material as Material
          simpleTweener.to({
            description: 'add attachment ring',
            target: animVal,
            propertyGoals: {
              value: 1
            },
            onUpdate() {
              mesh.scale.lerpVectors(scaleStart, scaleEnd, animVal.value)
              material.opacity = animVal.value
            },
            duration: 600,
            easing: Easing.Quartic.Out
          })
          pivot.add(mesh)
        }

        entH.get('transform').add(pivot)
        this._registryEffectMeshesByHost.set(entH, pivot)
      }
    })

    hostCharacters.listenForRemove(entH => {
      const pivot = this._registryEffectMeshesByHost.get(entH)
      if (pivot) {
        for (const mesh of pivot.children) {
          if (mesh instanceof Mesh) {
            const scaleStart = mesh.scale.clone()
            const scaleEnd = mesh.scale.clone().multiplyScalar(0.6)
            const material = mesh.material as Material
            const animVal = { value: 1 }
            simpleTweener.to({
              description: 'remove attachment ring',
              target: animVal,
              propertyGoals: {
                value: 0
              },
              duration: 200,
              easing: Easing.Quartic.In,
              onUpdate() {
                mesh.scale.lerpVectors(scaleEnd, scaleStart, animVal.value)
                material.opacity = animVal.value
              },
              onComplete() {
                mesh.parent!.remove(mesh)
              }
            })
            this._registryEffectMeshesByHost.delete(entH)
          }
        }
      }
    })
  }

  update() {
    for (const attachedEntity of frontFacingAttachments.items) {
      this.handleAttachedEntity(attachedEntity)
    }
  }

  handleAttachedEntity(attachedEntity: Entity<Components>) {
    if (!attachedEntity.has('attachedTo')) {
      return
    }
    const attachment = attachedEntity.get('attachedTo')
    const hostEntity = attachment.entity
    if (
      attachment.active &&
      hostEntity.has('transform') &&
      hostEntity.has('hostingAttachment')
    ) {
      const attachmentHost = hostEntity.get('hostingAttachment')
      if (this._registryEffectMeshesByHost.has(hostEntity)) {
        const pivot = this._registryEffectMeshesByHost.get(hostEntity)!
        pivot.position.copy(attachmentHost.offset)
        for (const effectMesh of pivot.children) {
          if (effectMesh instanceof Mesh) {
            if (effectMesh.material instanceof SpellRingMeshMaterial) {
              const hasCharacter = hostEntity.has('character')
              effectMesh.material.state = hasCharacter
            }
          }
        }
        const ps = __effectMeshPrescale * SIZE_RATIO_CARD_TO_ATTACHMENT
        const s = ps * attachmentHost.scale
        pivot.scale.set(s, ps * 0.4, s)
      }
    }
  }
}
