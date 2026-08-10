use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    if !game.player(owner).this_turn_stats.hero_attacked {
      let hero = game.hero_id(owner);
      game
        .grant_modifier_for_turns(hero, my_id, Modifier::GrantTrait(Trait::Lifesteal), 0, 3)
        .await;
      game
        .grant_modifier_for_turns(hero, my_id, Modifier::GrantTrait(Trait::Armor), 0, 3)
        .await;
    }
  }))
  .into()],
  on_play: None
});
