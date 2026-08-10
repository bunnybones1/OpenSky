use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.change_max_mana(owner, 2).await;
        let hero = game.hero_id(owner);
        game
          .modify_card_single(hero, Modifier::ModifyHealth(2, None))
          .await;
      })
    },
  }
});
