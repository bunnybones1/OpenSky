import ActionHistoryComponent from './ActionHistoryComponent'
import ArrowComponent from './ArrowComponent'
import AttachedToComponent from './AttachedToComponent'
import AttachmentCancellerComponent from './AttachmentCancellerComponent'
import BookmarkComponent from './BookmarkComponent'
import CardBackVisualsComponent from './CardBackVisualsComponent'
import CardComponent from './CardComponent'
import CardInstanceComponent from './CardInstanceComponent'
import CharacterComponent from './CharacterComponent'
import CharacterVisualsDashComponent from './CharacterVisualsDashComponent'
import CollidableComponent from './CollidableComponent'
import ColliderActiveComponent from './ColliderActiveComponent'
import ColorizeableMeshComponent from './ColorizeableMeshComponent'
import DamageIndicatorComponent from './DamageIndicatorComponent'
import DeckComponent from './DeckComponent'
import DeckPreviewComponent from './DeckPreviewComponent'
import DeckPreviewManagerComponent from './DeckPreviewManagerComponent'
import DeckPreviewOptInComponent from './DeckPreviewOptInComponent'
import DiscountIndicatorComponent from './DiscountIndicatorComponent'
import DraggableComponent from './DraggableComponent'
import DraggingComponent from './DraggingComponent'
import EmoteCalloutComponent from './EmoteCalloutComponent'
import EmoteRingOpenComponent from './EmoteRingOpenComponent'
import EnchantmentBounceComponent from './EnchantmentBounceComponent'
import EventCardComponent from './EventCardComponent'
import FakeHasAttachmentComponent from './FakeHasAttachmentComponent'
import FlippedComponent from './FlippedComponent'
import FloatationComponent from './FloatationComponent'
import ForegroundComponent from './ForegroundComponent'
import ForegroundInhibitorComponent from './ForegroundInhibitorComponent'
import FrameStyleComponent from './FrameStyleComponent'
import FrontFacesVisibleComponent from './FrontFacesVisibleComponent'
import GamePinCushionComponent from './GamePinCushionComponent'
import HeroAbilityChargesComponent from './HeroAbilityChargesComponent'
import HeroAbilityComponent from './HeroAbilityComponent'
import HeroAbilityCountersComponent from './HeroAbilityCountersComponent'
import HeroAbilitySilencedComponent from './HeroAbilitySilencedComponent'
import HeroCardComponent from './HeroCardComponent'
import HeroComponent from './HeroComponent'
import HighlightMaterialComponent from './HighlightMaterialComponent'
import HoldableComponent from './HoldableComponent'
import HolographicComponent from './HolographicComponent'
import HostingAttachmentComponent from './HostingAttachmentComponent'
import InHandComponent from './InHandComponent'
import InspectableComponent from './InspectableComponent'
import InspectingComponent from './InspectingComponent'
import InteractiveIndicatorsComponent from './InteractiveIndicatorsComponent'
import IsAnimatingComponent from './IsAnimatingComponent'
import IsBeingDamagedComponent from './IsBeingDamagedComponent'
import IsRevealedComponent from './IsRevealedComponent'
import LightComponent from './LightComponent'
import MeshComponent from './MeshComponent'
import MiniComponent from './MiniComponent'
import MuteEnemyRingOpenComponent from './MuteEnemyRingOpenComponent'
import OrderComponent from './OrderComponent'
import OverkillComponent from './OverkillComponent'
import ParallaxValueComponent from './ParallaxValueComponent'
import PlayableComponent from './PlayableComponent'
import PlayerComponent from './PlayerComponent'
import PortallingComponent from './PortallingComponent'
import PreviewIconComponent from './PreviewIconComponent'
import PublicRarityComponent from './PublicRarityComponent'
import ScreenSpaceComponent from './ScreenSpaceComponent'
import SelectableComponent from './SelectableComponent'
import ShadowComponent from './ShadowComponent'
import SleepingComponent from './SleepingComponent'
import SpecialConjureComponent from './SpecialConjureComponent'
import SpinningComponent from './SpinningComponent'
import StagingComponent from './StagingComponent'
import StealthComponent from './StealthComponent'
import StickerRingOpenComponent from './StickerRingOpenComponent'
import TargetableComponent from './TargetableComponent'
import TraitArmorComponent from './TraitArmorComponent'
import TraitBannerComponent from './TraitBannerComponent'
import TraitDashComponent from './TraitDashComponent'
import TraitGuardComponent from './TraitGuardComponent'
import TraitLifestealComponent from './TraitLifestealComponent'
import TraitStealthComponent from './TraitStealthComponent'
import TraitWitherComponent from './TraitWitherComponent'
import TransformComponent from './TransformComponent'
import TriggersHolderComponent from './TriggersHolderComponent'
import ZoneComponent from './ZoneComponent'

