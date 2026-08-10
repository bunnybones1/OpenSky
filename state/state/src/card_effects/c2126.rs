use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let highest_health = game
          .context
          .reveal_unique(
            owner,
            move |secret| {
              secret
                .deck()
                .iter()
                .filter_map(|deck_id| {
                  let card = secret
                    .instance(deck_id)
                    .expect("Deck card should be in secret.");

                  if card.is_unit() {
                    Some(card.health)
                  } else {
                    None
                  }
                })
                .max()
            },
            |_| true,
          )
          .await;
        if let Some(max_health) = highest_health {
          let drawn_card = game
            .draw(owner, move |c, _| c.is_unit() && c.health == max_health)
            .await;
          if let Some(drawn_card) = drawn_card {
            //double its health
            game
              .modify_card(
                drawn_card,
                vec![Modifier::ModifyHealth(max_health.into(), None)],
              )
              .await;
          }
        } else {
          let highest_health_in_pool = game
            .context()
            .reveal_unique(
              owner,
              move |secret| {
                BaseCard::iter()
                  .filter(|b| !secret.singleton_cards_posessed.contains(b))
                  .filter_map(move |b| {
                    let instance = b.instance();
                    if instance.is_unit() {
                      Some(instance.health)
                    } else {
                      None
                    }
                  })
                  .max()
              },
              |_| true,
            )
            .await;
          if let Some(highest_health_in_pool) = highest_health_in_pool {
            let drawn_card = game
              .draw(owner, move |c, _| c.health == highest_health_in_pool)
              .await;
            if let Some(drawn_card) = drawn_card {
              //double its health
              game
                .modify_card(
                  drawn_card,
                  vec![Modifier::ModifyHealth(highest_health_in_pool.into(), None)],
                )
                .await;
            }
          }
        }
      })
    },
  }
});

#[test]
fn test_shields_up_conjures() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let shields = game.create_card(0, BaseCard::C2126).await;
      game
        .move_to_zone(shields, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(shields, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(shields, None, 2.into())
        .await;
      game.move_to_zone(shields, Zone::Graveyard).await;
      game.resolve_triggers().await;
    })
  })
}
