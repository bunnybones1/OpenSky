use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        // We reveal the drawn card, since it's de-facto revealed
        // by summoning a copy.
        let drawn_card = game.draw(owner, |c, _| c.is_spell()).await;
        if let Some(drawn_card) = drawn_card {
          let copy = game.copy_card(drawn_card, true).await;
          game.move_to_zone(copy, Zone::Hand { public: false }).await;
        }
      })
    },
  }
});
