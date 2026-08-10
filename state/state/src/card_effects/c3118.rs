use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let an_ally_died_this_turn = !game.player(owner).this_turn_stats.allies_died.is_empty();
        if an_ally_died_this_turn {
          let card = game.create_card(owner, BaseCard::C4034).await;
          game.move_to_zone(card, Zone::Hand { public: true }).await;
        }
        game
          .give_hand_cards(
            owner,
            |c| c.is_unit(),
            vec![
              Modifier::ModifyHealth(1, None),
              Modifier::ModifyPower(1, None),
            ],
            my_id,
          )
          .await;
        game
          .give_hand_cards(
            owner,
            |_| true,
            vec![Modifier::GrantTrait(Trait::Wither)],
            my_id,
          )
          .await;
      })
    },
  }
});
