use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        for p in 0..=1 {
          game.change_max_mana(p, 1).await;
          game.draw_any_card(p).await;
        }
        for p in 0..=1 {
          let hero = game.hero_id(p);
          game
            .modify_card_single(hero, Modifier::ModifyHealth(3, None))
            .await;
        }
      })
    },
  }
});
