use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);

        game
          .grant_modifier_for_turns(hero, my_id, Modifier::ModifyPower(2, None), 0, 1)
          .await;
      })
    },
  }
});
