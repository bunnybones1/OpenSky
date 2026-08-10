use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let draw = game.draw(owner, |c, _| c.is_unit()).await;
        if let Some(drawn_unit) = draw {
          let copy = game.copy_card(drawn_unit, true).await;
          game.move_to_zone(copy, Zone::Hand { public: false }).await;
        }
      })
    },
  }
});
