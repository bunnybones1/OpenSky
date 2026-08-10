use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let targets_to_dust = game.all_units();
        game.dust_many(targets_to_dust).await;
        let my_hero = game.hero_id(owner);
        if game.hero(owner).health > 16 {
          game
            .modify_card(my_hero, vec![Modifier::SetHealth(16.into())])
            .await;
        }
      })
    },
  }
});
