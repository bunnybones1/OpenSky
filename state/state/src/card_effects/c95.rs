use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let drawn_card = game
          .draw(owner, |c, attach| {
            c.is_unit() && attach.map_or(true, |a| !a.is_spell())
          })
          .await;
        if let Some(drawn_card) = drawn_card {
          game.berf(drawn_card, 2, 2).await;
          game.give_spell(drawn_card, enchant::LEAD).await;
        }
      })
    },
  }
});
