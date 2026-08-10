import { useMemo } from 'react'

import { TAG_ART } from '~/shared/constants/tag-art'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

export const useAccountTagArtUrl = (tagArtID?: string) => {
  const { getAssetUrl } = useGetAssetContext()

  return useMemo(() => {
    if (!tagArtID || !getAssetUrl) return

    const tagArt = TAG_ART.get(tagArtID)

    if (!!tagArt) {
      return { parsed: getAssetUrl(tagArt.artUrl), raw: tagArt.artUrl }
    } else {
      return null
    }
  }, [getAssetUrl, tagArtID])
}
