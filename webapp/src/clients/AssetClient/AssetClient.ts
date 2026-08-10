import AssetHashManifest, {
  AssetsManifestTree,
  DummyAssetHashManifest
} from '@opensky/shared/AssetHashManifest'

import env from '~/env'
import { updateUIState } from '~/shared/state/ui/ui-state'

import { getAssetsUrlPrefix } from './helpers'

export class _AssetClient_DONT_USE_DIRECTLY {
  manifest: AssetHashManifest | undefined = undefined
  constructor() {
    if (env.ASSETS_MANIFEST_WEBAPP_HASH) {
      fetch(
        `${env.ASSETS_URL}/asset-manifests/assets-manifest.webapp.tree.${env.ASSETS_MANIFEST_WEBAPP_HASH}.json`
      )
        .then(async (res) => {
          const json = await res.json()
          this.manifest = new AssetHashManifest(
            getAssetsUrlPrefix(),
            json as AssetsManifestTree
          )
          updateUIState('isManifestLoaded', true)
        })
        .catch((error) => {
          console.error('FETCH MANIFEST ERROR => ', error)
        })
    } else {
      this.manifest = new DummyAssetHashManifest(getAssetsUrlPrefix())
      updateUIState('isManifestLoaded', true)
    }
  }
  public getAssetUrl(suffix: string) {
    if (this.manifest) {
      return this.manifest.getFullUrl(suffix)
    }
    return ''
  }
}
