use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero_power = game.hero(owner).power;
    game.change_power(my_id, hero_power.into()).await;
  }))
  .into()],
  on_play: None
});
