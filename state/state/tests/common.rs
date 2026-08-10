use card_movement_simulator::{
  arcadeum::{
    store::{StoreAction, StoreState, Tester},
    PlayerAction, ProofAction,
  },
  CardInstance, GameState, InstanceID, PlayerSecret,
};
use indexmap::IndexMap;
use lazy_static::lazy_static;
use skyweaver_rs::{
  BaseCard, GameParams, Player, PlayerAction as SkyWeaverAction, PlayerSeed, Prism, Rarity,
  SkyWeaver,
};
use std::ops::Deref;

#[cfg(not(feature = "std"))]
extern crate alloc;

#[cfg(not(feature = "std"))]
use {
  alloc::{format, prelude::v1::*, vec},
  core::{future::Future, pin::Pin},
};

#[cfg(not(feature = "std"))]
macro_rules! println {
  () => {};
  ($($arg:tt)*) => {};
}

#[derive(Default)]
pub struct TestStoreBuilder {
  _should_log: Option<bool>,
  _with_cards: Option<(Vec<BaseCard>, Vec<BaseCard>)>,
  _with_hero_ability: Option<(Option<BaseCard>, Option<BaseCard>)>,
  _with_prisms: Option<(Vec<Prism>, Vec<Prism>)>,
  _game_params: Option<GameParams>,
  _card_rarities: [IndexMap<BaseCard, Rarity>; 2],
}

pub fn test_store() -> TestStoreBuilder {
  TestStoreBuilder::default()
}

impl TestStoreBuilder {
  #[allow(dead_code)]
  pub fn with_cards(mut self, p1cards: Vec<BaseCard>, p2cards: Vec<BaseCard>) -> Self {
    self._with_cards = Some((p1cards, p2cards));
    self
  }
  #[allow(dead_code)]
  pub fn should_log(mut self, should_log: bool) -> Self {
    self._should_log = Some(should_log);
    self
  }
  #[allow(dead_code)]
  pub fn with_params(mut self, params: GameParams) -> Self {
    self._game_params = Some(params);
    self
  }
  #[allow(dead_code)]
  pub fn with_hero_ability(
    mut self,
    p1_hero_ability: Option<BaseCard>,
    p2_hero_ability: Option<BaseCard>,
  ) -> Self {
    self._with_hero_ability = Some((p1_hero_ability, p2_hero_ability));
    self
  }
  #[allow(dead_code)]
  pub fn with_prisms(mut self, p1: Vec<Prism>, p2: Vec<Prism>) -> Self {
    self._with_prisms = Some((p1, p2));
    self
  }
  #[allow(dead_code)]
  pub fn with_card_rarity(mut self, player: Player, card: BaseCard, rarity: Rarity) -> Self {
    self._card_rarities[player as usize].insert(card, rarity);
    self
  }

  pub fn build(self) -> TestStore {
    let (p1cards, p2cards) = self._with_cards.unwrap_or((vec![], vec![]));
    let (p1hero_ability, p2hero_ability) = self._with_hero_ability.unwrap_or((None, None));
    let (p1prisms, p2prisms) = self
      ._with_prisms
      .unwrap_or((vec![Prism::Heart], vec![Prism::Heart]));

    let sw = SkyWeaver::new(
      self._game_params.unwrap_or(DEFAULT_PARAMS.clone()),
      PlayerSeed {
        prisms: p1prisms,
        hero_ability: p1hero_ability,
      },
      PlayerSeed {
        prisms: p2prisms,
        hero_ability: p2hero_ability,
      },
    );

    let p1secret = {
      let mut secret: PlayerSecret<SkyWeaver> = PlayerSecret::new(0, Default::default());
      secret.original_deck = p1cards;
      secret.card_rarities = self._card_rarities[0].clone();
      secret
    };

    let p2secret = {
      let mut secret: PlayerSecret<SkyWeaver> = PlayerSecret::new(1, Default::default());
      secret.original_deck = p2cards;
      secret.card_rarities = self._card_rarities[1].clone();
      secret
    };
    let log = self._should_log.unwrap_or(true);

    let tester = Tester::new(
      card_movement_simulator::GameState::new(sw, true),
      [p1secret, p2secret],
      vec![ProofAction {
        player: None,
        action: PlayerAction::Play(StoreAction::new(SkyWeaverAction::Setup)),
      }],
      |player, _, _| println!("[{:?}: ready]", player),
      move |player, target, event| {
        if log {
          println!("[{:?}: log for {:?}] {:?}", player, target, event)
        }
      },
      false,
    )
    .unwrap();

    tester.state();

    TestStore(tester)
  }
}

