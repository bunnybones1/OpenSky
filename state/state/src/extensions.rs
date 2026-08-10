use crate::{
  client::GameAction, game::SkyWeaver, utils::enemy, BaseCard, Modifier, Phase, PhaseModifyCard,
  Rarity, ResolvedPhase, ResolvedPhaseModifyCard,
};
use card_movement_simulator::{
  arcadeum, error::SecretModifyCardError, Card, CardEvent, CardInstance, CardLocation, GameState,
  InstanceID, Player, PlayerCards, PlayerSecret, SecretCardsInfo, Zone,
};
use itertools::Itertools;

pub trait SkyWeaverExtensions {
  /// The current player's cards, then their opponent's cards.
  fn player_and_enemy_cards(&self) -> [&PlayerCards; 2];

  fn hero_id(&self, player: Player) -> InstanceID;
  fn hero(&self, player: Player) -> &CardInstance<SkyWeaver>;
  fn characters<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T>;
  fn attachments_on_characters<'a, T: From<&'a CardInstance<SkyWeaver>>>(
    &'a self,
    player: Player,
  ) -> Vec<T>;
  fn units<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T>;
  fn units_including_dead<'a, T: From<&'a CardInstance<SkyWeaver>>>(
    &'a self,
    player: Player,
  ) -> Vec<T>;
  fn graveyard<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T>;

  fn enemy_field<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T>;
  fn enemy_units<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T>;
  fn enemy_graveyard<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T>;

  fn all_units<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self) -> Vec<T>;
  fn all_units_including_dead<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self) -> Vec<T>;
  fn all_characters<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self) -> Vec<T>;

  fn player_has_room_for_unit(&self, player: Player) -> bool;
  fn hand_is_full(&self, player: Player) -> bool;
}

impl SkyWeaverExtensions for GameState<SkyWeaver> {
  fn player_and_enemy_cards(&self) -> [&PlayerCards; 2] {
    let slice = self.all_player_cards();
    assert!(slice.len() == 2);
    if self.current_player == 0 {
      [&slice[0], &slice[1]]
    } else {
      [&slice[1], &slice[0]]
    }
  }
  fn hero_id(&self, player: Player) -> InstanceID {
    *self
      .player_cards(player)
      .field()
      .iter()
      .chain(self.player_cards(player).limbo())
      .find(|id| {
        id.instance(self, None)
          .expect("All field cards are public.")
          .is_hero()
      })
      .expect("Each player's field or limbo must always contain a hero.")
  }

  fn hero(&self, player: Player) -> &CardInstance<SkyWeaver> {
    self
      .hero_id(player)
      .instance(self, None)
      .expect("Heroes are always public.")
  }

  fn characters<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T> {
    self
      .player_cards(player)
      .field()
      .iter()
      .filter_map(|c| {
        let instance = c.instance(self, None).expect("Field cards are public");

        if instance.marked_for_death.is_some() && !instance.is_hero() {
          None
        } else {
          Some(instance)
        }
      })
      .map_into()
      .collect()
  }

  fn attachments_on_characters<'a, T: From<&'a CardInstance<SkyWeaver>>>(
    &'a self,
    player: Player,
  ) -> Vec<T> {
    self
      .player_cards(player)
      .field()
      .iter()
      .filter_map(|c| {
        c.instance(self, None)
          .expect("Field cards are public")
          .attachment()
      })
      .map(|c| {
        c.instance(self, None)
          .expect("Attachments on field cards are public")
      })
      .map_into()
      .collect()
  }

  fn units<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T> {
    self
      .player_cards(player)
      .field()
      .iter()
      .map(move |id| id.instance(self, None).expect("Field cards are public"))
      .filter(|c| c.is_unit() && c.marked_for_death.is_none())
      .map_into()
      .collect()
  }
  fn units_including_dead<'a, T: From<&'a CardInstance<SkyWeaver>>>(
    &'a self,
    player: Player,
  ) -> Vec<T> {
    self
      .player_cards(player)
      .field()
      .iter()
      .map(move |id| id.instance(self, None).expect("Field cards are public"))
      .filter(|c| c.is_unit())
      .map_into()
      .collect()
  }
  // The graveyard is ordered from top/first to bottom/last.
  fn graveyard<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T> {
    self
      .player_cards(player)
      .graveyard()
      .iter()
      .rev()
      .map(|c| c.instance(self, None).expect("Graveyard cards are public"))
      .map_into()
      .collect()
  }

