import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'
import DeckPreviewComponent from './DeckPreviewComponent'

class DeckPreviewManager {
  reset() {
    this._dusted = 0
    this._returnToHand = 0
    this._summon = 0
    this._buffed = 0
    this._debuffed = 0
    this.dirty = true
  }
  hasAny() {
    return (
      this._dusted +
        this._returnToHand +
        this._summon +
        this._buffed +
        this._debuffed >
      0
    )
  }
  private _buffed: number = 0
  get buffed(): number {
    return this._buffed
  }
  set buffed(value: number) {
    if (this._buffed === value) {
      return
    }
    this.dirty = true
    this._buffed = value
  }
  private _debuffed: number = 0
  get debuffed(): number {
    return this._debuffed
  }
  set debuffed(value: number) {
    if (this._debuffed === value) {
      return
    }
    this.dirty = true
    this._debuffed = value
  }
  dirty: boolean = false
  private _dusted: number = 0
  get dusted(): number {
    return this._dusted
  }
  set dusted(value: number) {
    if (this._dusted === value) {
      return
    }
    this.dirty = true
    this._dusted = value
  }

  private _returnToHand: number = 0
  get returnToHand(): number {
    return this._returnToHand
  }
  set returnToHand(value: number) {
    if (this._returnToHand === value) {
      return
    }
    this.dirty = true
    this._returnToHand = value
  }

  private _summon: number = 0
  get summon(): number {
    return this._summon
  }
  set summon(value: number) {
    if (this._summon === value) {
      return
    }
    this.dirty = true
    this._summon = value
  }
  constructor() {
    //
  }
}

export default class DeckPreviewManagerComponent extends Component<DeckPreviewManager> {
  static entities = new TrackableCollection<Entity<Components>>(
    'DeckPreviewManager'
  )
  constructor() {
    super(new DeckPreviewManager())
  }

  onAttach(entity: Entity<Components>) {
    DeckPreviewManagerComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    DeckPreviewManagerComponent.entities.remove(entity)
  }

  update(entity: Entity<Components>) {
    if (this.value.dirty) {
      if (entity.has('deckPreview')) {
        entity.remove('deckPreview')
      }
      if (this.value.hasAny()) {
        entity.add(new DeckPreviewComponent())
      }
      this.value.dirty = false
    }
  }
}
