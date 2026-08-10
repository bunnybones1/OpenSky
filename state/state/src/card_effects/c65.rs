use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let card = game
          .draw_low_cost(owner, (owner, Zone::Hand { public: false }), |c, _| {
            c.is_unit() && c.element == Element::Fire
          })
          .await;
        game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
        if let Some(card) = card {
          game
            .move_to_zone(my_id, Zone::Attachment { parent: card })
            .await;
        }
      })
    },
  }
});

#[test]
fn card_918_doesnt_bug_with_inspire_units() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hunt = game.create_card(0, BaseCard::C65).await;
      game.move_to_zone(hunt, Zone::Hand { public: false }).await;

      let inspire_base = BaseCard::iter()
        .find(|c| {
          c.instance()
            .get_effect_types()
            .any(|e| e == EffectType::Inspire)
        })
        .unwrap();
      game.instantiate_and_summon(0, inspire_base).await;
      game.resolve_triggers().await;

      game.move_to_zone(hunt, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(hunt, None, 0.into())
        .await;
      game.resolve_triggers().await;
    })
  })
}

#[test]
fn card_918_works() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hunt = game.create_card(0, BaseCard::C65).await;
      game.move_to_zone(hunt, Zone::Casting).await;
      let hand_len = game.player_cards(0).hand().len();
      game
        .resolve_card_effect_as_player(hunt, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert_eq!(game.player_cards(0).hand().len(), hand_len + 1);
    })
  })
}