export type Components = {
  actionHistory: ActionHistoryComponent
  arrow: ArrowComponent
  attachedTo: AttachedToComponent
  attachmentCanceller: AttachmentCancellerComponent
  bookmark: BookmarkComponent
  card: CardComponent
  cardBackVisuals: CardBackVisualsComponent
  cardInstance: CardInstanceComponent
  character: CharacterComponent
  collidable: CollidableComponent
  colliderActive: ColliderActiveComponent
  colorizeableMesh: ColorizeableMeshComponent
  damageIndicator: DamageIndicatorComponent
  enchantmentBounce: EnchantmentBounceComponent
  deck: DeckComponent
  deckPreview: DeckPreviewComponent
  deckPreviewManager: DeckPreviewManagerComponent
  deckPreviewOptInComponent: DeckPreviewOptInComponent
  discountIndicator: DiscountIndicatorComponent
  draggable: DraggableComponent
  dragging: DraggingComponent
  emoteCallout: EmoteCalloutComponent
  gamePinCushion: GamePinCushionComponent
  heroAbility: HeroAbilityComponent
  eventCard: EventCardComponent
  heroAbilityCharges: HeroAbilityChargesComponent
  heroAbilityCounters: HeroAbilityCountersComponent
  heroAbilitySilenced: HeroAbilitySilencedComponent
  emoteRingOpen: EmoteRingOpenComponent
  muteEnemyRingOpen: MuteEnemyRingOpenComponent
  stickerRingOpen: StickerRingOpenComponent
  fakeHasAttachment: FakeHasAttachmentComponent
  flipped: FlippedComponent
  floatation: FloatationComponent
  foreground: ForegroundComponent
  foregroundInhibitor: ForegroundInhibitorComponent
  frameStyle: FrameStyleComponent
  frontFacesVisible: FrontFacesVisibleComponent
  hero: HeroComponent
  parallaxValue: ParallaxValueComponent
  heroCard: HeroCardComponent
  highlightMaterial: HighlightMaterialComponent
  holdable: HoldableComponent
  holographic: HolographicComponent
  hostingAttachment: HostingAttachmentComponent
  inHand: InHandComponent
  inspectable: InspectableComponent
  inspecting: InspectingComponent
  interactiveIndicators: InteractiveIndicatorsComponent
  isAnimating: IsAnimatingComponent
  isBeingDamaged: IsBeingDamagedComponent
  isRevealed: IsRevealedComponent
  traitArmor: TraitArmorComponent
  traitBanner: TraitBannerComponent
  traitGuard: TraitGuardComponent
  traitLifesteal: TraitLifestealComponent
  traitStealth: TraitStealthComponent
  traitWither: TraitWitherComponent
  traitDash: TraitDashComponent
  characterVisualsDash: CharacterVisualsDashComponent
  light: LightComponent
  mesh: MeshComponent
  mini: MiniComponent
  order: OrderComponent
  overkill: OverkillComponent
  playable: PlayableComponent
  player: PlayerComponent
  portalling: PortallingComponent
  previewIcon: PreviewIconComponent
  publicRarity: PublicRarityComponent
  screenSpace: ScreenSpaceComponent
  selectable: SelectableComponent
  shadow: ShadowComponent
  sleeping: SleepingComponent
  specialConjure: SpecialConjureComponent
  spinning: SpinningComponent
  staging: StagingComponent
  stealth: StealthComponent
  targetable: TargetableComponent
  transform: TransformComponent
  triggersHolder: TriggersHolderComponent
  zone: ZoneComponent
}
