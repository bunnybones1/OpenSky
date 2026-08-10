import { ClampToEdgeWrapping, Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { safelyResetFlipY } from '~/utils/textureUtils'

export interface SplashTextures {
  splashBg: Texture
  splashFg: Texture
}

function getTextureUrls(tutorialLevel = 1) {
  // for tutorial 0 ( debug ), use tutorial 1 splash
  const level = tutorialLevel < 1 ? 1 : tutorialLevel
  const texturePaths: { [key in keyof SplashTextures]: string } = {
    splashBg: `game/splash/opaque/tutorial${level}-splash-bg.png`,
    splashFg: `game/splash/transparent/tutorial${level}-splash-fg.png`
  }
  return texturePaths
}

export async function loadSplashTextures(tutorialLevel: string) {
  const textures: SplashTextures = {} as any

  const levelNum = Number.parseInt(tutorialLevel, 10)
  const texturePaths = getTextureUrls(
    Number.isNaN(levelNum) || levelNum < 1 ? 1 : levelNum
  )

  const textureKeys = Object.keys(texturePaths) as Array<keyof SplashTextures>

  const texturePromises = textureKeys.reduce<{
    [key in keyof SplashTextures]: Promise<Texture>
  }>((acc, key) => {
    acc[key] = getAssetsManager()
      .load('texture', texturePaths[key], false, 2000)
      .then((res: Texture) => (textures[key] = res))
    return acc
  }, {} as any)

  await Promise.all(Object.values(texturePromises))

  for (const texture of [textures.splashFg, textures.splashBg]) {
    safelyResetFlipY(texture)
    texture.wrapS = ClampToEdgeWrapping
    texture.wrapT = ClampToEdgeWrapping
  }
  return textures
}
