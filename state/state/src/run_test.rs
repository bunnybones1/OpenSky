use crate::{game::*, library::BaseCard, live_game::*, model::*, player_action::*};
use card_movement_simulator::{
  arcadeum::store::{State, StoreState},
  Context, GameState, InstanceID, Player, PlayerSecret,
};
use itertools::Itertools;
use lazy_static::lazy_static;
use rand_core::SeedableRng;
use std::{
  future::Future,
  ops::{Deref, DerefMut},
  pin::Pin,
};

lazy_static! {
  static ref DEFAULT_PARAMS: GameParams = GameParams {
    fill_decks_to_prism_size: false,
    skip_mulligan: true,
    ..Default::default()
  };
}

pub fn run_test_with_params<F>(mut game_params: GameParams, test: F) -> Result<(), String>
where
  for<'a> F: Fn(TestGame<'a>) -> Pin<Box<dyn Future<Output = ()> + 'a>> + Clone + 'static,
{
  if game_params.skip_mulligan {
    game_params.player_params[0].mulligan_choice_size = 0;
    game_params.player_params[1].mulligan_choice_size = 0;
  }
  let colors = ["[0;91m", "[0;92m", "[0;93m", "[0;94m", "[0;95m", "[0;96m"];

  let seed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  let (state, [secret1, secret2]) = Test::new(test, game_params)?;
  let secrets = [
    Some((secret1, rand_xorshift::XorShiftRng::from_seed(seed))),
    Some((secret2, rand_xorshift::XorShiftRng::from_seed(seed))),
  ];

  let mut state = StoreState::new(state, secrets, {
    let mut log_indentation_level: usize = 0;

    move |_, event| {
      let log_msg = format!("{:#?}", event);

      if log_msg.contains("Exit") {
        log_indentation_level -= 1;
      }

      for event in log_msg.split('\n') {
        println!(
          "{spaces} {event}\x1B[0;39m",
          spaces = (0..=log_indentation_level).fold("".to_string(), |s, level| s
            + &format!("\x1B{} |", colors[level % colors.len()])),
          event = event
        );
      }

      if log_msg.contains("Enter") {
        log_indentation_level += 1;
      }
    }
  });

  let total_count = state.reveal_count();
  state.apply_with_random(None, (), &mut rand_xorshift::XorShiftRng::from_seed(seed))?;
  let total_count = state.reveal_count() - total_count;
  eprintln!("total commit reveal reply reveal count: {}", total_count);

  Ok(())
}

pub fn run_test<F>(test: F) -> Result<(), String>
where
  for<'a> F: Fn(TestGame<'a>) -> Pin<Box<dyn Future<Output = ()> + 'a>> + Clone + 'static,
{
  run_test_with_params(DEFAULT_PARAMS.clone(), test)
}

pub struct TestGame<'a>(LiveGame<'a>);

impl<'a> Deref for TestGame<'a> {
  type Target = LiveGame<'a>;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl<'a> DerefMut for TestGame<'a> {
  fn deref_mut(&mut self) -> &mut Self::Target {
    &mut self.0
  }
}

impl<'a> From<LiveGame<'a>> for TestGame<'a> {
  fn from(game: LiveGame<'a>) -> Self {
    Self(game)
  }
}

impl<'a> TestGame<'a> {
  pub fn fake_unit(&mut self) -> Pin<Box<dyn Future<Output = InstanceID> + '_>> {
    Box::pin(async move { self.create_card(0, BaseCard::Dummy).await })
  }

  pub fn fake_spell(&mut self) -> Pin<Box<dyn Future<Output = InstanceID> + '_>> {
    Box::pin(async move {
      let card = self.create_card(0, BaseCard::Dummy).await;

      self
        .game
        .modify_card(card, |mut card| {
          card.mutate(|c| c.r#type = Type::Spell, InstanceID::from_raw(0))
        })
        .await;

      card
    })
  }
  pub fn dust_hand(&mut self, player: Player) -> Pin<Box<dyn Future<Output = ()> + '_>> {
    Box::pin(async move {
      let hand_cards = self.hand_cards(player);
      self.dust_many(hand_cards).await;
      assert!(self.player_cards(player).hand().is_empty());
    })
  }
}

