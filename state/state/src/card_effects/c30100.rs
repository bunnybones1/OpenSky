use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, _| {
      Box::pin(async move {
        for p in 0..2 {
          for _ in 0..40 {
            game.conjure(p, |_, _| true).await;
          }
          game.change_mana(p, 30).await;
          let hero = game.hero_id(p);
          game
            .modify_card_single(hero, Modifier::ModifyHealth(99, None))
            .await;
        }
      })
    },
  }
});