  fn enemy_field<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T> {
    self.characters(enemy(player))
  }
  fn enemy_units<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T> {
    self.units(enemy(player))
  }
  fn enemy_graveyard<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self, player: Player) -> Vec<T> {
    self.graveyard(enemy(player))
  }

  fn all_units<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self) -> Vec<T> {
    self
      .player_and_enemy_cards()
      .iter()
      .flat_map(|cards| cards.field().iter())
      .map(move |id| id.instance(self, None).expect("Field cards are public"))
      .filter(|c| c.is_unit() && c.marked_for_death.is_none())
      .map_into()
      .collect()
  }
  fn all_units_including_dead<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self) -> Vec<T> {
    self
      .player_and_enemy_cards()
      .iter()
      .flat_map(|cards| cards.field().iter())
      .map(move |id| id.instance(self, None).expect("Field cards are public"))
      .filter(|c| c.is_unit())
      .map_into()
      .collect()
  }

  fn all_characters<'a, T: From<&'a CardInstance<SkyWeaver>>>(&'a self) -> Vec<T> {
    self
      .player_and_enemy_cards()
      .iter()
      .flat_map(|cards| cards.field().iter())
      .map(move |id| id.instance(self, None).expect("Field cards are public"))
      .filter(|c| c.marked_for_death.is_none() || c.is_hero())
      .map_into()
      .collect()
  }

  fn player_has_room_for_unit(&self, player: Player) -> bool {
    self.player_cards(player).field().len() < self.game_params.max_board_units as usize
  }
  fn hand_is_full(&self, player: Player) -> bool {
    self.player_cards(player).hand().len() == self.game_params.max_hand_size as usize
  }
}

pub trait PlayerSecretExtensions {
  fn apply_modifier(
    &mut self,
    card: Card,
    modifier: Modifier,
    source: InstanceID,
    log: &mut dyn FnMut(CardEvent<SkyWeaver>),
  ) -> Result<(), SecretModifyCardError>;
}

impl PlayerSecretExtensions for PlayerSecret<SkyWeaver> {
  fn apply_modifier(
    &mut self,
    card: Card,
    modifier: Modifier,
    source: InstanceID,
    log: &mut dyn FnMut(CardEvent<SkyWeaver>),
  ) -> Result<(), SecretModifyCardError> {
    log(CardEvent::GameEvent {
      event: GameAction::EnterPhase(Phase::ModifyCard(PhaseModifyCard {
        card,
        modifier: modifier.clone(),
        source,
      })),
    });

    self.modify_card(card, log, |mut card| {
      card.apply_modifier(modifier.clone(), source)
    })?;

    log(CardEvent::GameEvent {
      event: GameAction::ExitPhase(ResolvedPhase::ModifyCard(ResolvedPhaseModifyCard {
        card,
        modifier,
        source,
      })),
    });

    Ok(())
  }
}

pub trait SecretCardsInfoExtensions {
  fn create_card(&mut self, base: BaseCard, card_rarity: Option<Rarity>) -> InstanceID;
}

impl<'a> SecretCardsInfoExtensions for SecretCardsInfo<'a, SkyWeaver> {
  fn create_card(&mut self, base: BaseCard, card_rarity: Option<Rarity>) -> InstanceID {
    let rarity = if let Some(creator_card) = card_rarity {
      creator_card
    } else {
      self
        .card_rarities
        .get(&base)
        .copied()
        .unwrap_or(Rarity::Base)
    };

    let id = self.new_card(base);
    let attach = self
      .instance(id)
      .expect("Just-instantiated secret card is secret.")
      .attachment();

    let secret: &mut arcadeum::store::MutateSecretInfo<_, _> = &mut *self;
    secret
      .secret
      .apply_modifier(
        id.into(),
        Modifier::SetRarity(rarity),
        InstanceID::from_raw(0),
        secret.log,
      )
      .expect("Card we just created exists");
    if let Some(attach) = attach {
      secret
        .secret
        .apply_modifier(
          attach.into(),
          Modifier::SetRarity(rarity),
          InstanceID::from_raw(0),
          secret.log,
        )
        .expect("Card we just created exists");
    }

    id
  }
}

pub trait ZoneExtensions {
  fn is_public(&self) -> Option<bool>;
}

impl ZoneExtensions for Zone {
  /// Returns None if passed a Zone::Attachment
  fn is_public(&self) -> Option<bool> {
    Some(match self {
      Zone::Deck | Zone::CardSelection => false,
      Zone::Hand { public } | Zone::Dust { public } | Zone::Limbo { public } => *public,
      Zone::Field | Zone::Graveyard | Zone::Casting | Zone::HeroAbility => true,
      Zone::Attachment { .. } => return None,
    })
  }
}

pub trait CardLocationExtensions {
  fn is_field(&self) -> bool;
  fn is_casting(&self) -> bool;
}

impl CardLocationExtensions for CardLocation {
  fn is_field(&self) -> bool {
    match self.location {
      None => false,
      Some((Zone::Field, _)) => true,
      _ => false,
    }
  }
  fn is_casting(&self) -> bool {
    match self.location {
      None => false,
      Some((Zone::Casting, _)) => true,
      _ => false,
    }
  }
}
