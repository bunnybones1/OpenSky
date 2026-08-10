use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let num_ally_elements: SaturatingU8 = game
      .units::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .map(|c| c.element)
      .unique()
      .count()
      .into();
    let hero = game.hero_id(owner);
    game.change_health(hero, num_ally_elements.into()).await;
  }))
  .into()],
  on_play: None
});