pub struct TestStore(Tester<card_movement_simulator::GameState<SkyWeaver>>);

impl Clone for TestStore {
  fn clone(&self) -> TestStore {
    TestStore(
      Tester::new(
        self.state().clone(),
        [self.secret(0).clone(), self.secret(1).clone()],
        vec![],
        |player, _, _| println!("[{:?}: ready]", player),
        |player, target, event| println!("[{:?}: log for {:?}] {:?}", player, target, event),
        false,
      )
      .unwrap(),
    )
  }
}

impl Deref for TestStore {
  type Target = card_movement_simulator::GameState<SkyWeaver>;
  fn deref(&self) -> &Self::Target {
    self.state()
  }
}

lazy_static! {
  pub static ref DEFAULT_PARAMS: GameParams = GameParams {
    fill_decks_to_prism_size: false,
    skip_mulligan: false,
    ..Default::default()
  };
}

impl TestStore {
  #[allow(dead_code)]
  pub fn apply_ok(&mut self, player: Option<Player>, action: SkyWeaverAction) {
    let res = self.apply(player, action.clone());
    assert!(
      res.is_ok(),
      "Result for Action {:?} is {:?}, expected Ok.",
      action,
      res
    );
  }
  #[allow(dead_code)]
  pub fn apply_err(&mut self, player: Option<Player>, action: SkyWeaverAction) {
    let res = self.apply(player, action.clone());
    assert!(
      res.is_err(),
      "Result for Action {:?} is Ok, expected Err.",
      action
    );
  }

  #[allow(dead_code)]
  pub fn apply(
    &mut self,
    player: Option<Player>,
    action: SkyWeaverAction,
  ) -> Result<Vec<ProofAction<StoreState<GameState<SkyWeaver>>>>, String> {
    eprintln!("Applying {:?} as {:?}", action, player);
    self.0.apply(player, &action)
  }

  #[allow(dead_code)]
  pub fn cycle_turns(mut self, count: u16) -> Self {
    let mut current_player = self.current_player;
    for _ in 0..(count * 2) {
      self.apply_ok(Some(current_player), SkyWeaverAction::EndTurn);
      current_player = if current_player == 0 { 1 } else { 0 };
    }
    self
  }

  pub fn state(&self) -> &card_movement_simulator::GameState<SkyWeaver> {
    self.0.state()
  }

  pub fn secret<'a>(
    &'a self,
    player: Player,
  ) -> Box<dyn Deref<Target = card_movement_simulator::PlayerSecret<SkyWeaver>> + 'a> {
    self.0.secret(player)
  }

  pub fn auto_mulligan(mut self) -> Self {
    for p in 0..2 {
      if !self.player(p).done_card_selection {
        let mulligan_size: usize = self.game_params.player_params[p as usize]
          .mulligan_choice_size
          .into();
        let mulligan_cards: Vec<_> = (0..mulligan_size).collect();
        self.apply_ok(
          Some(p),
          SkyWeaverAction::CommitCardSelection {
            card_indices: mulligan_cards,
          },
        );
      }
    }

    assert!(self.players[0].done_card_selection);
    assert!(self.players[1].done_card_selection);
    self
  }

  #[allow(dead_code)]
  #[track_caller]
  pub fn hero(&self, player: Player) -> &CardInstance<SkyWeaver> {
    self
      .player_cards(player)
      .field()
      .iter()
      .find(|id| {
        id.instance(self, None)
          .expect("All field cards are public.")
          .is_hero()
      })
      .expect("Each player's field must always contain a hero.")
      .instance(self, None)
      .expect("Heroes are always public.")
  }

  #[allow(dead_code)]
  #[track_caller]
  pub fn hand_card_with_base(&self, player: Player, base: BaseCard) -> InstanceID {
    self
      .secret(player)
      .hand()
      .iter()
      .filter_map(|id| *id)
      .find(move |c| *self.secret(player).instance(c).unwrap().base() == base)
      .or_else(|| {
        self
          .player_cards(player)
          .hand()
          .iter()
          .filter_map(|id| *id)
          .find(move |c| *c.instance(self, None).unwrap().base() == base)
      })
      .unwrap()
  }
}

#[test]
fn cycle_turns_works() {
  let turn_count: u16 = 2;
  let game = test_store().build().auto_mulligan().cycle_turns(turn_count);
  assert!(
    game.players[0].mana >= turn_count,
    "Didn't gain at least 1 mana per turn"
  );
}