#[derive(Clone)]
struct Test<F>
where
  for<'a> F: Fn(TestGame<'a>) -> Pin<Box<dyn Future<Output = ()> + 'a>> + Clone + 'static,
{
  state: GameState<SkyWeaver>,
  test: Option<F>,
}

impl<F> Test<F>
where
  for<'a> F: Fn(TestGame<'a>) -> Pin<Box<dyn Future<Output = ()> + 'a>> + Clone + 'static,
{
  fn new(test: F, game_params: GameParams) -> Result<(Self, [PlayerSecret<SkyWeaver>; 2]), String> {
    let seed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    let secrets = [
      Some((
        PlayerSecret::new(0, Default::default()),
        rand_xorshift::XorShiftRng::from_seed(seed),
      )),
      Some((
        PlayerSecret::new(1, Default::default()),
        rand_xorshift::XorShiftRng::from_seed(seed),
      )),
    ];

    let mut state = StoreState::new(
      GameState::new(
        SkyWeaver::new(
          game_params.clone(),
          PlayerSeed {
            prisms: vec![Prism::Heart],
            hero_ability: None,
          },
          PlayerSeed {
            prisms: vec![Prism::Heart],
            hero_ability: None,
          },
        ),
        true,
      ),
      secrets,
      |_, _| (),
    );

    state.apply_with_random(
      None,
      PlayerAction::Setup,
      &mut rand_xorshift::XorShiftRng::from_seed(seed),
    )?;

    if !game_params.clone().skip_mulligan {
      for p in 0..=1 {
        state.apply_with_random(
          Some(p),
          PlayerAction::CommitCardSelection {
            card_indices: (0..game_params.player_params[p as usize].mulligan_choice_size as usize)
              .collect_vec(),
          },
          &mut rand_xorshift::XorShiftRng::from_seed(seed),
        )?;
      }
    }

    let secrets = [
      state.secret(0).unwrap().deref().deref().clone(),
      state.secret(1).unwrap().deref().deref().clone(),
    ];

    Ok((
      Self {
        state: state.state().unwrap().clone(),
        test: Some(test),
      },
      secrets,
    ))
  }
}

impl<F> State for Test<F>
where
  for<'a> F: Fn(TestGame<'a>) -> Pin<Box<dyn Future<Output = ()> + 'a>> + Clone + 'static,
{
  type ID = <GameState<SkyWeaver> as State>::ID;
  type Nonce = <GameState<SkyWeaver> as State>::Nonce;
  type Action = ();
  type Event = <GameState<SkyWeaver> as State>::Event;
  type Secret = <GameState<SkyWeaver> as State>::Secret;

  fn version() -> &'static [u8] {
    unimplemented!();
  }

  fn deserialize(_data: &[u8]) -> Result<Self, String> {
    Err("not serializable".to_string())
  }

  fn is_serializable(&self) -> bool {
    false
  }

  fn serialize(&self) -> Option<Vec<u8>> {
    None
  }

  fn verify(&self, _player: Option<Player>, _action: &Self::Action) -> Result<(), String> {
    match self.test {
      Some(_) => Ok(()),
      None => Err("test complete".to_string()),
    }
  }

  fn apply(
    self,
    _player: Option<Player>,
    _action: &Self::Action,
    context: Context<SkyWeaver>,
  ) -> Pin<Box<dyn Future<Output = (Self, Context<SkyWeaver>)>>> {
    Box::pin(async {
      let Self { state, test } = self;
      let test = test.unwrap();

      let mut card_game = card_movement_simulator::CardGame::new(state, context);

      let mut live_game = LiveGame {
        game: &mut card_game,
        queue: Vec::new(),
        phase_count: 0,
        card_execution_context: vec![InstanceID::from_raw(0)],
      };

      live_game.game.context.enable_logs(false);
      live_game.run(crate::phase::PhaseStartTurn(0)).await;
      live_game.game.context.enable_logs(true);
      test(live_game.into()).await;

      let card_movement_simulator::CardGame { state, context } = card_game;

      (Self { state, test: None }, context)
    })
  }
}
