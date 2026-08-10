import { getLast } from '@opensky/shared/utils/arrayUtils'

import { BUTTON_HEIGHT, SLIDER_MARGINS } from '~/constants'
import { Debuggable, debuggables } from '~/debug/debugRegistry'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { goBackToWebapp } from '~/scenes/ui/helpers'
import { createNiceModal } from '~/utils/createNiceModal'
import { changeUrlParamAndReload } from '~/utils/location'
import NiceMethod from '~/utils/NiceMethod'
import { createCloseDebugOverlay } from '~/utils/ui'

import { BasicTestBed } from './BasicTestBed'
import type { BaseTestScene } from './helpers/scenes/BaseTestScene'

if (import.meta.hot) {
  function handleTestHMR(mod: any) {
    const imhd = import.meta.hot?.data
    const lastTestClassName = imhd.lastTestName as string
    const lastTestPath = imhd.lastPath as string
    if (mod) {
      const className = mod.scene.prototype.constructor.name
      if (className === lastTestClassName) {
        setTestByPath(lastTestPath, () => mod)
        runTestByPath(lastTestPath)
      }
      // testLibrary.graphics.quadraticCurveMeshInHierarchy = () => newFoo
      // }
      // debugger
    }
  }
  import.meta.hot.accept(
    './helpers/scenes/TestAnimatedBoolScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestAnimatedTextScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestAttributionLinesScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestBooleanMeshesScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestBoundingBoxesScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestButtonsScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestCacheInfoScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestCardGradeDeckVisualsScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestClipSpaceCardScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestClipSpaceScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestCuratedMeshSpriteAnimationScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestDeckBreakdownUIScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestDeckSidebarUIScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestEaseScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestElementColorsScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestErrorScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestFireworksScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestGeometryEmitterBaseScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestHighlightOverlayScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestIconsScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestImageToMeshAlgoScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestInfoBoxesScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestInGameAnalyticsScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestLanguageLookup', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestLightCacheScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestLiveObjectScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestMagicRibbonsScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestMagicSoundsScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestManaVialScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestMaterialFogScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestMeshEffectsScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestMeshSpriteAnimationBattlegroundScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestMeshSpriteAnimationPaletteScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestMeshSpriteAnimationScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestMipMapsScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestParticlesBaseScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestProgressBarContinuousScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestProgressBarSegmentedScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestProgressLineScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestQuadraticCurveMeshInHierarchyScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestQuadraticCurveMeshScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestRankBarScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestReconnectingScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestRenderOrderDeckSidebarUIScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestReplay', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestRewardCardIconsScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestRibbonSmokeScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestRingGeometryScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestScrollingScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestScrollView', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestSettingsButton', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestSkyTagScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestSparkRibbonsScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestSparksMoreScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestSparksScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestSplashScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestStarterDeckScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestTiltingParallaxScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestTimerScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestToolTipsScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestTraitIconsScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestTutorialTitleScene',
    handleTestHMR
  )
  import.meta.hot.accept(
    './helpers/scenes/TestUI2DAdvancedScene',
    handleTestHMR
  )
  import.meta.hot.accept('./helpers/scenes/TestUI2DScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestUIIconsScene', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestVS', handleTestHMR)
  import.meta.hot.accept('./helpers/scenes/TestXPBarScene', handleTestHMR)
  import.meta.hot.accept(
    './helpers/scenes/TestFakeCylinderGlowScene',
    handleTestHMR
  )
}

type RunnableTest =
  | { scene: new () => BaseTestScene; showDebugMenu?: false }
  | { test: () => any }

export function runTest(test: RunnableTest) {
  if ('scene' in test) {
    if (import.meta.hot) {
      import.meta.hot.data.lastTestName = test.scene.prototype.constructor.name
    }
    sceneTest(test.scene, test.showDebugMenu)
  } else {
    test.test()
  }
}

type TestLibrary =
  | (() => Promise<RunnableTest>)
  | {
      [key: string]: TestLibrary
    }

export const testLibrary = {
  exittestmode: () =>
    Promise.resolve({ test: () => changeUrlParamAndReload('test', '') }),
  exitToWebapp: () => Promise.resolve({ test: () => goBackToWebapp() }),
  audio: {
    magicSounds: () => import('./helpers/scenes/TestMagicSoundsScene.js')
  },
  sandbox: () => import('./sandbox.js'),
  draftMockup: () => import('./draftMockup/index.js'),
  tiltingIsland: () => import('./tiltingIsland.js'),
  cardViewer: () => import('./cardViewer.js'),
  cardCarousel: () => import('./cardCarousel.js'),
  characterCarousel: () =>
    import('./cardCarousel.js').then(c => ({ test: () => c.test(true) })),
  heroViewer: () => import('./heroViewer.js'),
  cardTextPreview: () => import('./cardTextPreview.js'),
  translationPreview: () => import('./translationPreview.js'),
  cardCreator: () => import('./cardCreator.js'),
  streamerFrameComposite: () => import('./streamerFrameComposite.js'),
  cardComposite: () => import('./cardComposite.js'),
  ui: {
    replay: () => import('./helpers/scenes/TestReplay.js'),
    animatedText: () => import('./helpers/scenes/TestAnimatedTextScene.js'),
    languageLookup: () => import('./helpers/scenes/TestLanguageLookup.js'),
    startMatch: {
      vs: () => import('./helpers/scenes/TestVS.js'),
      splash: () => import('./helpers/scenes/TestSplashScene.js'),
      tutorialTitle: () => import('./helpers/scenes/TestTutorialTitleScene.js')
    },
    common: {
      bars: {
        progressionLine: () =>
          import('./helpers/scenes/TestProgressionLineScene.js'),
        progressBarContinuous: () =>
          import('./helpers/scenes/TestProgressBarContinuousScene.js'),
        progressBarSegmented: () =>
          import('./helpers/scenes/TestProgressBarSegmentedScene.js')
      },
      ui2d: () => import('./helpers/scenes/TestUI2DScene.js'),
      ui2dAdvanced: () => import('./helpers/scenes/TestUI2DAdvancedScene.js'),
      clipSpace: () => import('./helpers/scenes/TestClipSpaceScene.js'),
      clipSpaceCard: () => import('./helpers/scenes/TestClipSpaceCardScene.js'),
      error: () => import('./helpers/scenes/TestErrorScene.js'),
      settings: () => import('./helpers/scenes/TestSettingsButton.js'),
      infoBoxes: () => import('./helpers/scenes/TestInfoBoxesScene.js'),
      buttons: () => import('./helpers/scenes/TestButtonsScene.js'),
      icons: () => import('./helpers/scenes/TestUIIconsScene.js'),
      timer: () => import('./helpers/scenes/TestTimerScene.js'),
      tooltips: () => import('./helpers/scenes/TestToolTipsScene.js'),
      skytag: () => import('./helpers/scenes/TestSkyTagScene.js'),
      endTurnButton: () => import('./helpers/scenes/TestEndTurnButtonScene.js'),
      evilEndTurnButton: () =>
        import('./helpers/scenes/TestEvilEndTurnButtonScene.js'),
      reconnecting: () => import('./helpers/scenes/TestReconnectingScene.js'),
      emotes: () => import('./helpers/scenes/testEmotes.js'),
      spectate: () => import('./helpers/scenes/testSpectate.js'),
      focusInspection: () => import('./helpers/scenes/testFocusInspection.js'),
      actionHistory: () => import('./helpers/scenes/testActionHistory.js'),
      ringGeometry: () => import('./helpers/scenes/TestRingGeometryScene.js'),
      deckBreakdown: () =>
        import('./helpers/scenes/TestDeckBreakdownUIScene.js'),
      deckSidebars: () => import('./helpers/scenes/TestDeckSidebarUIScene.js'),
      scrollView: () => import('./helpers/scenes/TestScrollView.js'),
      fireworks: () => import('./helpers/scenes/TestFireworksScene.js'),
      manaVial: () => import('./helpers/scenes/TestManaVialScene.js'),
      highlightOverlay: () =>
        import('./helpers/scenes/TestHighlightOverlayScene.js'),
      starterDecks: () => import('./helpers/scenes/TestStarterDeckScene.js')
    },
    endMatch: {
      regular: () => import('./helpers/scenes/testEndMatchBot.js'),
      ranked: () => import('./helpers/scenes/testEndMatchRanked.js'),
      conquest: () => import('./helpers/scenes/testEndMatchConquest.js'),
      chunks: {
        xpbar: () => import('./helpers/scenes/TestXPBarScene.js'),
        rankbar: () => import('./helpers/scenes/TestRankBarScene.js'),
        rewardIcons: () =>
          import('./helpers/scenes/TestRewardCardIconsScene.js'),
        conquestBackground: () =>
          import('./helpers/scenes/testConquestBackground.js')
      },
      rankedElo: () => import('./helpers/scenes/testEndMatchRankedElo.js')
    }
  },
  graphics: {
    basicIsland: () => import('./helpers/scenes/testIslandBasic.js'),
    conquestIsland: () => import('./helpers/scenes/testIslandConquest.js'),
    tokenShadows: () => import('./helpers/scenes/testTokenShadowsScene.js'),
    mipMaps: () => import('./helpers/scenes/TestMipMapsScene.js'),
    elementColors: () => import('./helpers/scenes/TestElementColorsScene.js'),
    icons: () => import('./helpers/scenes/TestIconsScene.js'),
    fog: () => import('./helpers/scenes/TestMaterialFogScene.js'),
    traits: {
      isolated: () => import('./helpers/scenes/TestTraitIconsScene.js'),
      onCards: () => import('./cardViewerTraits.js')
    },
    colorMatrix: () => import('./helpers/scenes/testColorMatrixStackScene.js'),
    booleanMeshes: () => import('./helpers/scenes/TestBooleanMeshesScene.js'),
    noatlascards: () => import('./helpers/scenes/TestNoAtlasCardsScene.js'),
    meshEffects: () => import('./helpers/scenes/TestMeshEffectsScene.js'),
    quadraticCurveMesh: () =>
      import('./helpers/scenes/TestQuadraticCurveMeshScene.js'),
    quadraticCurveMeshInHierarchy: () =>
      import('./helpers/scenes/TestQuadraticCurveMeshInHierarchyScene.js'),
    attributionLines: () =>
      import('./helpers/scenes/TestAttributionLinesScene.js'),
    submeshEffects: {
      plaque: () => import('./helpers/scenes/testPlaqueMeshEffectsScene.js'),
      carvedWall: () =>
        import('./helpers/scenes/testCarvedWallMeshEffectsScene.js'),
      basicCentroidsTest: () =>
        import('./helpers/scenes/TestBasicCentroidsMeshEffectsScene.js'),
      centroidsCardsTest: () =>
        import('./helpers/scenes/TestCentroidsMeshEffectsScene.js')
    },
    lightcache: {
      basic: () => import('./helpers/scenes/TestLightCacheScene.js'),
      sky: () => import('./helpers/scenes/TestLightCacheSkyScene.js'),
      cards: () => import('./helpers/scenes/testLightCacheCards.js')
    },
    effects: {
      fakeCylinderGlow: () =>
        import('./helpers/scenes/TestFakeCylinderGlowScene.js'),
      uiParticles: () => import('./helpers/scenes/TestUIParticlesScene.js'),
      geometryEmitters: () =>
        import('./helpers/scenes/TestGeometryEmitterScene.js'),
      curatedMeshSpriteAnimation: () =>
        import('./helpers/scenes/TestCuratedMeshSpriteAnimationScene.js'),
      meshSpriteAnimation: () =>
        import('./helpers/scenes/TestMeshSpriteAnimationScene.js'),
      meshSpriteAnimationBattleground: () =>
        import('./helpers/scenes/TestMeshSpriteAnimationBattlegroundScene.js'),
      meshPortalAnimation: () =>
        import('./helpers/scenes/TestMeshPortalAnimationScene.js'),
      meshSpriteAnimationPalette: () =>
        import('./helpers/scenes/TestMeshSpriteAnimationPaletteScene.js'),
      primitives: {
        sparks: () => import('./helpers/scenes/TestSparksScene.js'),
        ribbonSmoke: () => import('./helpers/scenes/TestRibbonSmokeScene.js'),
        sparkRibbons: () => import('./helpers/scenes/TestSparkRibbonsScene.js'),
        sparksMore: () => import('./helpers/scenes/TestSparksMoreScene.js'),
        magicRibbons: () => import('./helpers/scenes/TestMagicRibbonsScene.js')
      },
      missiles: {
        base: () => import('./helpers/scenes/TestMissileBaseScene.js'),
        fire: () => import('./helpers/scenes/TestFireMissileScene.js'),
        magic: () => import('./helpers/scenes/TestMagicMissileScene.js'),
        lifeTransfer: () =>
          import('./helpers/scenes/TestLifeTransferMissileScene.js')
      },
      beams: {
        simple: () => import('./helpers/scenes/TestSimpleParticlesScene.js'),
        base: () => import('./helpers/scenes/TestBeamBaseScene.js'),
        dustStomp: () => import('./helpers/scenes/TestDustStompScene.js'),
        pebbleSplash: () => import('./helpers/scenes/TestPebbleSplashScene.js'),
        electricute: () => import('./helpers/scenes/TestElectricuteScene.js'),
        wither: () => import('./helpers/scenes/TestWitherEffectScene.js'),
        ailingVapors: () => import('./helpers/scenes/TestAilingVaporsScene.js'),
        healingVapors: () =>
          import('./helpers/scenes/TestHealingVaporsScene.js'),
        armorHit: () => import('./helpers/scenes/TestArmorHitScene.js'),
        damage: () => import('./helpers/scenes/TestDamageParticlesScene.js'),
        bannerCallOut: () =>
          import('./helpers/scenes/TestBannerCallOutScene.js'),
        goldenPortalFX: () =>
          import('./helpers/scenes/TestGoldenPortalFXScene.js')
      }
    }
  },
  utils: {
    animatingComponent: () =>
      import('./helpers/scenes/testAnimatingComponentScene.js'),
    scrolling: () => import('./helpers/scenes/TestScrollingScene.js'),
    tabbedOutAnimationBug: () =>
      import('./helpers/scenes/testTabbedOutAnimationBugScene.js'),
    gatlingDurations: () =>
      import('./helpers/scenes/TestGatlingDurationScene.js'),
    tiltingParallax: () =>
      import('./helpers/scenes/TestTiltingParallaxScene.js'),
    liveObject: () => import('./helpers/scenes/TestLiveObjectScene.js'),
    ease: () => import('./helpers/scenes/TestEaseScene.js'),
    boundingBoxes: () => import('./helpers/scenes/TestBoundingBoxesScene.js'),
    testInGameAnalytics: () =>
      import('./helpers/scenes/TestInGameAnalyticsScene.js'),
    cardGradeDeckVisuals: () =>
      import('./helpers/scenes/TestCardGradeDeckVisualsScene.js'),
    cacheInfo: () => import('./helpers/scenes/TestCacheInfoScene.js'),
    animatedBool: () => import('./helpers/scenes/TestAnimatedBoolScene.js')
  },
  testsForUsers: {
    renderOrderDeckSidebar: () =>
      import('./helpers/scenes/TestRenderOrderDeckSidebarUIScene.js')
  }
} satisfies TestLibrary

function sceneTest(SceneClass: new () => BaseTestScene, showDebug = true) {
  return new BasicTestBed(new SceneClass(), showDebug)
}

function getTestByPath(path: string) {
  const keys = path.split('.')
  let cursor = testLibrary as any
  while (keys.length > 0 && cursor) {
    cursor = cursor[keys.shift()!]
  }
  return cursor as () => Promise<RunnableTest>
}

function setTestByPath(path: string, f: () => Promise<RunnableTest>) {
  const keys = path.split('.')
  let cursor = testLibrary as any
  while (keys.length > 1 && cursor) {
    cursor = cursor[keys.shift()!]
  }
  cursor[keys[0]] = f
}

export function doesTestExist(path: string) {
  return typeof getTestByPath(path) === 'function'
}

export async function runTestByPath(path: string) {
  if (doesTestExist(path)) {
    if (import.meta.hot) {
      import.meta.hot.data.lastPath = path
    }
    window.document.title = 'SW test: ' + path
    const testGetter = await getTestByPath(path)
    const test = await testGetter()
    runTest(test)
  } else {
    throw new Error(`Test (${path}) does not exist`)
  }
}

export function buildDebugMenu(path: string, obj: any) {
  const tests: string[] = []
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const val = obj[key]
      const childPath = path + '/' + key
      if (typeof val === 'function') {
        tests.push(childPath)
      } else {
        buildDebugMenu(childPath, val)
      }
    }
  }
  if (tests.length > 0) {
    debuggables.register(
      path,
      new Debuggable(async () => {
        const overlay = createCloseDebugOverlay()
        const { modal, updateModalScroller } = await createNiceModal(
          tests.map(childPath => {
            childPath = childPath.split('/').join('.').slice(6)
            return new NiceMethod(
              '',
              () => {
                changeUrlParamAndReload('test', childPath)
              },
              getLast(childPath.split('.')),
              'never'
            )
          }),
          path,
          undefined,
          BUTTON_HEIGHT * 0.5,
          SLIDER_MARGINS * 0.5,
          true
        )

        modal.mesh.matrix.setConstraints(
          undefined,
          ReadonlyPin.Bottom,
          ReadonlyPin.Bottom
        )
        modal.mesh.matrix.size.x.offset = 160
        return [overlay, modal.mesh, updateModalScroller]
      })
    )
  }
}
