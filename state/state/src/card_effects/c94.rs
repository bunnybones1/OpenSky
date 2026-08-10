use super::effect_helpers::*;

fn card_filter(card: &CardInstance<SkyWeaver>) -> bool {
  card.is_unit()
}

#[derive(Debug)]
enum Direction {
  Left,
  Right,
}
use Direction::{Left, Right};

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let my_rarity = game.reveal_from_card(my_id, |c| c.rarity).await;

    for direction in &[Left, Right] {
      let public_unit_idxes = game
        .player_cards(owner)
        .hand()
        .iter()
        .enumerate()
        .filter(|(_, card)| match card {
          Some(id) => card_filter(id.instance(game, None).unwrap()),
          _ => false,
        })
        .map(|(i, _)| i)
        .collect_vec();

      let hand_cards = game.hand_cards(owner);
      let hand_size = hand_cards.len();
      //leftmost and rightmost
      let indexes_in_direction = match direction {
        Left => (0..public_unit_idxes.iter().min().copied().unwrap_or(hand_size)).collect_vec(),
        Right => (public_unit_idxes.iter().max().map(|x| x + 1).unwrap_or(0)..hand_size)
          .rev()
          .collect_vec(),
      };
      let secret_cards_in_direction = indexes_in_direction
        .iter()
        .map(|idx| game.hand_cards(owner)[*idx])
        .collect_vec();

      let has_one = game
        .reveal_if_any(secret_cards_in_direction.iter().map_into().collect(), |c| {
          card_filter(&c)
        })
        .await;

      if has_one {
        game
          .new_secret_cards_with_fakes(owner, |mut secret| {
            let mut done = false;
            for i in indexes_in_direction.iter() {
              let id = secret.hand()[*i];
              let card = id.map(|id| secret.instance(id).unwrap());

              if !done && card.is_some() && card_filter(card.unwrap()) {
                let spell = secret.create_card(enchant::FATE, Some(my_rarity));
                secret.attach_card(id.unwrap(), spell).unwrap();
                done = true
              } else {
                secret.new_fake_card();
              }
            }
          })
          .await;
      } else if let Some(idx) = match direction {
        Left => public_unit_idxes.iter().min(),
        Right => public_unit_idxes.iter().max(),
      } {
        let id = game.hand_cards(owner)[*idx];
        game.give_spell(id, enchant::FATE).await;
      }
    }
  }))
  .into()],
  on_play: None
});

#[test]
fn test_earwig() -> Result<(), String> {
  let blank_unit = BaseCard::iter()
    .find(|c| {
      c.instance().is_unit() && c.attached_spell().is_none() && c.intrinsic_effect().is_none()
    })
    .unwrap();
  let spell = BaseCard::iter().find(|c| c.instance().is_spell()).unwrap();
  #[derive(Debug)]
  enum Public {
    All,
    Some,
    None,
  }
  for public in &[Public::All, Public::Some, Public::None] {
    for unit_indexes in [
      vec![0usize, 3],
      vec![1, 3],
      vec![1, 2],
      vec![1, 2, 3],
      vec![1, 3, 4],
    ] {
      run_test(move |mut game| {
        game.context.enable_logs(false);
        let unit_indexes = unit_indexes.clone();
        Box::pin(async move {
          game.dust_hand(0).await;
          assert!(game.hand_cards(0).is_empty());
          for i in 0..5usize {
            let is_unit = unit_indexes.contains(&i);
            let card = if is_unit {
              game.create_card(0, blank_unit).await
            } else {
              game.create_card(0, spell).await
            };
            game
              .move_to_zone(
                card,
                Zone::Hand {
                  public: match public {
                    Public::All => true,
                    Public::Some => i % 2 == 0,
                    Public::None => false,
                  },
                },
              )
              .await;
          }
          game.resolve_triggers().await;

          let earwig = game.instantiate_and_summon(0, BaseCard::C94).await.unwrap();
          game.kill(earwig).await;
          game.resolve_triggers().await;

          let first_last = unit_indexes.iter().first_last().copied();
          for card in first_last.clone() {
            let card_shoulda_been_modified = game.hand_cards(0)[card];
            assert_eq!(
              game
                .reveal_from_card(card_shoulda_been_modified, |c| c
                  .attachment
                  .map(|c| *c.base()))
                .await,
              Some(enchant::FATE),
              "unit {:?} has wrong attachment for expected earwig-affected unit {:?}.\nHand is {:?}",
              card,
              first_last.collect_vec(),
              game.player_cards(0).hand()
            );
          }
        })
      })?
    }
  }
  Ok(())
}
