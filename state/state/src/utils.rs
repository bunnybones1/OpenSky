use crate::game::SkyWeaver;
use crate::live_game::LiveGame;
use card_movement_simulator::{GameState, InstanceID, Player, PlayerSecret};
use std::{future::Future, pin::Pin};

pub fn enemy(player: Player) -> Player {
  match player {
    0 => 1,
    1 => 0,
    x => panic!("Expected player 0 or 1, got {}", x),
  }
}

pub type Promisify<'a, T> = Pin<Box<dyn Future<Output = T> + 'a>>;

// This is required because Rust doesn't have existential types yet.
// See here: https://play.rust-lang.org/?version=beta&mode=debug&edition=2018&gist=48181916aeb17c59e19c416566c32838
pub fn future_helper_0<F, T>(f: F) -> F
where
  F: for<'a> FnOnce(
    &'a mut LiveGame,
    T,
  ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + 'a>>,
{
  f
}

pub fn future_helper_1<T, U, F>(f: F) -> F
where
  F: for<'a> FnOnce(
    &'a mut LiveGame,
    T,
    U,
  ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + 'a>>,
{
  f
}

pub fn future_helper_2<T, U, V, F>(f: F) -> F
where
  F: for<'a> FnOnce(
    &'a mut LiveGame,
    T,
    U,
    V,
  ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + 'a>>,
{
  f
}

// This is required because Rust doesn't have existential types yet.
// See here: https://play.rust-lang.org/?version=beta&mode=debug&edition=2018&gist=48181916aeb17c59e19c416566c32838
pub fn xcost_helper<F, T>(f: F) -> F
where
  F: for<'a> FnOnce(
    &'a mut LiveGame,
    InstanceID,
  ) -> std::pin::Pin<Box<dyn std::future::Future<Output = T> + 'a>>,
{
  f
}

pub fn public_xcost_helper<F, T>(f: F) -> F
where
  F: FnOnce(&GameState<SkyWeaver>, InstanceID) -> T,
{
  f
}

pub fn secret_xcost_helper<F, T>(f: F) -> F
where
  F: (for<'a> FnOnce(&'a GameState<SkyWeaver>, &'a PlayerSecret<SkyWeaver>, InstanceID) -> T),
{
  f
}

pub trait FirstLast: Iterator {
  /// Depending on array length:
  ///
  /// 0: []
  ///
  /// 1: [1st, 1st]
  ///
  /// 2+: [1st, last]
  fn first_last(
    &mut self,
  ) -> std::iter::Chain<std::option::IntoIter<Self::Item>, std::option::IntoIter<Self::Item>>;
}

impl<I: Iterator<Item = T>, T: Clone> FirstLast for I {
  fn first_last(
    &mut self,
  ) -> std::iter::Chain<std::option::IntoIter<Self::Item>, std::option::IntoIter<Self::Item>> {
    let mut it = self.peekable();
    let first = it.next();
    first.clone().into_iter().chain(if it.peek().is_some() {
      it.last()
    } else {
      first
    })
  }
}

#[test]
fn first_last() {
  let len_0: Vec<&str> = vec![];
  let len_1 = ["test"];
  let len_2 = ["test", "toast"];

  assert_eq!(
    len_0.iter().first_last().cloned().collect::<Vec<_>>(),
    Vec::<&str>::new()
  );
  assert_eq!(
    len_1.iter().first_last().cloned().collect::<Vec<_>>(),
    vec!["test", "test"]
  );
  assert_eq!(
    len_2.iter().first_last().cloned().collect::<Vec<_>>(),
    vec!["test", "toast"]
  );
}
