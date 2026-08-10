use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.hero(enemy(owner)).health > game.hero(owner).health {
      let hero = game.hero_id(owner);
      game.change_health(hero, 7).await;
    }
  }))
  .into()],
  on_play: None
});
