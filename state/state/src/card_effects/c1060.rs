use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = enemy(owner);
    let delta = i8::from(game.hero(enemy).health) - i8::from(game.hero(owner).health);
    if delta > 0 {
      game.ready(my_id).await;
    }
  }))
  .into()],
  on_play: None
});
