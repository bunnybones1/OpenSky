import { Entity } from 'gg'

import { Components } from '~/components'
import PlayerComponent from '~/components/PlayerComponent'
import { worldEntities } from '~/helpers/worldHelpers'
import { CardStatus, OwnedCardStatus } from '~/types'
import {
  ReadonlyTrackableCollection,
  TrackableCollection
} from '~/utils/TrackableCollection'

function mT(name: string) {
  return new TrackableCollection<Entity<Components>>(name + 'Zone')
}

const Deck = mT('Deck')
const Hand = mT('Hand')
const Field = mT('Field')
const Graveyard = mT('Graveyard')
const Dust = mT('Dust')
const Attachment = mT('Attachment')
const Limbo = mT('Limbo')
const Casting = mT('Casting')
const CardSelection = mT('CardSelection')
const Conjuring = mT('Conjuring')
const Staging = mT('Staging')
const Reward = mT('Reward')
const HeroReward = mT('HeroReward')
const DualPrismHeroReward = mT('DualPrismHeroReward')
const ConquestReward = mT('ConquestReward')
const ConquestPotentialReward = mT('ConquestPotentialReward')
const DisabledReward = mT('DisabledReward')
const UseState = mT('UseState')
const Dragging = mT('Dragging')
const Void = mT('Void')
const OptimisticCasting = mT('OptimisticCasting')
const OptimisticHand = mT('OptimisticHand')
const Inspection = mT('Inspection')
const HeroAbility = mT('HeroAbility')
const HeroAbilityStaging = mT('HeroAbilityStaging')
const Drafting = mT('Drafting')

// Attachment.listenForRemove(i => {
//     debugger
// })

export const zoneCollections: {
  [K in CardStatus]: TrackableCollection<Entity<Components>>
} = {
  Deck,
  Hand,
  Field,
  Graveyard,
  Dust,
  Attachment,
  Limbo,
  Casting,
  CardSelection,
  Conjuring,
  Staging,
  Reward,
  HeroReward,
  DualPrismHeroReward,
  ConquestPotentialReward,
  ConquestReward,
  DisabledReward,
  UseState,
  Dragging,
  Void,
  OptimisticCasting,
  OptimisticHand,
  Inspection,
  HeroAbility,
  HeroAbilityStaging,
  Drafting
}

const pc = PlayerComponent

function mWP(base: TrackableCollection<Entity<Components>>) {
  return base.intersect(pc.entities).intersect(worldEntities)
}

function mWO(base: TrackableCollection<Entity<Components>>) {
  return base.exclude(pc.entities).intersect(worldEntities)
}

export const ownedZoneCollections: {
  [K in OwnedCardStatus]: ReadonlyTrackableCollection<Entity<Components>>
} = {
  Player_Deck: mWP(Deck),
  Player_Hand: mWP(Hand),
  Player_Field: mWP(Field),
  Player_Graveyard: mWP(Graveyard),
  Player_Dust: mWP(Dust),
  Player_Attachment: mWP(Attachment),
  Player_Limbo: mWP(Limbo),
  Player_Casting: mWP(Casting),
  Player_CardSelection: mWP(CardSelection),
  Player_Conjuring: mWP(Conjuring),
  Player_Staging: mWP(Staging),
  Player_Reward: mWP(Reward),
  Player_HeroReward: mWP(HeroReward),
  Player_DualPrismHeroReward: mWP(DualPrismHeroReward),
  Player_ConquestReward: mWP(ConquestReward),
  Player_ConquestPotentialReward: mWP(ConquestPotentialReward),
  Player_DisabledReward: mWP(DisabledReward),
  Player_UseState: mWP(UseState),
  Player_Dragging: mWP(Dragging),
  Player_Void: mWP(Void),
  Player_OptimisticCasting: mWP(OptimisticCasting),
  Player_OptimisticHand: mWP(OptimisticHand),
  Player_Inspection: mWP(Inspection),
  Player_HeroAbility: mWP(HeroAbility),
  Player_HeroAbilityStaging: mWP(HeroAbilityStaging),
  Player_Drafting: mWP(HeroAbilityStaging),

  Opponent_Deck: mWO(Deck),
  Opponent_Hand: mWO(Hand),
  Opponent_Field: mWO(Field),
  Opponent_Graveyard: mWO(Graveyard),
  Opponent_Dust: mWO(Dust),
  Opponent_Attachment: mWO(Attachment),
  Opponent_Limbo: mWO(Limbo),
  Opponent_Casting: mWO(Casting),
  Opponent_CardSelection: mWO(CardSelection),
  Opponent_Conjuring: mWO(Conjuring),
  Opponent_Staging: mWO(Staging),
  Opponent_Reward: mWO(Reward),
  Opponent_HeroReward: mWO(HeroReward),
  Opponent_DualPrismHeroReward: mWO(DualPrismHeroReward),
  Opponent_ConquestReward: mWO(ConquestReward),
  Opponent_ConquestPotentialReward: mWO(ConquestPotentialReward),
  Opponent_DisabledReward: mWO(DisabledReward),
  Opponent_UseState: mWO(UseState),
  Opponent_Dragging: mWO(Dragging),
  Opponent_Void: mWO(Void),
  Opponent_OptimisticCasting: mWO(OptimisticCasting),
  Opponent_OptimisticHand: mWO(OptimisticHand),
  Opponent_Inspection: mWO(Inspection),
  Opponent_HeroAbility: mWO(HeroAbility),
  Opponent_HeroAbilityStaging: mWO(HeroAbilityStaging),
  Opponent_Drafting: mWO(HeroAbilityStaging)
}

export const miscCollections = {
  generic: mT('generic').intersect(worldEntities),
  genericStayWhereYouAre: mT('genericStayWhereYouAre').intersect(worldEntities)
}
