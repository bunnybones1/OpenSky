use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game
          .modify_card(hero, vec![Modifier::GrantTrait(Trait::Banner)])
          .await;
        game.damage(hero, 2, my_id).await;
      })
    },
  }
});
