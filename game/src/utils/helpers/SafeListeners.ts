import {
  ChangeCallback,
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'

import UpdateManager, { Updater } from '~/systems/UpdateManager'
import { ItemCallback, TrackableCollection } from '~/utils/TrackableCollection'

export default class SafeListeners {
  private _cleanups: Array<() => void> = []
  addCleanup(cleanup: () => void) {
    this._cleanups.push(cleanup)
  }

  listenToProperty<O, T extends keyof O>(
    obj: O,
    propName: T,
    onChange: ChangeCallback<O[T]>,
    firstOneForFree = true
  ) {
    listenToProperty(obj, propName, onChange, firstOneForFree)
    this.addCleanup(() => stopListeningToProperty(obj, propName, onChange))
  }

  listenForAdd<T>(
    collection: TrackableCollection<T>,
    cb: ItemCallback<T>,
    ignoreThisTime = false
  ) {
    collection.listenForAdd(cb, ignoreThisTime)
    this.addCleanup(() => collection.stopListeningForAdd(cb))
  }

  listenForRemove<T>(collection: TrackableCollection<T>, cb: ItemCallback<T>) {
    collection.listenForRemove(cb)
    this.addCleanup(() => collection.stopListeningForRemove(cb))
  }

  onRafUpdate(updater: Updater) {
    UpdateManager.register(updater)
    const cleanup = () => {
      UpdateManager.unregister(updater)
    }
    this.addCleanup(cleanup)
    return cleanup
  }

  cleanup() {
    for (const c of this._cleanups) {
      c()
    }
    this._cleanups.length = 0
  }
}
