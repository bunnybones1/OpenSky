import Orchestrator from './framework/Orchestrator'
import * as cache from './tasks/cache'
import * as game from './tasks/game'
import * as metadata from './tasks/metadata'
import * as orphaned from './tasks/orphaned'
import * as rawPreviews from './tasks/rawPreviews'
import * as scratch from './tasks/scratch'
import * as wallet from './tasks/wallet'
import * as webapp from './tasks/webapp'

export const registerTasks = (orchestrator: Orchestrator) => {
  // Cache
  orchestrator.task(
    'cache:detect-removed-command-outputs',
    cache.detectRemovedCommandOutputs
  )
  orchestrator.task('cache:prune-missing-files', cache.pruneMissingFiles)

  // Scratch
  orchestrator.task(
    'scratch:create-full-cards',
    ['game'],
    scratch.createFullCards
  )
  orchestrator.task('scratch:flatten-row-unit-art', scratch.flattenRowUnitArt)
  orchestrator.task('scratch:process-title-frames', scratch.processTitleFrames)
  orchestrator.task(
    'scratch:create-language-file-charsets',
    scratch.createLanguageFileCharsets
  )
  orchestrator.task(
    'scratch:create-individual-font-language-charsets',
    ['scratch:create-language-file-charsets'],
    scratch.createIndividualFontLanguageCharsets
  )
  orchestrator.task(
    'scratch:create-font-textures',
    [
      'scratch:create-individual-font-language-charsets',
      'scratch:create-fixed-fonts',
      'scratch:copy-font-files'
    ],
    scratch.createFontTextures
  )
  orchestrator.task('scratch:create-fixed-fonts', scratch.createFixedFonts)
  orchestrator.task('scratch:copy-font-files', scratch.copyFontFiles)

  orchestrator.task(
    'scratch:process-thumbnail-art',
    scratch.processThumbnailArt
  )

  // previews for sheet
  orchestrator.task(
    'rawPreviews:generate-previews',
    rawPreviews.generatePreviews
  )

  // Webapp
  orchestrator.task(
    'webapp:generate-audio-sprite',
    webapp.generateWebappAudioSprite
  )
  orchestrator.task('webapp:copy-video', webapp.copyVideo)
  orchestrator.task('webapp:convert-icons', webapp.convertIcons)
  orchestrator.task('webapp:convert-backgrounds', webapp.convertBackgrounds)
  orchestrator.task('webapp:convert-misc', webapp.convertMisc)
  orchestrator.task('webapp:copy-fonts', webapp.copyFonts)
  orchestrator.task('webapp:generate-frames', webapp.generateFrames)
  orchestrator.task(
    'webapp:convert-and-resize-quest-thumbnails',
    ['scratch:process-thumbnail-art'],
    webapp.convertAndResizeQuestThumbnails
  )
  orchestrator.task(
    'webapp:convert-and-resize-art-rows',
    ['scratch:flatten-row-unit-art'],
    webapp.convertAndResizeArtRows
  )
  orchestrator.task(
    'webapp:convert-and-resize-title-frames',
    ['scratch:process-title-frames'],
    webapp.convertAndResizeTitleFrames
  )
  orchestrator.task(
    'webapp:convert-and-resize-hero-art',
    webapp.convertAndResizeHeroArt
  )
  orchestrator.task(
    'webapp:convert-and-resize-unit-art',
    webapp.convertAndResizeUnitArt
  )
  orchestrator.task(
    'webapp:convert-and-resize-spell-art',
    webapp.convertAndResizeSpellArt
  )
  orchestrator.task(
    'webapp:convert-and-resize-hero-thumbs',
    webapp.convertAndResizeHeroThumbnails
  )
  orchestrator.task('webapp:generate-art-columns', webapp.generateArtColumns)
  orchestrator.task('webapp:generate-hero-columns', webapp.generateHeroColumns)
  orchestrator.task(
    'webapp:generate-deck-cover-images',
    webapp.generateDeckCoverImages
  )
  orchestrator.task(
    'webapp:generate-card-and-hero-items',
    ['scratch:create-full-cards'],
    webapp.generateCardAndHeroItems
  )
  orchestrator.task(
    'webapp:convert-and-resize-stickers',
    webapp.convertAndResizeStickers
  )
  orchestrator.task(
    'webapp:convert-and-resize-card-backs-premium',
    webapp.convertAndResizePremiumCardBacks
  )
  orchestrator.task(
    'webapp:convert-and-resize-card-backs-standard',
    webapp.convertAndResizeStandardCardBacks
  )

  // Game
  orchestrator.task('game:copy-models', game.copyModels)
  orchestrator.task(
    'game:copy-high-quality-misc-game-art',
    game.copyHighQualityMiscGameArt
  )
  orchestrator.task(
    'game:copy-high-quality-misc-common-art',
    game.copyHighQualityMiscCommonArt
  )
  orchestrator.task(
    'game:copy-high-quality-card-art',
    game.copyHighQualityCardArt
  )
  orchestrator.task(
    'game:uv-chop-row-art',
    ['scratch:flatten-row-unit-art'],
    game.UVChopRowArt
  )
  orchestrator.task(
    'game:update-msa',
    ['game:copy-high-quality-misc-game-art'],
    game.copyModels
  )
  orchestrator.task(
    'game:create-card-thumbnails',
    ['scratch:process-thumbnail-art'],
    game.generateCardThumbnails
  )
  orchestrator.task(
    'game:generate-blurred-hero-ability-art',
    game.generateBlurredHeroAbilityArt
  )
  orchestrator.task(
    'game:copy-high-quality-sticker-art',
    game.prepareStickerArt
  )

  orchestrator.task('game:copy-high-quality-title-art', game.prepareTitleArt)

  orchestrator.task(
    'game:create-responsive-image-sizes',
    game.createResponsiveImageSizes
  )
  orchestrator.task('game:create-gl-textures', game.createGLTextures)
  orchestrator.task(
    'game:copy-font-textures',
    ['scratch:create-font-textures'],
    game.copyFontTextures
  )
  orchestrator.task('game:copy-music', game.copyMusic)
  orchestrator.task('game:copy-tutorial-audio', game.copyTutorialAudio)
  orchestrator.task(
    'game:generate-audio-fx-sprites',
    game.generateAudioFXSprites
  )
  orchestrator.task('game:copy-raw-audio-fx', game.copyRawAudioFX)

  orchestrator.task('cosmetics:copy-crystals', wallet.copyCrystalArt)

  // Metadata (used by ERC1155 tokens to reference name, image, and description)
  orchestrator.task(
    'metadata:crystals',
    ['cosmetics:copy-crystals'],
    metadata.generateCrystalMetadata
  )
  orchestrator.task(
    'metadata:stickers',
    ['webapp:prepare-stickers'],
    metadata.generateStickerMetadata
  )
  orchestrator.task(
    'metadata:card-backs',
    ['webapp:prepare-card-backs-premium'],
    metadata.generateCardBackMetadata
  )

  orchestrator.task(
    'metadata:hero-skins',
    ['prepare-hero-unit-art'],
    metadata.generateHeroSkinMetadata
  )

  orchestrator.task('metadata:card-token', metadata.generateCardTokenMetadata)
  orchestrator.task(
    'metadata:conquest-ticket',
    metadata.generateConquestTicketMetadata
  )
  orchestrator.task(
    'orphaned:detect-orphaned-assets',
    orphaned.detectOrphanedAssets
  )
  orchestrator.task(
    'orphaned:delete-orphaned-assets',
    orphaned.deleteOrphanedAssets
  )

  // Auto-create groups
  const groups = new Set(
    [...orchestrator.tasks.keys()].reduce<string[]>((s, t) => {
      const split = t.split(':')
      if (split.length > 1) {
        s.push(split[0])
      }
      return s
    }, [])
  )
  for (const group of groups) {
    const tasksInGroup = [...orchestrator.tasks.keys()].filter((t) =>
      t.startsWith(`${group}:`)
    )
    if (tasksInGroup.length > 0) {
      orchestrator.task(group, tasksInGroup)
    }
  }
  orchestrator.task('all', [...groups])
  orchestrator.task(
    'fast',
    [...groups].filter((t) => t !== 'cache' && t !== 'orphaned')
  )
}
